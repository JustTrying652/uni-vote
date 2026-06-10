from rest_framework import serializers
from django.utils import timezone
from .models import Election, Position, Candidate, Vote, AuditLog
from accounts.serializers import UserProfileSerializer


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ('id', 'title', 'description', 'max_votes', 'order')


class CandidateSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = ('id', 'user', 'position', 'manifesto', 'photo', 'status', 'applied_at', 'vote_count')
        read_only_fields = ('status', 'applied_at')

    def get_vote_count(self, obj):
        # Only expose vote count if election results are published
        election = obj.position.election
        if election.status == 'results':
            return obj.votes_received.count()
        return None


class CandidateApplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ('position', 'manifesto', 'photo')

    def validate_position(self, position):
        user = self.context['request'].user
        election = position.election

        if election.status not in ('draft', 'open'):
            raise serializers.ValidationError('Applications are closed for this election.')

        if Candidate.objects.filter(position=position, user=user).exists():
            raise serializers.ValidationError('You have already applied for this position.')

        return position

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ElectionSerializer(serializers.ModelSerializer):
    positions = PositionSerializer(many=True, read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    total_voters = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = (
            'id', 'title', 'description', 'academic_year', 'status',
            'start_time', 'end_time', 'is_active', 'positions',
            'created_by', 'total_voters', 'created_at'
        )
        read_only_fields = ('status', 'created_by', 'created_at')

    def get_total_voters(self, obj):
        # Count unique voters across all positions in this election
        return Vote.objects.filter(position__election=obj).values('voter').distinct().count()


class ElectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = ('title', 'description', 'academic_year', 'start_time', 'end_time')

    def validate(self, attrs):
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError('End time must be after start time.')
        if attrs['start_time'] < timezone.now():
            raise serializers.ValidationError('Start time cannot be in the past.')
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ('position', 'candidate')

    def validate(self, attrs):
        user = self.context['request'].user
        position = attrs['position']
        candidate = attrs['candidate']
        election = position.election

        # Election must be open and active
        if not election.is_active:
            raise serializers.ValidationError('This election is not currently active.')

        # Voter must be verified
        if not user.is_verified:
            raise serializers.ValidationError('Your account must be verified before voting.')

        # Candidate must belong to this position and be approved
        if candidate.position != position:
            raise serializers.ValidationError('Candidate does not belong to this position.')
        if candidate.status != 'approved':
            raise serializers.ValidationError('This candidate has not been approved.')

        # One vote per position
        if Vote.objects.filter(voter=user, position=position).exists():
            raise serializers.ValidationError('You have already voted for this position.')

        return attrs

    def create(self, validated_data):
        validated_data['voter'] = self.context['request'].user
        return super().create(validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'action', 'detail', 'ip_address', 'timestamp')