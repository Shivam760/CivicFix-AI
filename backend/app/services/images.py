"""Checking and cleaning uploaded photos (database-schema.md section 11).

The uploaded file name and content type are never trusted: Pillow decodes the
image to find out what it really is. The stored copy is re-encoded without
metadata, so EXIF data such as the GPS location where the photo was taken is
never stored.
"""

import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB

# A small file can decode into a huge image (a "decompression bomb") and use
# up all memory. 50 megapixels still fits any phone camera.
MAX_PIXELS = 50_000_000

# Pillow's format name -> (content type, file extension)
ALLOWED_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


class UnsupportedImage(Exception):
    """The upload is not a valid JPEG, PNG, or WebP image."""


@dataclass
class CleanImage:
    data: bytes
    content_type: str
    extension: str


def clean_image(data: bytes) -> CleanImage:
    """Check that data is an allowed image and return a copy without metadata."""
    try:
        image = Image.open(io.BytesIO(data))  # reads only the header
        if image.format not in ALLOWED_FORMATS:
            raise UnsupportedImage(f"Format {image.format} is not allowed.")
        if image.width * image.height > MAX_PIXELS:
            raise UnsupportedImage("The image has too many pixels.")
        image.load()  # decodes all pixels; fails for broken or cut-off files
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise UnsupportedImage("The file is not a valid image.") from exc

    content_type, extension = ALLOWED_FORMATS[image.format]
    image_format = image.format

    # Phones often save photos sideways plus an EXIF "rotate me" note. Rotate the
    # pixels now, because the note is removed with the rest of the metadata.
    image = ImageOps.exif_transpose(image)
    # Pillow writes only the metadata it finds in info (EXIF, XMP, ...), so
    # emptying it means none of that is saved.
    image.info = {}

    if image_format == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")  # JPEG can't store transparency, for example

    output = io.BytesIO()
    if image_format == "PNG":
        image.save(output, format="PNG")
    else:
        image.save(output, format=image_format, quality=90)
    return CleanImage(output.getvalue(), content_type, extension)
