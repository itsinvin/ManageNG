#!/usr/bin/env python3
"""Generate NSIS installer banner images for ManageNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "installer"

BG = (20, 20, 24)
ORANGE = (255, 102, 0)
ORANGE_LIGHT = (255, 140, 48)
TEXT = (240, 240, 242)
MUTED = (140, 140, 148)


def gradient_rect(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGB", size, BG)


def draw_car_crash_small(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale

    wheel_r = 10 * s
    wheel_y = cy + 16 * s
    for wx in (cx - 26 * s, cx + 26 * s):
        draw.ellipse(
            (wx - wheel_r, wheel_y - wheel_r, wx + wheel_r, wheel_y + wheel_r),
            fill=BG,
        )

    body = [
        (cx - 56 * s, cy + 16 * s),
        (cx - 56 * s, cy + 2 * s),
        (cx - 44 * s, cy - 12 * s),
        (cx - 8 * s, cy - 18 * s),
        (cx + 20 * s, cy - 16 * s),
        (cx + 34 * s, cy - 6 * s),
        (cx + 42 * s, cy + 2 * s),
        (cx + 48 * s, cy + 0 * s),
        (cx + 52 * s, cy - 6 * s),
        (cx + 56 * s, cy + 4 * s),
        (cx + 60 * s, cy - 2 * s),
        (cx + 64 * s, cy + 6 * s),
        (cx + 68 * s, cy + 0 * s),
        (cx + 70 * s, cy + 16 * s),
        (cx - 42 * s, cy + 16 * s),
    ]
    draw.polygon(body, fill=ORANGE)

    window = [
        (cx - 38 * s, cy + 2 * s),
        (cx - 28 * s, cy - 10 * s),
        (cx + 6 * s, cy - 12 * s),
        (cx + 22 * s, cy - 10 * s),
        (cx + 22 * s, cy + 2 * s),
    ]
    draw.polygon(window, fill=BG)

    origin = (cx + 68 * s, cy - 2 * s)
    sw = max(2, int(3 * s))
    for dx, dy in ((8 * s, -10 * s), (12 * s, -2 * s), (10 * s, 6 * s)):
        draw.line([(origin[0], origin[1]), (origin[0] + dx, origin[1] + dy)], fill=ORANGE_LIGHT, width=sw)


def make_sidebar() -> None:
    img = gradient_rect((164, 314))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 4, 314), fill=ORANGE)
    draw_car_crash_small(draw, 82, 108, 0.78)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((82, 188), "ManageNG", fill=TEXT, font=font, anchor="mm")
    draw.text((82, 208), "Mod Manager", fill=MUTED, font=small, anchor="mm")
    draw.text((82, 278), "BeamNG.drive", fill=ORANGE, font=small, anchor="mm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-sidebar.bmp")


def make_header() -> None:
    img = gradient_rect((150, 57))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 150, 3), fill=ORANGE)
    draw_car_crash_small(draw, 28, 28, 0.42)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    draw.text((52, 28), "Manage", fill=TEXT, font=font, anchor="lm")
    draw.text((118, 28), "NG", fill=ORANGE, font=font, anchor="lm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-header.bmp")


if __name__ == "__main__":
    make_sidebar()
    make_header()
    print(f"Installer assets written to {OUT}")
