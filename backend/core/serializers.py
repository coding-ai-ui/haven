from datetime import date
from django.db.models import Avg
from rest_framework import serializers
from .models import *


class PublicUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    verified = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source="date_joined", read_only=True)

    def get_name(self, obj):
        return obj.get_full_name() or "Haven member"

    def get_verified(self, obj):
        return obj.profile.verification_status == "verified"

    class Meta:
        model = User
        fields = ["id", "name", "verified", "member_since"]


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["phone", "bio", "address", "country", "verification_status"]
        read_only_fields = ["verification_status"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "is_staff", "profile"]
        read_only_fields = ["id", "email", "is_staff", "profile"]


class ImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        return obj.image.url if obj.image else obj.demo_url

    class Meta:
        model = PropertyImage
        fields = ["id", "url", "caption"]


class PropertySerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    images = ImageSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    hotel_id = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    def get_rating(self, obj):
        values = [r.rating for r in obj.reviews.all()]
        return round(sum(values) / len(values), 1) if values else None

    def get_review_count(self, obj):
        return len(obj.reviews.all())

    def get_hotel_id(self, obj):
        return obj.hotel.id if hasattr(obj, "hotel") else None

    def get_is_saved(self, obj):
        user = self.context["request"].user
        return user.is_authenticated and any(
            f.user_id == user.id for f in obj.favorites.all()
        )

    def get_phone(self, obj):
        user = self.context["request"].user
        return (
            obj.owner.profile.phone
            if user.is_authenticated and obj.contact_preference in ["phone", "both"]
            else ""
        )

    def validate_amenities(self, value):
        if (
            not isinstance(value, list)
            or len(value) > 30
            or any(not isinstance(x, str) or len(x) > 80 for x in value)
        ):
            raise serializers.ValidationError("Use up to 30 amenity names.")
        return value

    def validate(self, data):
        category = data.get("category", getattr(self.instance, "category", None))
        kind = data.get(
            "transaction_type", getattr(self.instance, "transaction_type", None)
        )
        if (category == "Hotel") != (kind == "hotel"):
            raise serializers.ValidationError(
                "Hotel listings must use the Hotel category and Hotel booking transaction."
            )
        return data

    class Meta:
        model = Property
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "category",
            "transaction_type",
            "price",
            "location",
            "address",
            "bedrooms",
            "bathrooms",
            "area",
            "furnished",
            "parking",
            "amenities",
            "availability",
            "contact_preference",
            "featured",
            "views",
            "created_at",
            "images",
            "rating",
            "review_count",
            "is_saved",
            "hotel_id",
            "phone",
            "approved",
        ]
        read_only_fields = ["owner", "featured", "views", "created_at", "approved"]


class HotelRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelRoom
        fields = [
            "id",
            "hotel",
            "name",
            "room_type",
            "capacity",
            "bed_type",
            "price",
            "available",
            "amenities",
            "image_url",
        ]


class HotelSerializer(serializers.ModelSerializer):
    property = PropertySerializer(read_only=True)
    rooms = HotelRoomSerializer(many=True, read_only=True)

    class Meta:
        model = Hotel
        fields = ["id", "property", "rooms", "check_in_time", "check_out_time"]


class BookingSerializer(serializers.ModelSerializer):
    hotel_title = serializers.CharField(
        source="room.hotel.property.title", read_only=True
    )
    property_id = serializers.IntegerField(
        source="room.hotel.property_id", read_only=True
    )
    room_name = serializers.CharField(source="room.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    owner_id = serializers.IntegerField(
        source="room.hotel.property.owner_id", read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "user",
            "room",
            "check_in",
            "check_out",
            "guests",
            "total_price",
            "status",
            "created_at",
            "hotel_title",
            "room_name",
            "property_id",
            "owner_id",
            "user_name",
        ]
        read_only_fields = ["user", "total_price", "status", "created_at"]

    def validate(self, data):
        room = data["room"]
        if data["check_in"] < date.today():
            raise serializers.ValidationError("Check-in cannot be in the past.")
        if data["check_out"] <= data["check_in"]:
            raise serializers.ValidationError("Check-out must be after check-in.")
        if (data["check_out"] - data["check_in"]).days > 365:
            raise serializers.ValidationError("Choose a stay of 365 nights or less.")
        if data["guests"] > room.capacity:
            raise serializers.ValidationError(
                "Guest count exceeds this room’s capacity."
            )
        if (
            not room.available
            or room.hotel.property.availability != "available"
            or not room.hotel.property.approved
            or not room.hotel.property.owner.is_active
        ):
            raise serializers.ValidationError("This room is unavailable.")
        return data


