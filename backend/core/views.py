from datetime import date
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.db.models import Q, F, Avg, Count
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import *
from .serializers import *


def notify(user, text, link="/dashboard"):
    Notification.objects.create(user=user, text=text, link=link)


def visible_properties():
    return (
        Property.objects.filter(approved=True, owner__is_active=True)
        .select_related("owner__profile", "hotel")
        .prefetch_related("images", "reviews", "favorites")
    )


def require_owner(user, owner_id):
    if user.id != owner_id and not user.is_staff:
        raise PermissionDenied("You do not have permission to change this item.")


def require_verified(user):
    if user.profile.verification_status != "verified":
        raise PermissionDenied(
            "Identity verification is required before publishing a listing."
        )


class PropertyViewSet(viewsets.ModelViewSet):
    serializer_class = PropertySerializer

    def get_queryset(self):
        q = visible_properties()
        p = self.request.query_params
        if p.get("mine") == "1" and self.request.user.is_authenticated:
            q = (
                Property.objects.filter(owner=self.request.user)
                .select_related("owner__profile", "hotel")
                .prefetch_related("images", "reviews", "favorites")
            )
        if (
            self.action in ["update", "partial_update", "destroy", "upload_images"]
            and self.request.user.is_authenticated
        ):
            q = (
                Property.objects.all()
                .select_related("owner__profile", "hotel")
                .prefetch_related("images", "reviews", "favorites")
            )
        if p.get("q"):
            q = q.filter(
                Q(title__icontains=p["q"])
                | Q(location__icontains=p["q"])
                | Q(category__icontains=p["q"])
            )
        if p.get("location"):
            q = q.filter(location__icontains=p["location"])
        if p.get("category"):
            q = q.filter(category=p["category"])
        if p.get("transaction_type"):
            q = q.filter(transaction_type=p["transaction_type"])
        if p.get("rooms") == "1":
            q = q.filter(category__in=["Room", "Shared Room"])
        if p.get("emergency") == "1":
            q = q.filter(
                Q(category__in=["Room", "Shared Room", "Guest House"])
                | Q(transaction_type="short_term"),
                availability="available",
            )
        for key, field in [
            ("min_price", "price__gte"),
            ("max_price", "price__lte"),
            ("bedrooms", "bedrooms__gte"),
            ("bathrooms", "bathrooms__gte"),
        ]:
            if p.get(key):
                try:
                    value = Decimal(p[key])
                    if not value.is_finite() or value < 0:
                        raise InvalidOperation()
                except (InvalidOperation, ValueError):
                    raise ValidationError("Enter valid numeric filters.")
                q = q.filter(**{field: value})
        if p.get("verified") == "1":
            q = q.filter(owner__profile__verification_status="verified")
        if p.get("furnished") == "1":
            q = q.filter(furnished=True)
        if p.get("featured") == "1":
            q = q.filter(featured=True)
        if p.get("amenity"):
            q = q.filter(amenities__icontains=p["amenity"])
        if p.get("guests"):
            try:
                guests = int(p["guests"])
            except ValueError:
                raise ValidationError("Enter a valid guest count.")
            q = q.filter(
                hotel__rooms__capacity__gte=guests, hotel__rooms__available=True
            )
        if p.get("room_type"):
            q = q.filter(hotel__rooms__room_type=p["room_type"])
        if p.get("check_in") and p.get("check_out"):
            try:
                start = date.fromisoformat(p["check_in"])
                end = date.fromisoformat(p["check_out"])
            except ValueError:
                raise ValidationError("Enter valid stay dates.")
            if end <= start:
                raise ValidationError("Check-out must follow check-in.")
            occupied = Booking.objects.filter(
                status__in=["pending", "confirmed"],
                check_in__lt=end,
                check_out__gt=start,
            ).values_list("room_id", flat=True)
            available = HotelRoom.objects.filter(available=True).exclude(
                id__in=occupied
            )
            if p.get("guests"):
                available = available.filter(capacity__gte=guests)
            q = q.filter(hotel__rooms__in=available)
        q = q.annotate(average_rating=Avg("reviews__rating"))
        if p.get("rating"):
            try:
                rating = float(p["rating"])
            except ValueError:
                raise ValidationError("Choose a valid rating.")
            q = q.filter(average_rating__gte=rating)
        order = {
            "newest": "-created_at",
            "price_asc": "price",
            "price_desc": "-price",
            "rating": "-average_rating",
        }.get(p.get("sort"))
        return (
            q.order_by(order, "-id").distinct()
            if order
            else q.order_by("-featured", "-id").distinct()
        )

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        Property.objects.filter(pk=obj.pk).update(views=F("views") + 1)
        obj.views += 1
        return Response(self.get_serializer(obj).data)

    def perform_create(self, serializer):
        require_verified(self.request.user)
        with transaction.atomic():
            obj = serializer.save(owner=self.request.user)
            if obj.category == "Hotel":
                Hotel.objects.create(property=obj)
            notify(
                obj.owner,
                "Your listing was approved and is now live.",
                "/dashboard/listings",
            )

    def perform_update(self, serializer):
        require_owner(self.request.user, serializer.instance.owner_id)
        require_verified(self.request.user)
        if serializer.validated_data.get(
            "category", serializer.instance.category
        ) != serializer.instance.category and hasattr(serializer.instance, "hotel"):
            raise ValidationError(
                "An existing hotel cannot be changed to a residential listing."
            )
        obj = serializer.save()
        if obj.category == "Hotel":
            Hotel.objects.get_or_create(property=obj)

    def perform_destroy(self, instance):
        require_owner(self.request.user, instance.owner_id)
        if Booking.objects.filter(room__hotel__property=instance).exists():
            raise ValidationError(
                "A listing with booking records must be archived instead. Set its availability to Reserved."
            )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="images")
    def upload_images(self, request, pk=None):
        obj = self.get_object()
        require_owner(request.user, obj.owner_id)
        require_verified(request.user)
        files = request.FILES.getlist("images")
        if not files or len(files) + obj.images.count() > 12:
            raise ValidationError("Upload between 1 and 12 images per listing.")
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            for file in files:
                validate_image(file)
        except DjangoValidationError as e:
            raise ValidationError(e.messages)
        for file in files:
            PropertyImage.objects.create(property=obj, image=file, caption=obj.title)
        return Response(ImageSerializer(obj.images.all(), many=True).data, status=201)


class HotelViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HotelSerializer
    queryset = (
        Hotel.objects.filter(property__approved=True, property__owner__is_active=True)
        .select_related("property__owner__profile")
        .prefetch_related(
            "rooms", "property__images", "property__reviews", "property__favorites"
        )
    )


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = HotelRoomSerializer

    def get_queryset(self):
        q = HotelRoom.objects.filter(
            hotel__property__approved=True, hotel__property__owner__is_active=True
        )
        if self.request.query_params.get("hotel"):
            q = q.filter(hotel_id=self.request.query_params["hotel"])
        return q.order_by("id")

    def perform_create(self, serializer):
        require_verified(self.request.user)
        require_owner(
            self.request.user, serializer.validated_data["hotel"].property.owner_id
        )
        serializer.save()

    def perform_update(self, serializer):
        require_owner(self.request.user, serializer.instance.hotel.property.owner_id)
        require_owner(
            self.request.user,
            serializer.validated_data.get(
                "hotel", serializer.instance.hotel
            ).property.owner_id,
        )
        serializer.save()

    def perform_destroy(self, obj):
        require_owner(self.request.user, obj.hotel.property.owner_id)
        if obj.bookings.exists():
            raise ValidationError(
                "This room has bookings. Mark it unavailable instead."
            )
        obj.delete()


class BookingViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            Q(user=self.request.user)
            | Q(room__hotel__property__owner=self.request.user)
        ).select_related("room__hotel__property", "user")

    def create(self, request, *args, **kwargs):
        # BEGIN IMMEDIATE serializes SQLite writers: two requests cannot both reserve the same room.
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            room = data["room"]
            if room.hotel.property.owner_id == request.user.id:
                raise ValidationError("You cannot book your own room.")
            if Booking.objects.filter(
                room=room,
                status__in=["pending", "confirmed"],
                check_in__lt=data["check_out"],
                check_out__gt=data["check_in"],
            ).exists():
                raise ValidationError(
                    "This room is already booked for these dates. Please choose different dates or another room."
                )
            total = (data["check_out"] - data["check_in"]).days * room.price
            obj = serializer.save(
                user=request.user, total_price=total, status="confirmed"
            )
            notify(request.user, "Your booking was confirmed.", "/dashboard/bookings")
            notify(
                room.hotel.property.owner,
                "A guest booked your hotel room.",
                "/dashboard/bookings",
            )
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            obj = self.get_object()
            if obj.status not in ["pending", "confirmed"]:
                raise ValidationError("This booking can no longer be cancelled.")
            obj.status = "cancelled"
            obj.save(update_fields=["status"])
            notify(obj.user, "Your booking has been cancelled.", "/dashboard/bookings")
            notify(
                obj.room.hotel.property.owner,
                "A booking has been cancelled.",
                "/dashboard/bookings",
            )
        return Response(self.get_serializer(obj).data)


class FavoriteViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return visible_properties().filter(favorites__user=self.request.user)

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        obj = get_object_or_404(visible_properties(), id=request.data.get("property"))
        fav, created = Favorite.objects.get_or_create(user=request.user, property=obj)
        if not created:
            fav.delete()
        return Response({"saved": created})


class VerificationViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VerificationSerializer

    def get_queryset(self):
        return VerificationRequest.objects.filter(user=self.request.user).order_by(
            "-id"
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            if self.request.user.profile.verification_status in ["pending", "verified"]:
                raise ValidationError(
                    "Your verification is already pending or approved."
                )
            serializer.save(user=self.request.user, status="pending")
            profile = self.request.user.profile
            profile.verification_status = "pending"
            profile.save(update_fields=["verification_status"])


class ConversationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return (
            Conversation.objects.filter(
                Q(buyer=self.request.user) | Q(owner=self.request.user)
            )
            .select_related(
                "buyer__profile", "owner__profile", "property__owner__profile"
            )
            .prefetch_related(
                "property__images", "property__reviews", "property__favorites"
            )
        )

    def create(self, request):
        obj = get_object_or_404(visible_properties(), id=request.data.get("property"))
        if obj.owner_id == request.user.id:
            raise ValidationError("This is your own listing.")
        conversation, _ = Conversation.objects.get_or_create(
            buyer=request.user, owner=obj.owner, property=obj
        )
        return Response(self.get_serializer(conversation).data, status=201)


class MessageViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        q = Message.objects.filter(
            Q(conversation__buyer=self.request.user)
            | Q(conversation__owner=self.request.user)
        ).select_related("sender")
        conversation = self.request.query_params.get("conversation")
        return q.filter(conversation_id=conversation) if conversation else q

    def perform_create(self, serializer):
        c = serializer.validated_data["conversation"]
        if self.request.user.id not in [c.buyer_id, c.owner_id]:
            raise PermissionDenied("This conversation is private.")
        recipient = c.owner if c.buyer_id == self.request.user.id else c.buyer
        if not recipient.is_active:
            raise ValidationError("This account is unavailable.")
        serializer.save(sender=self.request.user)
        notify(
            recipient, "Someone sent you a message.", f"/messages?conversation={c.id}"
        )

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        q = (
            self.get_queryset()
            .filter(conversation_id=request.data.get("conversation"))
            .exclude(sender=request.user)
        )
        q.update(is_read=True)
        return Response({"detail": "Messages marked as read."})


class ReviewViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        q = Review.objects.select_related("user__profile")
        if self.request.query_params.get("property"):
            q = q.filter(property_id=self.request.query_params["property"])
        if self.request.query_params.get("host"):
            q = q.filter(host_id=self.request.query_params["host"])
        if self.request.query_params.get("mine") == "1":
            q = (
                q.filter(user=self.request.user)
                if self.request.user.is_authenticated
                else q.none()
            )
        return q

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, obj):
        require_owner(self.request.user, obj.user_id)
        obj.delete()


class ReportViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ViewingViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    serializer_class = ViewingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ViewingRequest.objects.filter(
            Q(user=self.request.user) | Q(property__owner=self.request.user)
        ).select_related("property", "user")

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        notify(
            obj.property.owner,
            "Someone requested a property viewing.",
            "/dashboard/viewings",
        )

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        obj = self.get_object()
        require_owner(request.user, obj.property.owner_id)
        if request.data.get("status") not in ["accepted", "rejected"]:
            raise ValidationError("Choose Accepted or Rejected.")
        obj.status = request.data["status"]
        obj.save(update_fields=["status"])
        notify(
            obj.user, f"Your viewing request was {obj.status}.", "/dashboard/viewings"
        )
        return Response(self.get_serializer(obj).data)


