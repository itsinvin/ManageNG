#!/usr/bin/env python3
"""Generate ManageNG app icon — angular M with engine motif."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-icon.png"
SOURCE = ROOT / "scripts" / "assets" / "m-engine-icon-base.png"

SIZE = 1024
BG = (20, 20, 24)


def flatten_background(src: Image.Image) -> Image.Image:
    """Normalize to flat dark background while keeping the orange M + engine."""
    src = src.convert("RGBA")
    out = Image.new("RGBA", src.size, (*BG, 255))
    sw, sh = src.size

    for y in range(sh):
        for x in range(sw):
            r, g, b, a = src.getpixel((x, y))
            if a < 20:
                continue
            # Keep orange logo pixels; flatten textured dark areas to BG
            if r > 90 and g > 45 and b < 80 and r > g:
                out.putpixel((x, y), (r, g, b, 255))
            elif r > 40 or g > 30:
                # Engine cutout / dark detail inside the M
                lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
                if lum < 55:
                    out.putpixel((x, y), (12, 12, 16, 255))

    return out


def center_on_canvas(icon: Image.Image, size: int = SIZE) -> Image.Image:
    bbox = icon.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size), (*BG, 255))

    cropped = icon.crop(bbox)
    cw, ch = cropped.size
    scale = min((size * 0.88) / cw, (size * 0.88) / ch)
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
    processed = flatten_background(src)
    final = center_on_canvas(processed)
    final.save(OUT, "PNG")
    print(f"Wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
