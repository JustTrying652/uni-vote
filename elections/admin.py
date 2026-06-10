from django.contrib import admin
from .models import Election, Position, Candidate, Vote, AuditLog


class PositionInline(admin.TabularInline):
    model = Position
    extra = 1


class CandidateInline(admin.TabularInline):
    model = Candidate
    extra = 0
    readonly_fields = ('applied_at',)


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'academic_year', 'status', 'start_time', 'end_time', 'is_active')
    list_filter = ('status', 'academic_year')
    search_fields = ('title',)
    inlines = [PositionInline]


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ('title', 'election', 'max_votes', 'order')
    list_filter = ('election',)
    inlines = [CandidateInline]


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('user', 'position', 'status', 'applied_at')
    list_filter = ('status', 'position__election')
    search_fields = ('user__first_name', 'user__last_name', 'user__registration_number')
    actions = ['approve_candidates', 'reject_candidates']

    def approve_candidates(self, request, queryset):
        queryset.update(status='approved', approved_by=request.user)
    approve_candidates.short_description = 'Approve selected candidates'

    def reject_candidates(self, request, queryset):
        queryset.update(status='rejected')
    reject_candidates.short_description = 'Reject selected candidates'


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('voter', 'position', 'candidate', 'timestamp')
    list_filter = ('position__election',)
    readonly_fields = ('voter', 'position', 'candidate', 'timestamp')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'ip_address', 'timestamp')
    list_filter = ('action',)
    readonly_fields = ('user', 'action', 'detail', 'ip_address', 'timestamp')