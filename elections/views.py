from rest_framework import generics, status, permissions, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Election, Position, Candidate, Vote, AuditLog
from .serializers import (
    ElectionSerializer, ElectionCreateSerializer,
    CandidateSerializer, CandidateApplySerializer,
    VoteSerializer, AuditLogSerializer, PositionSerializer
)
from .permissions import IsAdmin, IsVerifiedVoter


def log_action(user, action, detail='', request=None):
    ip = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take only the first IP from the chain
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(user=user, action=action, detail=detail, ip_address=ip)

class MyApplicationsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        election_id = request.query_params.get('election_id')
        qs = Candidate.objects.filter(user=request.user)
        if election_id:
            qs = qs.filter(position__election_id=election_id)
        position_ids = qs.values_list('position_id', flat=True)
        return Response({'position_ids': list(position_ids)})
# --- Election Views ---

class ElectionListView(generics.ListAPIView):
    serializer_class = ElectionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Voters only see open/results elections; admins see all
        user = self.request.user
        if user.role == 'admin':
            return Election.objects.all().order_by('-created_at')
        return Election.objects.filter(status__in=['applications_open', 'applications_closed', 'voting_open', 'voting_closed', 'results']).order_by('-created_at')


class ElectionDetailView(generics.RetrieveAPIView):
    serializer_class = ElectionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    queryset = Election.objects.all()


class ElectionCreateView(generics.CreateAPIView):
    serializer_class = ElectionCreateSerializer
    permission_classes = (IsAdmin,)

    def perform_create(self, serializer):
        election = serializer.save()
        log_action(self.request.user, 'election_created', f'Election: {election.title}', self.request)


class ElectionStatusView(APIView):
    """Admin can open, close, or publish results for an election."""
    permission_classes = (IsAdmin,)

    def post(self, request, pk):
        election = get_object_or_404(Election, pk=pk)
        action = request.data.get('action')

        transitions = {
           'open_applications':   ('draft',                'applications_open',    'applications_opened'),
           'close_applications':  ('applications_open',    'applications_closed',  'applications_closed'),
           'open_voting':         ('applications_closed',  'voting_open',          'voting_opened'),
           'close_voting':        ('voting_open',          'voting_closed',        'voting_closed'),
           'publish':             ('voting_closed',        'results',              'results_published'),
        } 

        if action not in transitions:
            return Response({'error': 'Invalid action. Use open_applications, close_applications, open_voting, close_voting, or publish.'}, status=400)

        required_status, new_status, log_action_name = transitions[action]

        if election.status != required_status:
            return Response(
                {'error': f'Election must be in "{required_status}" status to perform this action.'},
                status=400
            )

        election.status = new_status
        election.save()
        log_action(request.user, log_action_name, f'Election: {election.title}', request)

        return Response({'message': f'Election {new_status} successfully.', 'status': new_status})


# --- Position Views ---

class PositionCreateView(generics.CreateAPIView):
    serializer_class = PositionSerializer
    permission_classes = (IsAdmin,)

    def perform_create(self, serializer):
        election = get_object_or_404(Election, pk=self.kwargs['election_pk'])
        serializer.save(election=election)


# --- Candidate Views ---

class CandidateListView(generics.ListAPIView):
    serializer_class = CandidateSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        position_id = self.kwargs.get('position_pk')
        user = self.request.user
        qs = Candidate.objects.filter(position_id=position_id)
        if user.role != 'admin':
            qs = qs.filter(status='approved')
        return qs


class CandidateApplyView(generics.CreateAPIView):
    serializer_class = CandidateApplySerializer
    permission_classes = (IsVerifiedVoter,)
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def perform_create(self, serializer):
        serializer.save()

class CandidateApprovalView(APIView):
    """Admin approves or rejects a candidate."""
    permission_classes = (IsAdmin,)

    def post(self, request, pk):
        candidate = get_object_or_404(Candidate, pk=pk)
        action = request.data.get('action')

        if action not in ('approve', 'reject'):
            return Response({'error': 'Action must be approve or reject.'}, status=400)

        candidate.status = 'approved' if action == 'approve' else 'rejected'
        candidate.approved_by = request.user
        candidate.save()

        log_action_name = 'candidate_approved' if action == 'approve' else 'candidate_rejected'
        log_action(request.user, log_action_name, f'Candidate: {candidate.user.full_name}', request)

        return Response({'message': f'Candidate {candidate.status} successfully.'})


