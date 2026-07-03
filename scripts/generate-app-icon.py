#!/usr/bin/env python3
"""Generate ManageNG app icon — flat angular M with engine motif."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-icon.png"
SOURCE = ROOT / "scripts" / "assets" / "m-engine-icon-base.png"

SIZE = 1024
BG = (20, 20, 24)
ORANGE = (255, 102, 0)


def lum(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def classify_pixel(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Map source pixels to a flat two-tone palette (+ cutout)."""
    if r > 90 and g > 45 and b < 90 and r > g and lum(r, g, b) > 70:
        return ORANGE
    return BG


def flatten_icon(src: Image.Image) -> Image.Image:
    src = src.convert("RGB")
    out = Image.new("RGB", src.size, BG)
    for y in range(src.height):
        for x in range(src.width):
            out.putpixel((x, y), classify_pixel(*src.getpixel((x, y))))
    return out


def center_on_canvas(icon: Image.Image, size: int = SIZE) -> Image.Image:
    bbox = icon.getbbox()
    if not bbox:
        return Image.new("RGB", (size, size), BG)

    cropped = icon.crop(bbox)
    cw, ch = cropped.size
    scale = min((size * 0.88) / cw, (size * 0.88) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.NEAREST)

    canvas = Image.new("RGB", (size, size), BG)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy))

    # Re-quantize after scaling so edges stay perfectly flat
    flat = Image.new("RGB", (size, size), BG)
    for y in range(size):
        for x in range(size):
            flat.putpixel((x, y), classify_pixel(*canvas.getpixel((x, y))))
    return flat


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing base artwork: {SOURCE}")

    src = Image.open(SOURCE)
    processed = flatten_icon(src)
    final = center_on_canvas(processed)
    final.save(OUT, "PNG")
    print(f"Wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
