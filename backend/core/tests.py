"""Integration tests for customer journeys and permission boundaries."""

import tempfile
from datetime import date, timedelta
from io import BytesIO
from PIL import Image
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from .models import *


def image_file(name="identity.png"):
    output = BytesIO()
    Image.new("RGB", (20, 20), "navy").save(output, format="PNG")
    return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")


class MarketplaceFlows(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner@test.example",
            email="owner@test.example",
            password="OwnerStrongPass!43",
            first_name="Owner",
        )
        cls.owner.profile.verification_status = "verified"
        cls.owner.profile.save()
        cls.guest = User.objects.create_user(
            username="guest@test.example",
            email="guest@test.example",
            password="GuestStrongPass!43",
            first_name="Guest",
        )
        cls.other = User.objects.create_user(
            username="other@test.example",
            email="other@test.example",
            password="OtherStrongPass!43",
        )
        cls.admin = User.objects.create_superuser(
            username="admin@test.example",
            email="admin@test.example",
            password="AdminStrongPass!43",
        )
        cls.home = Property.objects.create(
            owner=cls.owner,
            title="A test home",
            description="A complete place.",
            category="House",
            transaction_type="sale",
            price=500000,
            location="Lisbon",
            address="A fictional address",
        )
        cls.hotel_property = Property.objects.create(
            owner=cls.owner,
            title="A test hotel",
            description="A calm stay.",
            category="Hotel",
            transaction_type="hotel",
            price=120,
            location="London",
            address="A fictional street",
        )
        cls.hotel = Hotel.objects.create(property=cls.hotel_property)
        cls.room = HotelRoom.objects.create(
            hotel=cls.hotel,
            name="Double 101",
            room_type="Double Room",
            capacity=2,
            price=120,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.guest)

    def booking(self, **updates):
        data = {
            "room": self.room.id,
            "check_in": str(date.today() + timedelta(days=10)),
            "check_out": str(date.today() + timedelta(days=13)),
            "guests": 2,
        }
        data.update(updates)
        return data

    def property_data(self):
        return {
            "title": "A new listing",
            "description": "A welcoming home.",
            "category": "House",
            "transaction_type": "rent",
            "price": "1500",
            "location": "Lisbon",
            "address": "12 Example Street",
        }

    def test_flow_1_register_login_browse_save_and_terms(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.get("/api/auth/session/")
        token = response.data["csrfToken"]
        values = {
            "first_name": "Maya",
            "last_name": "Stone",
            "email": "maya@test.example",
            "phone": "+441234567890",
            "password": "ChapterBegins!924",
            "confirm_password": "ChapterBegins!924",
            "accept_terms": False,
        }
        self.assertEqual(
            client.post(
                "/api/auth/register/", values, format="json", HTTP_X_CSRFTOKEN=token
            ).status_code,
            400,
        )
        values["accept_terms"] = True
        registered = client.post(
            "/api/auth/register/", values, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(registered.status_code, 201, registered.data)
        self.assertNotIn("password", registered.data["user"])
        user = User.objects.get(email=values["email"])
        self.assertTrue(user.check_password(values["password"]))
        self.assertNotEqual(user.password, values["password"])
        token = registered.data["csrfToken"]
        out = client.post(
            "/api/auth/logout/", {}, format="json", HTTP_X_CSRFTOKEN=token
        )
        signed = client.post(
            "/api/auth/login/",
            {"email": values["email"], "password": values["password"]},
            format="json",
            HTTP_X_CSRFTOKEN=out.data["csrfToken"],
        )
        self.assertEqual(signed.status_code, 200)
        self.assertEqual(client.get("/api/properties/").status_code, 200)
        saved = client.post(
            "/api/favorites/toggle/",
            {"property": self.home.id},
            format="json",
            HTTP_X_CSRFTOKEN=signed.data["csrfToken"],
        )
        self.assertTrue(saved.data["saved"])
        self.assertEqual(client.get("/api/favorites/").data["count"], 1)

    def test_flow_2_verify_manual_approval_publish_and_private_documents(self):
        from .models import VerificationRequest

        # Use temporary private storage for synthetic test images.
        fields = [
            VerificationRequest._meta.get_field(name)
            for name in ["document_front", "document_back", "selfie"]
        ]
        originals = [f.storage for f in fields]
        from django.core.files.storage import FileSystemStorage

        with tempfile.TemporaryDirectory() as directory:
            for f in fields:
                f.storage = FileSystemStorage(location=directory)
            try:
                payload = {
                    "legal_name": "Guest Example",
                    "date_of_birth": "1995-03-10",
                    "document_type": "national_id",
                    "document_number": "TEST-ONLY",
                    "address": "Test address",
                    "country": "Portugal",
                    "document_front": image_file(),
                    "document_back": image_file("back.png"),
                    "selfie": image_file("selfie.png"),
                    "status": "verified",
                }
                response = self.client.post(
                    "/api/verification/", payload, format="multipart"
                )
                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(response.data["status"], "pending")
                self.assertNotIn("document_front", response.data)
                self.assertNotIn("document_number", response.data)
                self.guest.profile.refresh_from_db()
                self.assertEqual(self.guest.profile.verification_status, "pending")
                pk = response.data["id"]
                url = f"/api/admin/verification/{pk}/document_front/"
                self.assertEqual(self.client.get(url).status_code, 403)
                self.assertEqual(
                    self.client.post(
                        "/api/admin/overview/",
                        {"kind": "verification", "id": pk, "value": "verified"},
                    ).status_code,
                    403,
                )
                self.client.force_authenticate(self.admin)
                download = self.client.get(url)
                self.assertEqual(download.status_code, 200)
                self.assertEqual(download["Cache-Control"], "private, no-store")
                download.close()
                approve = self.client.post(
                    "/api/admin/overview/",
                    {
                        "kind": "verification",
                        "id": pk,
                        "value": "verified",
                        "note": "Synthetic test approval.",
                    },
                    format="json",
                )
                self.assertEqual(approve.status_code, 200)
                self.client.force_authenticate(User.objects.get(pk=self.guest.pk))
                published = self.client.post(
                    "/api/properties/", self.property_data(), format="json"
                )
                self.assertEqual(published.status_code, 201, published.data)
                self.assertEqual(
                    Notification.objects.filter(user=self.guest).count(), 2
                )
            finally:
                for f, original in zip(fields, originals):
                    f.storage = original

    def test_flow_3_chat_and_history(self):
        convo = self.client.post(
            "/api/conversations/", {"property": self.home.id}, format="json"
        )
        self.assertEqual(convo.status_code, 201)
        message = self.client.post(
            "/api/messages/",
            {
                "conversation": convo.data["id"],
                "content": "Hello, can I arrange a viewing?",
            },
            format="json",
        )
        self.assertEqual(message.status_code, 201)
        self.assertEqual(
            self.client.get(f"/api/messages/?conversation={convo.data['id']}").data[
                "count"
            ],
            1,
        )
        self.client.force_authenticate(self.owner)
        self.assertEqual(
            self.client.post(
                "/api/messages/mark-read/",
                {"conversation": convo.data["id"]},
                format="json",
            ).status_code,
            200,
        )
        self.assertTrue(Message.objects.get(pk=message.data["id"]).is_read)

    def test_flow_4_hotel_search_room_booking_server_price(self):
        self.assertEqual(
            self.client.get("/api/properties/?transaction_type=hotel&q=London").data[
                "count"
            ],
            1,
        )
        hotel = self.client.get(f"/api/hotels/{self.hotel.id}/")
        self.assertEqual(len(hotel.data["rooms"]), 1)
        result = self.client.post(
            "/api/bookings/",
            self.booking(total_price="1", status="completed"),
            format="json",
        )
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["total_price"], "360.00")
        self.assertEqual(result.data["status"], "confirmed")

    def test_flow_5_report_reaches_admin(self):
        response = self.client.post(
            "/api/reports/",
            {
                "property": self.home.id,
                "reason": "Suspicious payment request",
                "details": "Asked for gift cards.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.client.force_authenticate(self.admin)
        report = self.client.get("/api/admin/overview/").data["reports"][0]
        self.assertEqual(report["id"], response.data["id"])
        result = self.client.post(
            "/api/admin/overview/",
            {"kind": "report", "id": report["id"], "value": "investigating"},
            format="json",
        )
        self.assertEqual(result.status_code, 200)

    def test_flow_6_viewing_owner_response(self):
        response = self.client.post(
            "/api/viewing-requests/",
            {
                "property": self.home.id,
                "preferred_date": str(date.today() + timedelta(days=2)),
                "preferred_time": "14:00",
                "message": "Afternoon works well.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        url = f"/api/viewing-requests/{response.data['id']}/respond/"
        self.assertEqual(
            self.client.post(url, {"status": "accepted"}, format="json").status_code,
            403,
        )
        self.client.force_authenticate(self.owner)
        result = self.client.post(url, {"status": "accepted"}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["status"], "accepted")
        self.assertTrue(
            Notification.objects.filter(
                user=self.guest, text__contains="accepted"
            ).exists()
        )

    def test_flow_7_cannot_change_another_owners_listing(self):
        self.assertEqual(
            self.client.patch(
                f"/api/properties/{self.home.id}/",
                {"title": "Stolen title"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(f"/api/properties/{self.home.id}/").status_code, 403
        )
        self.home.refresh_from_db()
        self.assertEqual(self.home.title, "A test home")

    def test_flow_8_unverified_cannot_publish_or_self_verify(self):
        result = self.client.post(
            "/api/properties/", self.property_data(), format="json"
        )
        self.assertEqual(result.status_code, 403)
        self.client.patch(
            "/api/profile/",
            {"is_staff": True, "profile": {"verification_status": "verified"}},
            format="json",
        )
        self.guest.refresh_from_db()
        self.guest.profile.refresh_from_db()
        self.assertFalse(self.guest.is_staff)
        self.assertEqual(self.guest.profile.verification_status, "not_submitted")

    def test_flow_9_overlap_rejected_and_adjacent_dates_allowed(self):
        first = self.client.post("/api/bookings/", self.booking(), format="json")
        self.assertEqual(first.status_code, 201)
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.post(
                "/api/bookings/", self.booking(), format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/bookings/",
                self.booking(
                    check_in=str(date.today() + timedelta(days=12)),
                    check_out=str(date.today() + timedelta(days=15)),
                ),
                format="json",
            ).status_code,
            400,
        )
        adjacent = self.booking(
            check_in=str(date.today() + timedelta(days=13)),
            check_out=str(date.today() + timedelta(days=15)),
        )
        self.assertEqual(
            self.client.post("/api/bookings/", adjacent, format="json").status_code, 201
        )

    def test_cancel_releases_inventory_and_other_guests_cannot_cancel(self):
        first = self.client.post("/api/bookings/", self.booking(), format="json")
        url = f"/api/bookings/{first.data['id']}/cancel/"
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url).status_code, 404)
        self.client.force_authenticate(self.guest)
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(
            self.client.post(
                "/api/bookings/", self.booking(), format="json"
            ).status_code,
            201,
        )

    def test_booking_validation(self):
        for updates in [
            {"guests": 0},
            {"guests": 3},
            {"check_in": str(date.today() - timedelta(days=1))},
            {"check_out": str(date.today())},
        ]:
            self.assertEqual(
                self.client.post(
                    "/api/bookings/", self.booking(**updates), format="json"
                ).status_code,
                400,
            )
        self.room.available = False
        self.room.save()
        self.assertEqual(
            self.client.post(
                "/api/bookings/", self.booking(), format="json"
            ).status_code,
            400,
        )

    def test_private_chat_cannot_be_read_written_or_reported_by_outsider(self):
        convo = Conversation.objects.create(
            buyer=self.guest, owner=self.owner, property=self.home
        )
        msg = Message.objects.create(
            conversation=convo, sender=self.owner, content="Private conversation"
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.get(f"/api/conversations/{convo.id}/").status_code, 404
        )
        self.assertEqual(
            self.client.get(f"/api/messages/?conversation={convo.id}").data["count"], 0
        )
        self.assertEqual(
            self.client.post(
                "/api/messages/",
                {"conversation": convo.id, "content": "Intrusion"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/reports/", {"message": msg.id, "reason": "Other"}, format="json"
            ).status_code,
            400,
        )

    def test_sensitive_information_is_not_public(self):
        self.client.force_authenticate(None)
        result = self.client.get(f"/api/properties/{self.home.id}/")
        self.assertNotIn("email", result.data["owner"])
        self.assertNotIn("profile", result.data["owner"])
        self.assertNotIn("password", result.data["owner"])
        self.assertEqual(self.client.get("/api/verification/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/overview/").status_code, 403)
        self.assertEqual(
            self.client.get("/private_documents/test.png").status_code, 404
        )

    def test_csrf_is_required_even_on_login_and_registration(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(
            client.post(
                "/api/auth/login/",
                {"email": self.guest.email, "password": "GuestStrongPass!43"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            client.post("/api/auth/register/", {}, format="json").status_code, 403
        )

    def test_suspension_hides_listings_and_prevents_login(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.post(
                "/api/admin/overview/",
                {"kind": "user", "id": self.owner.id, "value": "suspended"},
                format="json",
            ).status_code,
            200,
        )
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/properties/").data["count"], 0)
        self.assertEqual(
            self.client.post(
                "/api/auth/login/",
                {"email": self.owner.email, "password": "OwnerStrongPass!43"},
                format="json",
            ).status_code,
            400,
        )

    def test_invalid_uploads_and_negative_prices_rejected(self):
        self.client.force_authenticate(self.owner)
        data = self.property_data()
        data["price"] = -5
        self.assertEqual(
            self.client.post("/api/properties/", data, format="json").status_code, 400
        )
        payload = {
            "images": SimpleUploadedFile(
                "bad.png", b"not an image", content_type="image/png"
            )
        }
        self.assertEqual(
            self.client.post(
                f"/api/properties/{self.home.id}/images/", payload, format="multipart"
            ).status_code,
            400,
        )

    def test_contact_newsletter_and_reviews_persist(self):
        self.assertEqual(
            self.client.post(
                "/api/contact/",
                {
                    "name": "Guest",
                    "email": "guest@test.example",
                    "subject": "Help",
                    "message": "A question.",
                },
                format="json",
            ).status_code,
            201,
        )
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(
            self.client.post(
                "/api/newsletter/", {"email": "reader@test.example"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(NewsletterSubscriber.objects.count(), 1)
        payload = {"property": self.home.id, "rating": 5, "comment": "A helpful owner."}
        self.assertEqual(
            self.client.post("/api/reviews/", payload, format="json").status_code, 201
        )
        self.assertEqual(
            self.client.post("/api/reviews/", payload, format="json").status_code, 400
        )

    def test_password_change_and_reset_token(self):
        result = self.client.post(
            "/api/profile/",
            {
                "old_password": "GuestStrongPass!43",
                "password": "ChangedSecure!398",
                "confirm_password": "ChangedSecure!398",
            },
            format="json",
        )
        self.assertEqual(result.status_code, 200)
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        self.guest.refresh_from_db()
        token = default_token_generator.make_token(self.guest)
        self.client.force_authenticate(None)
        result = self.client.post(
            "/api/auth/reset-password/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.guest.pk)),
                "token": token,
                "password": "ResetSecure!876",
                "confirm_password": "ResetSecure!876",
            },
            format="json",
        )
        self.assertEqual(result.status_code, 200)
        self.guest.refresh_from_db()
        self.assertTrue(self.guest.check_password("ResetSecure!876"))
        self.assertFalse(default_token_generator.check_token(self.guest, token))
