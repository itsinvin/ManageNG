#!/usr/bin/env python3
"""Generate ManageNG app icon — minimal BeamNG-orange car + crash physics."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-icon.png"

SIZE = 1024

# BeamNG-inspired palette (flat, no gradients)
BG = (20, 20, 24)
ORANGE = (255, 102, 0)
ORANGE_LIGHT = (255, 140, 48)


def draw_car_crash(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float) -> None:
    """Angular side-profile car centered on (cx, cy)."""
    s = scale

    # Wheels — dark cutouts for contrast at small sizes
    wheel_r = 46 * s
    wheel_y = cy + 72 * s
    for wx in (cx - 118 * s, cx + 118 * s):
        draw.ellipse(
            (wx - wheel_r, wheel_y - wheel_r, wx + wheel_r, wheel_y + wheel_r),
            fill=BG,
        )

    # Body — bold angular silhouette, crumpled front (right)
    body = [
        (cx - 248 * s, cy + 72 * s),
        (cx - 248 * s, cy + 8 * s),
        (cx - 198 * s, cy - 52 * s),
        (cx - 38 * s, cy - 72 * s),
        (cx + 88 * s, cy - 64 * s),
        (cx + 148 * s, cy - 28 * s),
        (cx + 178 * s, cy + 8 * s),
        # crumple zone
        (cx + 208 * s, cy + 4 * s),
        (cx + 224 * s, cy - 24 * s),
        (cx + 242 * s, cy + 10 * s),
        (cx + 258 * s, cy - 12 * s),
        (cx + 272 * s, cy + 18 * s),
        (cx + 286 * s, cy - 4 * s),
        (cx + 298 * s, cy + 72 * s),
        (cx - 188 * s, cy + 72 * s),
    ]
    draw.polygon(body, fill=ORANGE)

    # Window — dark negative space
    window = [
        (cx - 168 * s, cy + 8 * s),
        (cx - 128 * s, cy - 38 * s),
        (cx + 28 * s, cy - 48 * s),
        (cx + 88 * s, cy - 38 * s),
        (cx + 88 * s, cy + 8 * s),
    ]
    draw.polygon(window, fill=BG)

    # Impact sparks — lighter orange, minimal
    origin = (cx + 292 * s, cy - 8 * s)
    sw = max(3, int(12 * s))
    for dx, dy in ((34 * s, -40 * s), (48 * s, -8 * s), (36 * s, 24 * s)):
        draw.line(
            [(origin[0], origin[1]), (origin[0] + dx, origin[1] + dy)],
            fill=ORANGE_LIGHT,
            width=sw,
        )


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (*BG, 255))
    draw = ImageDraw.Draw(img)
    draw_car_crash(draw, cx=SIZE / 2, cy=SIZE / 2 - 16, scale=1.35)
    img.save(OUT, "PNG")
    print(f"Wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
