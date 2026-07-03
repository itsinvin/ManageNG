#!/usr/bin/env python3
"""Generate ManageNG app icon — minimal car + crash physics motif."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-icon.png"

SIZE = 1024
PAD = 96

# Match src/styles/tokens.css
BG = (18, 20, 26)  # --background
BODY = (240, 235, 227)  # --primary
ACCENT = (201, 162, 39)  # --accent
ACCENT_BRIGHT = (232, 196, 74)
MUTED = (139, 144, 157)  # --muted-foreground


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[float, float, float, float],
    radius: float,
    fill: tuple[int, int, int],
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_car_crash(draw: ImageDraw.ImageDraw, ox: float, oy: float, scale: float) -> None:
    """Side-profile sedan with crumpled front and impact sparks."""
    s = scale

    # Wheels — bold circles read at 32px
    wheel_r = 52 * s
    wheel_y = oy + 188 * s
    front_wheel_x = ox + 248 * s
    rear_wheel_x = ox + 548 * s
    draw.ellipse(
        (front_wheel_x - wheel_r, wheel_y - wheel_r, front_wheel_x + wheel_r, wheel_y + wheel_r),
        fill=BODY,
    )
    draw.ellipse(
        (rear_wheel_x - wheel_r, wheel_y - wheel_r, rear_wheel_x + wheel_r, wheel_y + wheel_r),
        fill=BODY,
    )

    # Body shell — clean silhouette with crumple zone at front-right (impact)
    body = [
        (ox + 120 * s, oy + 188 * s),  # rear bumper bottom
        (ox + 120 * s, oy + 118 * s),  # rear window base
        (ox + 168 * s, oy + 52 * s),  # rear roof
        (ox + 318 * s, oy + 28 * s),  # roof
        (ox + 448 * s, oy + 44 * s),  # windshield top
        (ox + 498 * s, oy + 92 * s),  # hood start
        # crumple zone — jagged deformation
        (ox + 548 * s, oy + 108 * s),
        (ox + 572 * s, oy + 82 * s),
        (ox + 598 * s, oy + 118 * s),
        (ox + 618 * s, oy + 96 * s),
        (ox + 638 * s, oy + 132 * s),
        (ox + 652 * s, oy + 112 * s),
        (ox + 668 * s, oy + 188 * s),  # front bottom
        (ox + 188 * s, oy + 188 * s),  # rocker panel
    ]
    draw.polygon(body, fill=BODY)

    # Window cutout
    window = [
        (ox + 188 * s, oy + 118 * s),
        (ox + 228 * s, oy + 72 * s),
        (ox + 398 * s, oy + 58 * s),
        (ox + 468 * s, oy + 72 * s),
        (ox + 468 * s, oy + 118 * s),
    ]
    draw.polygon(window, fill=BG)

    # Underbody shadow line — subtle depth
    draw.line(
        [(ox + 188 * s, oy + 176 * s), (ox + 620 * s, oy + 176 * s)],
        fill=MUTED,
        width=max(2, int(6 * s)),
    )

    # Impact sparks — accent, bold strokes
    spark_origin = (ox + 662 * s, oy + 98 * s)
    sparks = [
        ((0, 0), (38 * s, -52 * s)),
        ((0, 0), (58 * s, -18 * s)),
        ((0, 0), (44 * s, 28 * s)),
        ((0, 0), (18 * s, -68 * s)),
    ]
    sw = max(3, int(14 * s))
    for start_off, end_off in sparks:
        x0 = spark_origin[0] + start_off[0]
        y0 = spark_origin[1] + start_off[1]
        x1 = spark_origin[0] + end_off[0]
        y1 = spark_origin[1] + end_off[1]
        draw.line([(x0, y0), (x1, y1)], fill=ACCENT_BRIGHT, width=sw)

    # Debris shard — single accent triangle
    shard = [
        (ox + 628 * s, oy + 74 * s),
        (ox + 652 * s, oy + 58 * s),
        (ox + 644 * s, oy + 88 * s),
    ]
    draw.polygon(shard, fill=ACCENT)

    # Motion/deformation hint — short stress lines on hood
    for i, t in enumerate((0.2, 0.45, 0.7)):
        x = lerp(ox + 508 * s, ox + 578 * s, t)
        y0 = oy + 98 * s + i * 8 * s
        draw.line([(x, y0), (x + 22 * s, y0 + 14 * s)], fill=MUTED, width=max(2, int(5 * s)))


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (*BG, 255))
    draw = ImageDraw.Draw(img)

    # Soft vignette — keeps icon from feeling flat
    for y in range(SIZE):
        t = y / (SIZE - 1)
        shade = int(lerp(0, 10, t))
        draw.line([(0, y), (SIZE, y)], fill=(BG[0] + shade, BG[1] + shade, BG[2] + shade))

    draw = ImageDraw.Draw(img)

    # Icon plate with subtle inset
    plate_margin = PAD - 8
    draw_rounded_rect(
        draw,
        (plate_margin, plate_margin, SIZE - plate_margin, SIZE - plate_margin),
        radius=180,
        fill=(15, 17, 23),
    )

    # Car centered on plate
    draw_car_crash(draw, ox=PAD + 24, oy=PAD + 130, scale=1.0)

    img.save(OUT, "PNG")
    print(f"Wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
