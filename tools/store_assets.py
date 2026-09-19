#!/usr/bin/env python3
"""Google Play store graphics: 512x512 icon (full square) + 1024x500 feature graphic."""
from PIL import Image, ImageDraw, ImageFont
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_icons import gradient, draw_cards, C1, C2  # reuse icon drawing

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build", "store")
os.makedirs(OUT, exist_ok=True)

CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"   # index 2 = KR? use font index by name lookup
def cjk(size, weight="Bold"):
    path = f"/usr/share/fonts/opentype/noto/NotoSansCJK-{weight}.ttc"
    # collection index for the KR face: try indices until name says KR
    for idx in range(0, 10):
        try:
            f = ImageFont.truetype(path, size, index=idx)
            fam = f.getname()[0]
            if "KR" in fam:
                return f
        except Exception:
            break
    return ImageFont.truetype(path, size)

# 1) hi-res icon 512x512, full bleed (Play applies its own mask)
icon = gradient(512, C1, C2)
icon.alpha_composite(draw_cards(512, 0.95))
icon.convert("RGB").save(os.path.join(OUT, "icon_512.png"))

# 2) feature graphic 1024x500
W, H = 1024, 500
fg = Image.new("RGB", (W, H))
px = fg.load()
for y in range(H):
    for x in range(W):
        t = (x / W) * 0.7 + (y / H) * 0.3
        px[x, y] = tuple(int(C1[i] + (C2[i] - C1[i]) * t) for i in range(3))
d = ImageDraw.Draw(fg)
# soft circles for depth
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(ov)
od.ellipse([700, -120, 1150, 330], fill=(255, 255, 255, 28))
od.ellipse([-80, 300, 260, 640], fill=(255, 255, 255, 22))
fg = Image.alpha_composite(fg.convert("RGBA"), ov)
d = ImageDraw.Draw(fg)

title_f = cjk(84, "Black")
sub_f = cjk(30, "Medium")
tag_f = cjk(24, "Bold")
d.text((64, 118), "3단계 단어장", font=title_f, fill=(255, 255, 255, 255))
d.text((68, 232), "예문으로 외우는 영어 · 하루 20단어", font=sub_f, fill=(236, 233, 255, 255))
# stage pills
x = 68
for label, col in [("1단계 새 단어장", (59, 130, 246)), ("2단계 외운 단어장", (139, 92, 246)), ("3단계 완전 암기장", (16, 185, 129))]:
    bbox = d.textbbox((0, 0), label, font=tag_f)
    tw = bbox[2] - bbox[0]
    d.rounded_rectangle([x, 300, x + tw + 36, 348], radius=24, fill=(255, 255, 255, 235))
    d.text((x + 18, 306), label, font=tag_f, fill=col)
    x += tw + 36 + 14
# card stack illustration on the right
cards = draw_cards(420, 1.0)
fg.alpha_composite(cards, (620, 40))
fg.convert("RGB").save(os.path.join(OUT, "feature_graphic_1024x500.png"))
print("store graphics written to", OUT)
