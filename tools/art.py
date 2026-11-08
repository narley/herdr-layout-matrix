#!/usr/bin/env python3
"""Static digital-rain backdrops for the Matrix Herdr layout (the live rain is in the mods).
  mods/matrix-chrome/rain-backdrop.png   behind terminals (kept dark: text sits on it)
  mods/matrix-chrome/rain-sidebar.png    behind the sidebar lists
Glyphs are mirrored half-width katakana and digits, rendered with a system CJK font."""
import random, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = sys.argv[1]
FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789Z:=*+<>"


def glyph_tiles(size):
    font = ImageFont.truetype(FONT, size)
    tiles = []
    for ch in GLYPHS:
        im = Image.new("L", (size + 4, size + 4), 0)
        ImageDraw.Draw(im).text((2, 0), ch, font=font, fill=255)
        tiles.append(ImageOps.mirror(im) if ch not in "0123456789" else im)
    return tiles


def rain(w, h, size, seed, bright, density):
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), (0, 4, 2))
    tiles = glyph_tiles(size)
    step = size + 2
    for x in range(0, w, step):
        if rnd.random() > density:
            continue
        # one or two drops per column, each a bright head with a fading tail
        for _ in range(rnd.choice((1, 1, 2))):
            head = rnd.randint(0, h // step + 10)
            length = rnd.randint(6, 26)
            for k in range(length):
                y = (head - k) * step
                if y < -step or y > h:
                    continue
                f = 1 - k / length
                if k == 0:
                    col = tuple(int(v * bright) for v in (200, 255, 210))
                else:
                    col = (0, int(255 * bright * (0.25 + 0.75 * f) * f), int(65 * bright * f))
                tile = rnd.choice(tiles)
                img.paste(Image.new("RGB", tile.size, col), (x, y), tile)
    return img


os.makedirs(os.path.join(OUT, "mods/matrix-chrome"), exist_ok=True)
rain(1920, 1200, 22, 101, 0.42, 0.75).save(os.path.join(OUT, "mods/matrix-chrome/rain-backdrop.png"), optimize=True)
rain(560, 2000, 20, 202, 0.30, 0.8).save(os.path.join(OUT, "mods/matrix-chrome/rain-sidebar.png"), optimize=True)
