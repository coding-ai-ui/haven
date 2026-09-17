from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html, format_html_join
from .models import *
from .views import review_verification

admin.site.site_header = "Haven administration"
admin.site.site_title = "Haven Admin"
admin.site.index_title = "Marketplace operations"
admin.site.register(User, UserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "verification_status", "country"]
    list_filter = ["verification_status", "country"]
    search_fields = ["user__email", "user__first_name"]
    readonly_fields = ["verification_status", "terms_accepted_at"]


@admin.register(VerificationRequest)
class VerificationAdmin(admin.ModelAdmin):
    list_display = ["legal_name", "user", "document_type", "status", "created_at"]
    list_filter = ["status", "document_type"]
    search_fields = ["legal_name", "user__email"]
    exclude = ["document_front", "document_back", "selfie"]
    readonly_fields = [
        "user",
        "legal_name",
        "date_of_birth",
        "document_type",
        "document_number",
        "address",
        "country",
        "status",
        "reviewed_by",
        "created_at",
        "protected_documents",
    ]
    actions = ["approve", "reject"]

    def has_add_permission(self, request):
        return False

    def protected_documents(self, obj):
        return format_html_join(
            " | ",
            '<a href="/api/admin/verification/{}/{}/">{}</a>',
            [
                (obj.pk, f, f.replace("_", " ").title())
                for f in ["document_front", "document_back", "selfie"]
                if getattr(obj, f)
            ],
        )

    @admin.action(description="Approve selected identities")
    def approve(self, request, queryset):
        for obj in queryset.exclude(user=request.user):
            review_verification(obj, request.user, "verified", obj.review_note)

    @admin.action(description="Reject selected identities (add a review note first)")
    def reject(self, request, queryset):
        for obj in queryset.exclude(user=request.user):
            review_verification(obj, request.user, "rejected", obj.review_note)


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 0


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "owner",
        "category",
        "transaction_type",
        "price",
        "availability",
        "approved",
    ]
    list_filter = ["category", "transaction_type", "availability", "approved"]
    search_fields = ["title", "location", "owner__email"]
    inlines = [PropertyImageInline]
    readonly_fields = ["views"]


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ["property", "check_in_time", "check_out_time"]
    search_fields = ["property__title"]


@admin.register(HotelRoom)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "hotel", "room_type", "capacity", "price", "available"]
    list_filter = ["room_type", "available"]
    search_fields = ["name", "hotel__property__title"]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "room",
        "check_in",
        "check_out",
        "total_price",
        "status",
    ]
    list_filter = ["status", "check_in"]
    search_fields = ["user__email", "room__hotel__property__title"]
    readonly_fields = [
        "user",
        "room",
        "check_in",
        "check_out",
        "guests",
        "total_price",
        "created_at",
        "status",
    ]

    def has_add_permission(self, request):
        return False

    # Status changes go through the website admin, which validates transitions.


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "reason", "status", "created_at"]
    list_filter = ["reason", "status"]
    search_fields = ["details", "user__email"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["user", "property", "host", "rating", "created_at"]
    list_filter = ["rating"]
    search_fields = ["comment", "user__email"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "conversation", "created_at", "is_read"]
    search_fields = ["content", "sender__email"]
    list_filter = ["is_read"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["buyer", "owner", "property", "created_at"]
    search_fields = ["buyer__email", "owner__email", "property__title"]


@admin.register(ViewingRequest)
class ViewingAdmin(admin.ModelAdmin):
    list_display = ["property", "user", "preferred_date", "status"]
    list_filter = ["status", "preferred_date"]
    search_fields = ["property__title", "user__email"]


@admin.register(ContactMessage)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "subject", "created_at"]
    search_fields = ["email", "subject", "message"]


for model in [PropertyImage, Favorite, Notification, NewsletterSubscriber]:
    admin.site.register(model)
