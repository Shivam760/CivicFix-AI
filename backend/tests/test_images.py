import io

import pytest
from PIL import Image

from app.services.images import UnsupportedImage, clean_image

ORIENTATION = 0x0112  # EXIF tag: how the photo should be rotated for display
CAMERA_MAKE = 0x010F  # EXIF tag: camera maker


def make_image(fmt="JPEG", size=(40, 20), mode="RGB", exif=None) -> bytes:
    """A small solid-colour image in the given format, optionally with EXIF tags."""
    image = Image.new(mode, size, "red")
    output = io.BytesIO()
    kwargs = {}
    if exif:
        tags = Image.Exif()
        tags.update(exif)
        kwargs["exif"] = tags.tobytes()
    image.save(output, format=fmt, **kwargs)
    return output.getvalue()


def open_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


@pytest.mark.parametrize(
    ("fmt", "content_type", "extension"),
    [("JPEG", "image/jpeg", "jpg"), ("PNG", "image/png", "png"), ("WEBP", "image/webp", "webp")],
)
def test_allowed_formats_accepted(fmt, content_type, extension):
    result = clean_image(make_image(fmt))

    assert result.content_type == content_type
    assert result.extension == extension
    assert open_image(result.data).format == fmt


@pytest.mark.parametrize("fmt", ["JPEG", "PNG", "WEBP"])
def test_metadata_removed(fmt):
    original = make_image(fmt, exif={CAMERA_MAKE: "SpyCam"})
    assert open_image(original).getexif()  # the test image really has EXIF

    result = clean_image(original)

    assert not open_image(result.data).getexif()
    assert b"SpyCam" not in result.data


def test_sideways_photo_rotated_upright():
    # Orientation 6: the camera was turned; display after rotating 90 degrees.
    result = clean_image(make_image("JPEG", size=(40, 20), exif={ORIENTATION: 6}))

    assert open_image(result.data).size == (20, 40)


def test_transparent_png_stays_png():
    result = clean_image(make_image("PNG", mode="RGBA"))

    assert open_image(result.data).mode == "RGBA"


@pytest.mark.parametrize(
    "data",
    [
        b"",
        b"definitely not an image",
        b"%PDF-1.7 pretending to be a photo",
    ],
)
def test_non_images_rejected(data):
    with pytest.raises(UnsupportedImage):
        clean_image(data)


def test_other_image_formats_rejected():
    with pytest.raises(UnsupportedImage, match="GIF"):
        clean_image(make_image("GIF", mode="P"))


def test_cut_off_image_rejected():
    data = make_image("JPEG", size=(200, 200))

    with pytest.raises(UnsupportedImage):
        clean_image(data[: len(data) // 2])


def test_huge_pixel_count_rejected(monkeypatch):
    # Lower the limit instead of building a real 50-megapixel image.
    monkeypatch.setattr("app.services.images.MAX_PIXELS", 100)

    with pytest.raises(UnsupportedImage, match="too many pixels"):
        clean_image(make_image("PNG", size=(20, 20)))
