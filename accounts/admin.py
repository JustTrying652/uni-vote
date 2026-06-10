from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('registration_number', 'email', 'full_name', 'role', 'faculty', 'is_verified')
    list_filter = ('role', 'faculty', 'is_verified', 'is_active')
    search_fields = ('registration_number', 'email', 'first_name', 'last_name')
    ordering = ('registration_number',)

    fieldsets = (
        (None, {'fields': ('registration_number', 'email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'profile_photo')}),
        ('Academic Info', {'fields': ('faculty', 'course', 'year_of_study')}),
        ('Permissions', {'fields': ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('registration_number', 'email', 'first_name', 'last_name', 'faculty', 'course', 'year_of_study', 'role', 'password1', 'password2'),
        }),
    )