# --- Voting ---

class CastVoteView(APIView):
    permission_classes = (IsVerifiedVoter,)

    @transaction.atomic
    def post(self, request):
        serializer = VoteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        vote = serializer.save()

        log_action(
            request.user, 'vote_cast',
            f'Position: {vote.position.title} in {vote.position.election.title}',
            request
        )

        return Response({'message': 'Vote cast successfully.'}, status=status.HTTP_201_CREATED)


class MyVotesView(APIView):
    """Returns which positions the current user has already voted for."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        voted_positions = Vote.objects.filter(voter=request.user).values_list('position_id', flat=True)
        return Response({'voted_position_ids': list(voted_positions)})


# --- Results ---

class ElectionResultsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, pk):
        election = get_object_or_404(Election, pk=pk)

        if election.status != 'results' and request.user.role != 'admin':
            return Response({'error': 'Results are not yet published.'}, status=403)

        results = []
        for position in election.positions.all():
            candidates = Candidate.objects.filter(position=position, status='approved')
            position_result = {
                'position': position.title,
                'total_votes': Vote.objects.filter(position=position).count(),
                'candidates': [
                    {
                        'name': c.user.full_name,
                        'registration_number': c.user.registration_number,
                        'photo': request.build_absolute_uri(c.photo.url) if c.photo else None,
                        'votes': c.votes_received.count(),
                    }
                    for c in candidates.order_by('-votes_received__candidate')
                ]
            }
            results.append(position_result)

        return Response({
            'election': election.title,
            'status': election.status,
            'results': results
        })


# --- Audit Log ---

class AuditLogView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = (IsAdmin,)
    queryset = AuditLog.objects.all()


class ElectionDeleteView(APIView):
    permission_classes = (IsAdmin,)

    def delete(self, request, pk):
        election = get_object_or_404(Election, pk=pk)
        if election.status not in ('draft', 'applications_open', 'applications_closed'):
            return Response(
                {'error': 'Election can only be deleted before voting starts'},
                status=400
            )
        title = election.title
        election.delete()
        log_action(request.user, 'election_created', f'Deleted election: {title}', request)
        return Response({'message': 'Election deleted successfully.'}, status=204)


class PositionDeleteView(APIView):
    permission_classes = (IsAdmin,)

    def delete(self, request, pk):
        from django.shortcuts import get_object_or_404
        position = get_object_or_404(Position, pk=pk)
        if position.election.status not in ('draft', 'applications_open'):
            return Response(
                {'error': 'Positions can only be deleted before applications close.'},
                status=400
            )
        if position.candidates.exists():
            return Response(
                {'error': 'Cannot delete a position that already has candidates.'},
                status=400
            )
        position.delete()
        return Response({'message': 'Position deleted successfully.'}, status=204)

class ElectionUpdateView(generics.UpdateAPIView):
    permission_classes = (IsAdmin,)
    queryset = Election.objects.all()

    def get_serializer_class(self):
        return ElectionCreateSerializer

    def update(self, request, *args, **kwargs):
        election = self.get_object()
        if election.status not in ('draft', 'applications_open'):
            return Response(
                {'error': 'Only draft or applications-open elections can be edited.'},
                status=400
            )
        serializer = self.get_serializer(election, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ElectionSerializer(election, context={'request': request}).data)

class ElectionTurnoutView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request, pk):
        election = get_object_or_404(Election, pk=pk)

        # Get all voters who voted in this election
        voter_ids = Vote.objects.filter(
            position__election=election
        ).values_list('voter_id', flat=True).distinct()

        from accounts.models import User

        voters = User.objects.filter(id__in=voter_ids)
        total_registered = User.objects.filter(role='voter', is_verified=True).count()

        # Breakdown by faculty
        from django.db.models import Count
        faculty_breakdown = (
            voters.values('faculty')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Breakdown by year of study
        year_breakdown = (
            voters.values('year_of_study')
            .annotate(count=Count('id'))
            .order_by('year_of_study')
        )

        return Response({
            'election': election.title,
            'total_voters': voter_ids.count(),
            'total_registered': total_registered,
            'turnout_percentage': round((voter_ids.count() / total_registered * 100), 1) if total_registered > 0 else 0,
            'faculty_breakdown': list(faculty_breakdown),
            'year_breakdown': list(year_breakdown),
        })