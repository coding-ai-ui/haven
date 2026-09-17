from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.conf import settings
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import User
from .serializers import UserSerializer, ProfileSerializer


class SessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "user": (
                    UserSerializer(request.user).data
                    if request.user.is_authenticated
                    else None
                ),
                "csrfToken": get_token(request),
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class AuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, action):
        data = request.data
        if action == "register":
            email = str(data.get("email", "")).strip().lower()
            try:
                validate_email(email)
            except DjangoValidationError:
                raise ValidationError("Enter a valid email address.")
            if data.get("accept_terms") is not True:
                raise ValidationError(
                    "Accept the Terms & Conditions and Privacy Policy to continue."
                )
            if (
                not str(data.get("first_name", "")).strip()
                or not str(data.get("last_name", "")).strip()
            ):
                raise ValidationError("Enter your first and last name.")
            if len(data.get("phone", "")) < 6 or len(data.get("phone", "")) > 32:
                raise ValidationError("Enter a valid phone number.")
            if User.objects.filter(email__iexact=email).exists():
                raise ValidationError("An account with this email already exists.")
            if data.get("password") != data.get("confirm_password"):
                raise ValidationError("Passwords do not match.")
            user = User(
                username=email,
                email=email,
                first_name=str(data["first_name"])[:150],
                last_name=str(data["last_name"])[:150],
            )
            try:
                validate_password(data.get("password", ""), user)
            except DjangoValidationError as e:
                raise ValidationError(e.messages)
            with transaction.atomic():
                user.set_password(data["password"])
                user.save()
                user.profile.phone = data["phone"]
                user.profile.terms_accepted_at = timezone.now()
                user.profile.save()
            login(request, user)
            return Response(
                {"user": UserSerializer(user).data, "csrfToken": get_token(request)},
                status=201,
            )
        if action == "login":
            user = authenticate(
                request,
                username=str(data.get("email", "")).strip().lower(),
                password=data.get("password", ""),
            )
            if not user:
                raise ValidationError(
                    "The email or password is incorrect, or the account is suspended."
                )
            login(request, user)
            return Response(
                {"user": UserSerializer(user).data, "csrfToken": get_token(request)}
            )
        if action == "logout":
            logout(request)
            return Response({"detail": "Signed out.", "csrfToken": get_token(request)})
        if action == "forgot-password":
            user = User.objects.filter(
                email__iexact=str(data.get("email", "")), is_active=True
            ).first()
            if user:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                link = f"{settings.FRONTEND_ORIGIN}/reset-password/{uid}/{token}"
                send_mail(
                    "Reset your Haven password",
                    f"Use this link to choose a new password: {link}\nIf you did not request this, ignore this email.",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                )
            return Response(
                {"detail": "If that email has an account, a reset link has been sent."}
            )
        if action == "reset-password":
            try:
                user = User.objects.get(
                    pk=urlsafe_base64_decode(data.get("uid", "")).decode()
                )
            except (User.DoesNotExist, ValueError, TypeError, UnicodeDecodeError):
                raise ValidationError("This reset link is invalid.")
            if not default_token_generator.check_token(user, data.get("token", "")):
                raise ValidationError("This reset link is invalid or expired.")
            if data.get("password") != data.get("confirm_password"):
                raise ValidationError("Passwords do not match.")
            try:
                validate_password(data.get("password", ""), user)
            except DjangoValidationError as e:
                raise ValidationError(e.messages)
            user.set_password(data["password"])
            user.save()
            return Response(
                {"detail": "Your password has been reset. You can now sign in."}
            )
        raise ValidationError("Unknown account action.")


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = UserSerializer(request.user, data=request.data, partial=True)
        user.is_valid(raise_exception=True)
        profile = ProfileSerializer(
            request.user.profile, data=request.data.get("profile", {}), partial=True
        )
        profile.is_valid(raise_exception=True)
        user.save()
        profile.save()
        return Response(UserSerializer(request.user).data)

    def post(self, request):
        if not request.user.check_password(request.data.get("old_password", "")):
            raise ValidationError("Your current password is incorrect.")
        if request.data.get("password") != request.data.get("confirm_password"):
            raise ValidationError("Passwords do not match.")
        try:
            validate_password(request.data.get("password", ""), request.user)
        except DjangoValidationError as e:
            raise ValidationError(e.messages)
        request.user.set_password(request.data["password"])
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Password changed."})
