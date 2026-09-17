import uuid
from pathlib import Path
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from PIL import Image


@deconstructible
class PrivateStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_ROOT, base_url=None)

    def url(self, name):
        raise ValueError("Identity documents have no public URL.")


def private_path(instance, filename):
    return f"{instance.user_id}/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


def public_path(instance, filename):
    return f"listings/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


def validate_image(file):
    if file.size > 5 * 1024 * 1024:
        raise ValidationError("Images must be 5 MB or smaller.")
    if Path(file.name).suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise ValidationError("Use a JPG, PNG, or WebP image.")
    try:
        im = Image.open(file)
        if im.format not in ["JPEG", "PNG", "WEBP"] or im.width * im.height > 25000000:
            raise ValueError()
        im.verify()
    except Exception:
        raise ValidationError("Upload a valid image smaller than 25 megapixels.")
    finally:
        file.seek(0)
