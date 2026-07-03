#!/usr/bin/env python3
"""Generate ManageNG app icon from the original car artwork."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-icon.png"
SOURCE = ROOT / "scripts" / "assets" / "car-icon-base.png"

SIZE = 1024
BG = (20, 20, 24)
ORANGE = (255, 102, 0)
ORANGE_LIGHT = (255, 158, 48)


def lum(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def recolor_icon(src: Image.Image) -> Image.Image:
    src = src.convert("RGBA")
    out = Image.new("RGBA", src.size, (*BG, 255))
    sw, sh = src.size

    for y in range(sh):
        for x in range(sw):
            r, g, b, a = src.getpixel((x, y))
            if a < 16:
                continue

            l = lum(r, g, b)
            warmth = r - b

            # Gold impact sparks / debris
            if r > 170 and g > 130 and b < 110 and l > 120:
                out.putpixel((x, y), (*ORANGE_LIGHT, 255))
                continue

            # Car body — cream / white pixels
            if l > 145 and warmth > -20:
                out.putpixel((x, y), (*ORANGE, 255))
                continue

            # Subtle interior lines on the original — drop them for a cleaner look
            if l > 95 and l <= 145:
                continue

    return out


def center_on_canvas(icon: Image.Image, size: int = SIZE) -> Image.Image:
    bbox = icon.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size), (*BG, 255))

    cropped = icon.crop(bbox)
    cw, ch = cropped.size
    scale = min((size * 0.72) / cw, (size * 0.72) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (*BG, 255))
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing base artwork: {SOURCE}")

    src = Image.open(SOURCE)
    recolored = recolor_icon(src)
    final = center_on_canvas(recolored)
    final.save(OUT, "PNG")
    print(f"Wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
