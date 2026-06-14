from django.urls import path
from .views import (
    ElectionListView, ElectionDetailView, ElectionCreateView, ElectionStatusView,
    PositionCreateView,
    CandidateListView, CandidateApplyView, CandidateApprovalView,
    CastVoteView, MyVotesView,
    ElectionResultsView,
    AuditLogView, MyApplicationsView, ElectionDeleteView, PositionDeleteView
)

urlpatterns = [
    path('my-applications/', MyApplicationsView.as_view(), name='my_applications'),
    # Elections
    path('', ElectionListView.as_view(), name='election_list'),
    path('create/', ElectionCreateView.as_view(), name='election_create'),
    path('<int:pk>/', ElectionDetailView.as_view(), name='election_detail'),
    path('<int:pk>/status/', ElectionStatusView.as_view(), name='election_status'),
    path('<int:pk>/results/', ElectionResultsView.as_view(), name='election_results'),

    # Positions
    path('<int:election_pk>/positions/', PositionCreateView.as_view(), name='position_create'),

    # Candidates
    path('positions/<int:position_pk>/candidates/', CandidateListView.as_view(), name='candidate_list'),
    path('candidates/apply/', CandidateApplyView.as_view(), name='candidate_apply'),
    path('candidates/<int:pk>/approval/', CandidateApprovalView.as_view(), name='candidate_approval'),

    # Voting
    path('vote/', CastVoteView.as_view(), name='cast_vote'),
    path('my-votes/', MyVotesView.as_view(), name='my_votes'),

    # Audit
    path('audit/', AuditLogView.as_view(), name='audit_log'),
    path('<int:pk>/delete/', ElectionDeleteView.as_view(), name='election_delete'),
    path('positions/<int:pk>/delete/', PositionDeleteView.as_view(), name='position_delete'),
]