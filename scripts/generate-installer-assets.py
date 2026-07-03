#!/usr/bin/env python3
"""Generate NSIS installer banner images for ManageNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "installer"

BG = (18, 20, 26)
PLATE = (15, 17, 23)
ACCENT = (201, 162, 39)
ACCENT_BRIGHT = (232, 196, 74)
TEXT = (240, 235, 227)
MUTED = (139, 144, 157)
BODY = (240, 235, 227)


def gradient_rect(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(BG[0] + (24 - BG[0]) * t)
        g = int(BG[1] + (26 - BG[1]) * t)
        b = int(BG[2] + (32 - BG[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def draw_car_crash_small(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    """Compact car + crash icon for installer banners."""
    s = scale
    ox = cx - 70 * s
    oy = cy - 36 * s

    wheel_r = 10 * s
    wheel_y = oy + 36 * s
    draw.ellipse(
        (ox + 48 * s - wheel_r, wheel_y - wheel_r, ox + 48 * s + wheel_r, wheel_y + wheel_r),
        fill=BODY,
    )
    draw.ellipse(
        (ox + 106 * s - wheel_r, wheel_y - wheel_r, ox + 106 * s + wheel_r, wheel_y + wheel_r),
        fill=BODY,
    )

    body = [
        (ox + 24 * s, oy + 36 * s),
        (ox + 24 * s, oy + 22 * s),
        (ox + 34 * s, oy + 10 * s),
        (ox + 62 * s, oy + 5 * s),
        (ox + 86 * s, oy + 6 * s),
        (ox + 96 * s, oy + 12 * s),
        (ox + 106 * s, oy + 18 * s),
        (ox + 112 * s, oy + 14 * s),
        (ox + 118 * s, oy + 20 * s),
        (ox + 124 * s, oy + 16 * s),
        (ox + 128 * s, oy + 24 * s),
        (ox + 132 * s, oy + 20 * s),
        (ox + 136 * s, oy + 36 * s),
        (ox + 38 * s, oy + 36 * s),
    ]
    draw.polygon(body, fill=BODY)

    window = [
        (ox + 38 * s, oy + 22 * s),
        (ox + 46 * s, oy + 12 * s),
        (ox + 78 * s, oy + 10 * s),
        (ox + 92 * s, oy + 12 * s),
        (ox + 92 * s, oy + 22 * s),
    ]
    draw.polygon(window, fill=BG)

    origin = (ox + 134 * s, oy + 16 * s)
    sw = max(2, int(3 * s))
    for dx, dy in ((12 * s, -16 * s), (18 * s, -6 * s), (14 * s, 8 * s)):
        draw.line(
            [(origin[0], origin[1]), (origin[0] + dx, origin[1] + dy)],
            fill=ACCENT_BRIGHT,
            width=sw,
        )
    draw.polygon(
        [
            (ox + 126 * s, oy + 12 * s),
            (ox + 132 * s, oy + 8 * s),
            (ox + 130 * s, oy + 16 * s),
        ],
        fill=ACCENT,
    )


def make_sidebar() -> None:
    img = gradient_rect((164, 314))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 4, 314), fill=ACCENT)
    draw.rounded_rectangle((28, 48, 136, 156), radius=16, fill=PLATE)
    draw_car_crash_small(draw, 82, 102, 0.72)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((82, 188), "ManageNG", fill=TEXT, font=font, anchor="mm")
    draw.text((82, 208), "Mod Manager", fill=MUTED, font=small, anchor="mm")
    draw.text((82, 278), "BeamNG.drive", fill=ACCENT, font=small, anchor="mm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-sidebar.bmp")


def make_header() -> None:
    img = gradient_rect((150, 57))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 150, 3), fill=ACCENT)
    draw_car_crash_small(draw, 28, 28, 0.38)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    draw.text((52, 28), "Manage", fill=TEXT, font=font, anchor="lm")
    draw.text((118, 28), "NG", fill=ACCENT, font=font, anchor="lm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-header.bmp")


if __name__ == "__main__":
    make_sidebar()
    make_header()
    print(f"Installer assets written to {OUT}")
