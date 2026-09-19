#!/usr/bin/env python3
"""Generate launcher icons (adaptive foreground + legacy full icons)."""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "res")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def gradient(size, c1, c2):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)
    return img


def draw_cards(size, scale):
    """Three stacked cards with 'Aa' on the front; drawn at high res then downsampled."""
    S = 4  # supersample
    W = int(size * S)
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cw, ch = W * 0.50 * scale, W * 0.36 * scale
    cx, cy = W / 2, W / 2
    r = int(W * 0.045 * scale)
    offs = [(-0.07, 0.07, 120), (-0.035, 0.035, 190), (0.0, 0.0, 255)]
    for dx, dy, a in offs:
        x0 = cx - cw / 2 + dx * W * scale
        y0 = cy - ch / 2 + dy * W * scale
        d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=r, fill=(255, 255, 255, a))
    # text on front card
    font = ImageFont.truetype(FONT, int(ch * 0.55))
    txt = "Aa"
    bbox = d.textbbox((0, 0), txt, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), txt, font=font, fill=(79, 70, 229, 255))
    return img.resize((size, size), Image.LANCZOS)


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


C1, C2 = (79, 70, 229), (124, 58, 237)

for name, mult in DENS.items():
    # adaptive foreground: 108dp canvas, content in the 66dp safe zone
    fg_size = int(108 * mult)
    fg = draw_cards(fg_size, 0.62)
    d = os.path.join(RES, f"drawable-{name}")
    os.makedirs(d, exist_ok=True)
    fg.save(os.path.join(d, "ic_launcher_foreground.png"))

    # legacy icon: 48dp, rounded square with gradient
    lg_size = int(48 * mult)
    bg = gradient(lg_size, C1, C2)
    cards = draw_cards(lg_size, 0.95)
    bg.alpha_composite(cards)
    bg.putalpha(rounded_mask(lg_size, int(lg_size * 0.2)))
    m = os.path.join(RES, f"mipmap-{name}")
    os.makedirs(m, exist_ok=True)
    bg.save(os.path.join(m, "ic_launcher.png"))

# preview for inspection
prev = gradient(512, C1, C2)
prev.alpha_composite(draw_cards(512, 0.95))
prev.putalpha(rounded_mask(512, 100))
os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
prev.save(os.path.join(ROOT, "build", "icon_preview.png"))
print("icons written")
