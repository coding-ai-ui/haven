import os
from getpass import getpass
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from core.models import User


class Command(BaseCommand):
    help = "Create a local development administrator from environment variables or a secure password prompt."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("This command is only permitted in development mode.")
        email = os.getenv("DEV_ADMIN_EMAIL", "issamelorabi92@gmail.com").lower()
        if User.objects.filter(email=email).exists():
            self.stdout.write("Administrator already exists; password was not changed.")
            return
        password = os.getenv("DEV_ADMIN_PASSWORD") or getpass(
            "Development administrator password: "
        )
        if len(password) < 8:
            raise CommandError("Use at least 8 characters.")
        User.objects.create_superuser(
            username=email,
            email=email,
            password=password,
            first_name="Haven",
            last_name="Admin",
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Development administrator created. Change its password before public deployment."
            )
        )
