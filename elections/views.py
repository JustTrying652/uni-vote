from rest_framework import generics, status, permissions
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
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    AuditLog.objects.create(user=user, action=action, detail=detail, ip_address=ip)


class MyApplicationsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        position_ids = Candidate.objects.filter(
            user=request.user
        ).values_list('position_id', flat=True)
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
        return Election.objects.filter(status__in=['open', 'closed', 'results']).order_by('-created_at')


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
            'open': ('draft', 'open', 'election_opened'),
            'close': ('open', 'closed', 'election_closed'),
            'publish': ('closed', 'results', 'results_published'),
        }

        if action not in transitions:
            return Response({'error': 'Invalid action. Use open, close, or publish.'}, status=400)

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