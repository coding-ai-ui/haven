"""Idempotent fictional catalog. No shared login passwords are created."""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from core.models import *

PHOTO_IDS = [
    "photo-1613977257363-707ba9348227",
    "photo-1560448204-e02f11c3d0e2",
    "photo-1560185127-6ed189bf02f4",
    "photo-1652161854125-1f5289c13eac",
    "photo-1628012209120-d9db7abf7eab",
    "photo-1600596542815-ffad4c1539a9",
    "photo-1580587771525-78b9dba3b914",
    "photo-1627141234469-24711efb373c",
    "photo-1725962479542-1be0a6b0d444",
    "photo-1689729738817-fb1f4256769d",
    "photo-1631049552057-403cdb8f0658",
]


def photo(i):
    return (
        f"https://images.unsplash.com/{PHOTO_IDS[i%len(PHOTO_IDS)]}?auto=format&fit=crop&w=1200&q=85"
    )


class Command(BaseCommand):
    help = "Load fictional development catalog, owners, reviews and conversations."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo content is only available in development mode.")
        users = []
        for first, last, email in [
            ("Sofia", "Almeida", "sofia@haven.example"),
            ("James", "Bennett", "james@haven.example"),
            ("Amara", "Okafor", "amara@haven.example"),
            ("Oliver", "Chen", "oliver@haven.example"),
        ]:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": email, "first_name": first, "last_name": last},
            )
            if created:
                user.set_unusable_password()
                user.save()
            user.profile.verification_status = (
                "verified" if len(users) < 2 else "not_submitted"
            )
            user.profile.country = (
                "Portugal" if len(users) % 2 == 0 else "United Kingdom"
            )
            user.profile.bio = (
                "Thoughtful spaces and a warm welcome. Happy to answer your questions."
            )
            user.profile.terms_accepted_at = timezone.now()
            user.profile.save()
            users.append(user)
        catalog = [
            (
                "The Cedar House",
                "Lisbon, Portugal",
                "House",
                "sale",
                485000,
                3,
                2,
                185,
                0,
            ),
            (
                "Light-filled city apartment",
                "Barcelona, Spain",
                "Apartment",
                "rent",
                1850,
                2,
                2,
                95,
                1,
            ),
            (
                "A little room to unwind",
                "London, United Kingdom",
                "Room",
                "rent",
                850,
                1,
                1,
                24,
                2,
            ),
            ("Palm Court Villa", "Dubai, UAE", "Villa", "sale", 1250000, 4, 3, 320, 0),
            (
                "The Garden Residence",
                "Porto, Portugal",
                "House",
                "sale",
                375000,
                3,
                2,
                160,
                0,
            ),
            (
                "Sunset Hills House",
                "Málaga, Spain",
                "House",
                "sale",
                565000,
                4,
                3,
                240,
                0,
            ),
            (
                "Westbourne family home",
                "London, United Kingdom",
                "House",
                "sale",
                920000,
                4,
                2,
                190,
                0,
            ),
            (
                "Coastal courtyard home",
                "Cascais, Portugal",
                "House",
                "sale",
                695000,
                3,
                3,
                210,
                0,
            ),
            (
                "The Olive Grove House",
                "Valencia, Spain",
                "House",
                "sale",
                410000,
                3,
                2,
                175,
                0,
            ),
            (
                "Riverside apartment",
                "Lisbon, Portugal",
                "Apartment",
                "rent",
                1450,
                2,
                1,
                85,
                2,
            ),
            (
                "A studio above the city",
                "Barcelona, Spain",
                "Studio",
                "rent",
                1100,
                1,
                1,
                42,
                1,
            ),
            (
                "Parkside townhouse",
                "London, United Kingdom",
                "House",
                "rent",
                2800,
                3,
                2,
                140,
                2,
            ),
            (
                "Marina view apartment",
                "Dubai, UAE",
                "Apartment",
                "rent",
                2400,
                2,
                2,
                115,
                1,
            ),
            (
                "Terrace and sunshine",
                "Porto, Portugal",
                "Apartment",
                "rent",
                950,
                1,
                1,
                58,
                2,
            ),
            (
                "The welcoming guest room",
                "Lisbon, Portugal",
                "Room",
                "short_term",
                35,
                1,
                1,
                20,
                3,
            ),
            (
                "Shared space, fresh start",
                "Barcelona, Spain",
                "Shared Room",
                "short_term",
                22,
                1,
                1,
                18,
                2,
            ),
            (
                "A calm corner in Porto",
                "Porto, Portugal",
                "Room",
                "short_term",
                28,
                1,
                1,
                22,
                1,
            ),
            (
                "Harbour guest house",
                "Valencia, Spain",
                "Guest House",
                "short_term",
                45,
                2,
                1,
                50,
                3,
            ),
        ]
        properties = []
        for i, (
            title,
            location,
            category,
            kind,
            price,
            beds,
            baths,
            area,
            img,
        ) in enumerate(catalog):
            obj, _ = Property.objects.get_or_create(
                title=title,
                defaults={
                    "owner": users[i % 2],
                    "location": location,
                    "address": f"{18+i} Garden Lane, {location}",
                    "category": category,
                    "transaction_type": kind,
                    "price": price,
                    "bedrooms": beds,
                    "bathrooms": baths,
                    "area": area,
                    "description": "Beautiful light, thoughtful details, and space to make your own. This welcoming property brings together comfortable interiors and a well-connected neighbourhood. Enjoy an easy morning in the bright living area, explore the local cafés, and come home to a quiet retreat. Contact the owner to discuss availability, viewing times, and the full terms before making a commitment.",
                    "furnished": True,
                    "parking": category in ["House", "Villa"],
                    "amenities": [
                        "Wi-Fi",
                        "Air conditioning",
                        "Equipped kitchen",
                        "Natural light",
                        "Laundry",
                    ],
                    "featured": i < 4,
                    "contact_preference": "message",
                    "views": 36 + i * 13,
                },
            )
            if category == "House":
                img = 4 + i % 4
            if not obj.images.exists():
                for order, idx in enumerate([img, 1, 2]):
                    PropertyImage.objects.create(
                        property=obj, demo_url=photo(idx), caption=title, order=order
                    )
            PropertyImage.objects.filter(property=obj, order=0, image="").update(demo_url=photo(img))
            Review.objects.get_or_create(
                user=users[2],
                property=obj,
                defaults={
                    "rating": 5 if i % 3 else 4,
                    "comment": "A bright, comfortable space in a lovely neighbourhood. The owner answered our questions clearly.",
                },
            )
            properties.append(obj)
        for i, (title, city, price) in enumerate(
            [
                ("The Luma House", "Lisbon, Portugal", 135),
                ("Casa Sol Boutique", "Barcelona, Spain", 165),
                ("The Westfield", "London, United Kingdom", 195),
                ("Palm & Pearl", "Dubai, UAE", 225),
                ("Ribeira Rooms", "Porto, Portugal", 95),
                ("The Courtyard Hotel", "Valencia, Spain", 115),
            ]
        ):
            obj, _ = Property.objects.get_or_create(
                title=title,
                defaults={
                    "owner": users[i % 2],
                    "location": city,
                    "address": f"{40+i} Central Avenue, {city}",
                    "category": "Hotel",
                    "transaction_type": "hotel",
                    "price": price,
                    "bedrooms": 1,
                    "bathrooms": 1,
                    "area": 35,
                    "furnished": True,
                    "featured": True,
                    "amenities": [
                        "Wi-Fi",
                        "Breakfast",
                        "Air conditioning",
                        "24-hour reception",
                        "Restaurant",
                    ],
                    "description": "An intimate city escape with considered interiors, comfortable rooms, and a warm local welcome. Start the day slowly over breakfast, then step out into the neighbourhood. Each room is individually bookable, with clear pricing and no online payment required to reserve.",
                },
            )
            if not obj.images.exists():
                for order, idx in enumerate([8+i%3, 1, 2]):
                    PropertyImage.objects.create(
                        property=obj, demo_url=photo(idx), caption=title, order=order
                    )
            PropertyImage.objects.filter(property=obj, order=0, image="").update(demo_url=photo(8+i%3))
            hotel, _ = Hotel.objects.get_or_create(property=obj)
            for j, (kind, capacity, bed) in enumerate(
                [
                    ("Single Room", 1, "Single bed"),
                    ("Double Room", 2, "Queen bed"),
                    ("Twin Room", 2, "Two single beds"),
                    ("Family Room", 4, "Two double beds"),
                    ("Suite", 3, "King bed and sofa bed"),
                ]
            ):
                HotelRoom.objects.get_or_create(
                    hotel=hotel,
                    name=f"{kind} {101+j}",
                    defaults={
                        "room_type": kind,
                        "capacity": capacity,
                        "bed_type": bed,
                        "price": price + j * 35,
                        "amenities": ["Wi-Fi", "Private bathroom", "Air conditioning"],
                        "image_url": photo(8+i%3),
                    },
                )
            Review.objects.get_or_create(
                user=users[3],
                property=obj,
                defaults={
                    "rating": 5,
                    "comment": "Thoughtful touches, comfortable beds, and a genuinely warm welcome.",
                },
            )
        Favorite.objects.get_or_create(user=users[2], property=properties[0])
        conversation, _ = Conversation.objects.get_or_create(
            buyer=users[2], owner=users[0], property=properties[0]
        )
        if not conversation.messages.exists():
            Message.objects.create(
                conversation=conversation,
                sender=users[2],
                content="Hello Sofia! Is the Cedar House available for a viewing this week?",
            )
            Message.objects.create(
                conversation=conversation,
                sender=users[0],
                content="Hello Amara, yes. Please send a viewing request with a date that works for you.",
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Loaded 18 residential listings, 6 hotels, 30 rooms, 4 fictional users, reviews and a conversation."
            )
        )