class VerificationSerializer(serializers.ModelSerializer):
    document_front = serializers.ImageField(
        write_only=True, validators=[validate_image]
    )
    document_back = serializers.ImageField(
        write_only=True, required=False, validators=[validate_image]
    )
    selfie = serializers.ImageField(write_only=True, validators=[validate_image])

    class Meta:
        model = VerificationRequest
        fields = [
            "id",
            "legal_name",
            "date_of_birth",
            "document_type",
            "document_number",
            "document_front",
            "document_back",
            "selfie",
            "address",
            "country",
            "status",
            "review_note",
            "created_at",
        ]
        read_only_fields = ["status", "review_note", "created_at"]
        extra_kwargs = {"document_number": {"write_only": True}}

    def validate(self, data):
        today = date.today()
        dob = data["date_of_birth"]
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18 or age > 120:
            raise serializers.ValidationError(
                "You must be at least 18 to publish on Haven."
            )
        if data["document_type"] == "national_id" and not data.get("document_back"):
            raise serializers.ValidationError("Upload both sides of your national ID.")
        return data


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "content",
            "created_at",
            "is_read",
        ]
        read_only_fields = ["sender", "created_at", "is_read"]

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Enter a message.")
        return value.strip()


class ConversationSerializer(serializers.ModelSerializer):
    buyer = PublicUserSerializer(read_only=True)
    owner = PublicUserSerializer(read_only=True)
    property = PropertySerializer(read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()

    def get_latest_message(self, obj):
        m = obj.messages.last()
        return MessageSerializer(m).data if m else None

    def get_unread(self, obj):
        return (
            obj.messages.filter(is_read=False)
            .exclude(sender=self.context["request"].user)
            .count()
        )

    class Meta:
        model = Conversation
        fields = ["id", "buyer", "owner", "property", "latest_message", "unread"]


class ReviewSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "property", "host", "rating", "comment", "created_at"]
        read_only_fields = ["created_at"]
        validators = []

    def validate(self, data):
        if bool(data.get("property")) == bool(data.get("host")):
            raise serializers.ValidationError("Choose one property or host to review.")
        target = (
            {"property": data["property"]}
            if data.get("property")
            else {"host": data["host"]}
        )
        if Review.objects.filter(user=self.context["request"].user, **target).exists():
            raise serializers.ValidationError(
                "You have already reviewed this place or host."
            )
        if data.get("property") and (
            not data["property"].approved or not data["property"].owner.is_active
        ):
            raise serializers.ValidationError("This listing is unavailable.")
        if data.get("host") == self.context["request"].user or (
            data.get("property")
            and data["property"].owner == self.context["request"].user
        ):
            raise serializers.ValidationError(
                "You cannot review your own listing or profile."
            )
        return data


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id",
            "property",
            "reported_user",
            "message",
            "reason",
            "details",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def validate(self, data):
        if (
            sum(bool(data.get(k)) for k in ["property", "reported_user", "message"])
            != 1
        ):
            raise serializers.ValidationError(
                "Choose one listing, user, or message to report."
            )
        if data.get("message"):
            c = data["message"].conversation
            if self.context["request"].user.id not in [c.buyer_id, c.owner_id]:
                raise serializers.ValidationError("This message is unavailable.")
        return data


class ViewingSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source="property.title", read_only=True)
    owner_id = serializers.IntegerField(source="property.owner_id", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ViewingRequest
        fields = [
            "id",
            "property",
            "property_title",
            "owner_id",
            "user_name",
            "user",
            "preferred_date",
            "preferred_time",
            "message",
            "status",
        ]
        read_only_fields = ["status", "user"]

    def validate_preferred_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Choose today or a future date.")
        return value

    def validate_property(self, value):
        if (
            value.availability != "available"
            or not value.approved
            or not value.owner.is_active
        ):
            raise serializers.ValidationError("This property is unavailable.")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "text", "link", "is_read", "created_at"]
        read_only_fields = ["text", "link", "created_at"]


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message"]
