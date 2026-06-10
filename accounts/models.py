from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, registration_number, email, password=None, **extra_fields):
        if not registration_number:
            raise ValueError('Registration number is required')
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(registration_number=registration_number, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, registration_number, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(registration_number, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('voter', 'Voter'),
        ('candidate', 'Candidate'),
    )

    FACULTY_CHOICES = (
        ('engineering', 'Engineering'),
        ('business', 'Business'),
        ('science', 'Science'),
        ('arts', 'Arts & Humanities'),
        ('health', 'Health Sciences'),
        ('ict', 'ICT'),
    )

    registration_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='voter')
    faculty = models.CharField(max_length=50, choices=FACULTY_CHOICES)
    course = models.CharField(max_length=100)
    year_of_study = models.PositiveIntegerField(default=1)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'registration_number'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.registration_number})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"