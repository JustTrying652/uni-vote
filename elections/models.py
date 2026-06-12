from django.db import models
from django.utils import timezone
from accounts.models import User


class Election(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('applications_open', 'Applications Open'),
        ('applications_closed', 'Applications Closed'),
        ('voting_open', 'Voting Open'),
        ('voting_closed', 'Voting Closed'),
        ('results', 'Results Published'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='elections_created')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.academic_year})"

    @property
    def is_active(self):
        now = timezone.now()
        return self.status == 'voting_open' and self.end_time >= now

    @property
    def applications_active(self):
        return self.status == 'applications_open'

class Position(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='positions')
    title = models.CharField(max_length=100)  # e.g. Guild President
    description = models.TextField(blank=True)
    max_votes = models.PositiveIntegerField(default=1)  # how many candidates a voter can pick
    order = models.PositiveIntegerField(default=0)  # display order on ballot

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} — {self.election.title}"


class Candidate(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    position = models.ForeignKey(Position, on_delete=models.CASCADE, related_name='candidates')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidacies')
    manifesto = models.TextField()
    photo = models.ImageField(upload_to='candidates/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='candidates_approved'
    )

    class Meta:
        unique_together = ('position', 'user')  # one candidacy per position per user

    def __str__(self):
        return f"{self.user.full_name} for {self.position.title}"


class Vote(models.Model):
    voter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes_cast')
    position = models.ForeignKey(Position, on_delete=models.CASCADE, related_name='votes')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='votes_received')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('voter', 'position')  # one vote per position per voter

    def __str__(self):
        return f"Vote by {self.voter.registration_number} for {self.position.title}"


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('vote_cast', 'Vote Cast'),
        ('election_created', 'Election Created'),
        ('applications_opened', 'Applications Opened'),
        ('applications_closed', 'Applications Closed'),
        ('voting_opened', 'Voting Opened'),
        ('voting_closed', 'Voting Closed'),
        ('candidate_approved', 'Candidate Approved'),
        ('candidate_rejected', 'Candidate Rejected'),
        ('results_published', 'Results Published'),
    )

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    detail = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"