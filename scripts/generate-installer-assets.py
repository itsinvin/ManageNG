#!/usr/bin/env python3
"""Generate NSIS installer banner images for ManageNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "installer"
ICON = ROOT / "app-icon.png"

BG = (20, 20, 24)
ORANGE = (255, 102, 0)
TEXT = (240, 240, 242)
MUTED = (140, 140, 148)


def paste_icon(img: Image.Image, cx: int, cy: int, height: int) -> None:
    if not ICON.exists():
        return
    icon = Image.open(ICON).convert("RGBA")
    bbox = icon.getbbox()
    if not bbox:
        return
    cropped = icon.crop(bbox)
    scale = height / cropped.height
    size = (max(1, int(cropped.width * scale)), height)
    scaled = cropped.resize(size, Image.Resampling.LANCZOS)
    img.paste(scaled, (cx - size[0] // 2, cy - size[1] // 2), scaled)


def make_sidebar() -> None:
    img = Image.new("RGB", (164, 314), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 4, 314), fill=ORANGE)
    paste_icon(img, 82, 108, 96)
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
    img = Image.new("RGB", (150, 57), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 150, 3), fill=ORANGE)
    paste_icon(img, 28, 28, 40)
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
