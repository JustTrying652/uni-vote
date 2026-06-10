from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User
from .serializers import RegisterSerializer, UserProfileSerializer, ChangePasswordSerializer
from elections.permissions import IsAdmin

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'registration_number'

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserProfileSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Account created successfully. Await admin verification.',
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})
    
class UserListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (IsAdmin,)
    queryset = User.objects.all().order_by('-date_joined')

class UserVerifyView(APIView):
    permission_classes = (IsAdmin,)

    def patch(self, request, pk):
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=pk)
        user.is_verified = request.data.get('is_verified', user.is_verified)
        user.save()
        return Response(UserProfileSerializer(user).data)