class NotificationViewSet(
    mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class ContactViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def newsletter(request):
    field = serializers.EmailField()
    email = field.run_validation(request.data.get("email", ""))
    NewsletterSubscriber.objects.get_or_create(email=email.lower())
    return Response({"detail": "You’re on the list. Look out for your next chapter."})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stats(request):
    return Response(
        {
            "properties": visible_properties().count(),
            "owners": Profile.objects.filter(
                verification_status="verified", user__is_active=True
            ).count(),
            "bookings": Booking.objects.filter(
                status__in=["confirmed", "completed"]
            ).count(),
            "cities": visible_properties().values("location").distinct().count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard(request):
    properties = Property.objects.filter(owner=request.user)
    return Response(
        {
            "listings": properties.count(),
            "views": sum(properties.values_list("views", flat=True)),
            "messages": Message.objects.filter(
                Q(conversation__buyer=request.user)
                | Q(conversation__owner=request.user)
            )
            .exclude(sender=request.user)
            .filter(is_read=False)
            .count(),
            "bookings": Booking.objects.filter(
                Q(user=request.user) | Q(room__hotel__property__owner=request.user)
            ).count(),
            "favorites": Favorite.objects.filter(property__owner=request.user).count(),
            "viewings": ViewingRequest.objects.filter(
                property__owner=request.user, status="pending"
            ).count(),
        }
    )


def review_verification(obj, admin_user, status, note=""):
    if status not in ["verified", "rejected"]:
        raise ValidationError("Choose Verified or Rejected.")
    if obj.user_id == admin_user.id:
        raise PermissionDenied("Another administrator must review your identity.")
    with transaction.atomic():
        obj.status = status
        obj.review_note = note
        obj.reviewed_by = admin_user
        obj.save()
        profile = obj.user.profile
        profile.verification_status = status
        profile.save(update_fields=["verification_status"])
        notify(
            obj.user,
            (
                "Your account has been verified."
                if status == "verified"
                else "Your verification request was rejected. Please check the review note."
            ),
            "/verification",
        )


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAdminUser])
def admin_overview(request):
    if request.method == "POST":
        kind = request.data.get("kind")
        pk = request.data.get("id")
        value = request.data.get("value")
        if kind == "verification":
            obj = get_object_or_404(VerificationRequest, pk=pk)
            review_verification(
                obj, request.user, value, str(request.data.get("note", ""))[:2000]
            )
        elif kind == "user":
            obj = get_object_or_404(User, pk=pk)
            if obj.is_staff or obj.pk == request.user.pk:
                raise ValidationError("Staff accounts cannot be suspended here.")
            obj.is_active = value == "active"
            obj.save(update_fields=["is_active"])
        elif kind == "listing":
            obj = get_object_or_404(Property, pk=pk)
            obj.approved = value == "approved"
            obj.save(update_fields=["approved"])
            notify(
                obj.owner,
                (
                    "Your listing was approved."
                    if obj.approved
                    else "Your listing was removed from browsing."
                ),
                "/dashboard/listings",
            )
        elif kind == "report":
            if value not in ["pending", "investigating", "resolved", "dismissed"]:
                raise ValidationError("Choose a valid report status.")
            obj = get_object_or_404(Report, pk=pk)
            obj.status = value
            obj.save(update_fields=["status"])
        elif kind == "review":
            get_object_or_404(Review, pk=pk).delete()
        elif kind == "booking":
            with transaction.atomic():
                obj = get_object_or_404(Booking, pk=pk)
                if value not in ["cancelled", "completed"]:
                    raise ValidationError("Use Cancelled or Completed.")
                if obj.status not in ["pending", "confirmed"]:
                    raise ValidationError("This booking is already closed.")
                obj.status = value
                obj.save(update_fields=["status"])
                notify(obj.user, f"Your booking was {value}.", "/dashboard/bookings")
        else:
            raise ValidationError("Choose a supported action.")
        return Response({"detail": "Updated successfully."})
    counts = {
        "users": User.objects.count(),
        "verified_users": Profile.objects.filter(
            verification_status="verified"
        ).count(),
        "pending_verification": VerificationRequest.objects.filter(
            status="pending"
        ).count(),
        "listings": Property.objects.count(),
        "hotels": Hotel.objects.count(),
        "bookings": Booking.objects.count(),
        "reports": Report.objects.filter(status="pending").count(),
        "messages": Message.objects.count(),
        "reviews": Review.objects.count(),
    }
    verifications = []
    for v in VerificationRequest.objects.select_related("user").order_by("-id")[:100]:
        verifications.append(
            {
                "id": v.id,
                "user": str(v.user),
                "legal_name": v.legal_name,
                "date_of_birth": v.date_of_birth,
                "document_type": v.document_type,
                "document_number": v.document_number,
                "address": v.address,
                "country": v.country,
                "status": v.status,
                "review_note": v.review_note,
                "has_back": bool(v.document_back),
            }
        )
    return Response(
        {
            "counts": counts,
            "verifications": verifications,
            "users": list(
                User.objects.order_by("-id").values(
                    "id", "first_name", "last_name", "email", "is_active", "is_staff"
                )[:100]
            ),
            "listings": list(
                Property.objects.order_by("-id").values(
                    "id", "title", "approved", "category"
                )[:100]
            ),
            "reports": ReportSerializer(Report.objects.all()[:100], many=True).data,
            "reviews": ReviewSerializer(
                Review.objects.select_related("user__profile").all()[:100], many=True
            ).data,
            "bookings": BookingSerializer(
                Booking.objects.select_related("room__hotel__property", "user").all()[
                    :100
                ],
                many=True,
            ).data,
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def private_document(request, pk, field):
    if not request.user.has_perm("core.view_verificationrequest"):
        raise PermissionDenied("Verification review permission is required.")
    if field not in ["document_front", "document_back", "selfie"]:
        raise Http404()
    obj = get_object_or_404(VerificationRequest, pk=pk)
    file = getattr(obj, field)
    if not file:
        raise Http404()
    response = FileResponse(
        file.open("rb"),
        as_attachment=True,
        filename=f'verification-{pk}-{field}{file.name[file.name.rfind("."):]}',
    )
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response
