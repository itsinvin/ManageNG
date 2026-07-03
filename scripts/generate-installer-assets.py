#!/usr/bin/env python3
"""Generate NSIS installer banner images for ManageNG."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "installer"

BG = (20, 20, 24)
ACCENT = (255, 102, 0)
ACCENT_DIM = (180, 70, 0)
TEXT = (240, 240, 242)
MUTED = (140, 140, 148)


def gradient_rect(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(BG[0] + (28 - BG[0]) * t)
        g = int(BG[1] + (28 - BG[1]) * t)
        b = int(BG[2] + (34 - BG[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def draw_m_logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    points = [
        (cx - 40 * s, cy + 30 * s),
        (cx - 40 * s, cy - 30 * s),
        (cx - 10 * s, cy + 5 * s),
        (cx + 10 * s, cy - 30 * s),
        (cx + 40 * s, cy - 30 * s),
        (cx + 40 * s, cy + 30 * s),
        (cx + 22 * s, cy + 30 * s),
        (cx + 22 * s, cy - 5 * s),
        (cx, cy + 18 * s),
        (cx - 22 * s, cy - 5 * s),
        (cx - 22 * s, cy + 30 * s),
    ]
    draw.polygon(points, fill=ACCENT)
    # gear hint on lower-right leg
    gx, gy = cx + 28 * s, cy + 18 * s
    gr = 8 * s
    draw.ellipse((gx - gr, gy - gr, gx + gr, gy + gr), fill=ACCENT_DIM, outline=ACCENT)


def make_sidebar() -> None:
    # NSIS recommended: 164 x 314
    img = gradient_rect((164, 314))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 6, 314), fill=ACCENT)
    draw_m_logo(draw, 82, 110, 0.85)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((82, 200), "ManageNG", fill=TEXT, font=font, anchor="mm")
    draw.text((82, 222), "Mod Manager", fill=MUTED, font=small, anchor="mm")
    draw.text((82, 280), "BeamNG.drive", fill=ACCENT, font=small, anchor="mm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-sidebar.bmp")


def make_header() -> None:
    # NSIS recommended: 150 x 57
    img = gradient_rect((150, 57))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 150, 3), fill=ACCENT)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    draw.text((12, 28), "Manage", fill=TEXT, font=font, anchor="lm")
    draw.text((78, 28), "NG", fill=ACCENT, font=font, anchor="lm")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "nsis-header.bmp")


if __name__ == "__main__":
    make_sidebar()
    make_header()
    print(f"Installer assets written to {OUT}")
