from django.db import models
from django.db.models import Q
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from .storage import PrivateStorage, private_path, public_path, validate_image


class User(AbstractUser):
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.get_full_name() or self.email


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=32, blank=True)
    bio = models.TextField(blank=True, max_length=2000)
    address = models.CharField(max_length=300, blank=True)
    country = models.CharField(max_length=80, blank=True)
    verification_status = models.CharField(
        max_length=20,
        default="not_submitted",
        choices=[
            (x, x.replace("_", " ").title())
            for x in ["not_submitted", "pending", "verified", "rejected"]
        ],
    )
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return str(self.user)


class VerificationRequest(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="verifications"
    )
    legal_name = models.CharField(max_length=160)
    date_of_birth = models.DateField()
    document_type = models.CharField(
        max_length=20,
        choices=[("national_id", "National ID"), ("passport", "Passport")],
    )
    document_number = models.CharField(max_length=80)
    document_front = models.FileField(
        storage=PrivateStorage(), upload_to=private_path, validators=[validate_image]
    )
    document_back = models.FileField(
        storage=PrivateStorage(),
        upload_to=private_path,
        validators=[validate_image],
        blank=True,
    )
    selfie = models.FileField(
        storage=PrivateStorage(), upload_to=private_path, validators=[validate_image]
    )
    address = models.CharField(max_length=300)
    country = models.CharField(max_length=80)
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[(x, x.title()) for x in ["pending", "verified", "rejected"]],
    )
    review_note = models.TextField(blank=True, max_length=2000)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verification_reviews",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.legal_name} — {self.status}"


class Property(models.Model):
    CATEGORIES = [
        "House",
        "Apartment",
        "Villa",
        "Studio",
        "Room",
        "Shared Room",
        "Hotel",
        "Guest House",
    ]
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="properties")
    title = models.CharField(max_length=160)
    description = models.TextField(max_length=10000)
    category = models.CharField(max_length=30, choices=[(x, x) for x in CATEGORIES])
    transaction_type = models.CharField(
        max_length=20,
        choices=[
            ("sale", "Sale"),
            ("rent", "Long-term rent"),
            ("short_term", "Short-term rent"),
            ("hotel", "Hotel booking"),
        ],
    )
    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    location = models.CharField(max_length=150)
    address = models.CharField(max_length=300)
    bedrooms = models.PositiveSmallIntegerField(default=1)
    bathrooms = models.PositiveSmallIntegerField(default=1)
    area = models.PositiveIntegerField(default=0)
    furnished = models.BooleanField(default=False)
    parking = models.BooleanField(default=False)
    amenities = models.JSONField(default=list, blank=True)
    availability = models.CharField(
        max_length=20,
        default="available",
        choices=[(x, x.title()) for x in ["available", "reserved", "rented", "sold"]],
    )
    contact_preference = models.CharField(
        max_length=20,
        default="message",
        choices=[("message", "Message"), ("phone", "Phone"), ("both", "Both")],
    )
    featured = models.BooleanField(default=False)
    approved = models.BooleanField(default=True)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gte=0), name="property_nonnegative_price"
            )
        ]

    def __str__(self):
        return self.title


class PropertyImage(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        upload_to=public_path, validators=[validate_image], blank=True
    )
    demo_url = models.URLField(blank=True)
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class Hotel(models.Model):
    property = models.OneToOneField(
        Property, on_delete=models.CASCADE, related_name="hotel"
    )
    check_in_time = models.TimeField(default="15:00")
    check_out_time = models.TimeField(default="11:00")

    def __str__(self):
        return self.property.title


class HotelRoom(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name="rooms")
    name = models.CharField(max_length=80)
    room_type = models.CharField(
        max_length=20,
        choices=[
            (x, x)
            for x in ["Single Room", "Double Room", "Twin Room", "Family Room", "Suite"]
        ],
    )
    capacity = models.PositiveSmallIntegerField(
        default=2, validators=[MinValueValidator(1)]
    )
    bed_type = models.CharField(max_length=60, default="Queen bed")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    available = models.BooleanField(default=True)
    amenities = models.JSONField(default=list, blank=True)
    image_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.hotel} — {self.name}"


class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    room = models.ForeignKey(
        HotelRoom, on_delete=models.PROTECT, related_name="bookings"
    )
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            (x, x.title()) for x in ["pending", "confirmed", "cancelled", "completed"]
        ],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(check_out__gt=models.F("check_in")),
                name="booking_positive_nights",
            )
        ]


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="favorites"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "property"], name="unique_favorite")
        ]


class Conversation(models.Model):
    buyer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="buyer_conversations"
    )
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="owner_conversations"
    )
    property = models.ForeignKey(
        Property, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["buyer", "owner", "property"], name="unique_conversation"
            )
        ]


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at", "id"]


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    property = models.ForeignKey(
        Property,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    host = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="host_reviews",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(property__isnull=False, host__isnull=True)
                    | Q(property__isnull=True, host__isnull=False)
                ),
                name="review_one_target",
            ),
            models.UniqueConstraint(
                fields=["user", "property"], name="one_property_review"
            ),
            models.UniqueConstraint(fields=["user", "host"], name="one_host_review"),
        ]


class Report(models.Model):
    REASONS = [
        "Scam",
        "Fake listing",
        "Fake identity",
        "Harassment",
        "Suspicious payment request",
        "Incorrect information",
        "Duplicate listing",
        "Other",
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    property = models.ForeignKey(
        Property, null=True, blank=True, on_delete=models.SET_NULL
    )
    reported_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="received_reports",
    )
    message = models.ForeignKey(
        Message, null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.CharField(max_length=80, choices=[(x, x) for x in REASONS])
    details = models.TextField(max_length=5000, blank=True)
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            (x, x.title())
            for x in ["pending", "investigating", "resolved", "dismissed"]
        ],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ViewingRequest(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="viewing_requests"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    message = models.TextField(blank=True, max_length=2000)
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[(x, x.title()) for x in ["pending", "accepted", "rejected"]],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Notification(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    text = models.CharField(max_length=300)
    link = models.CharField(max_length=200, default="/dashboard")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
