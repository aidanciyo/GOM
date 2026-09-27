#!/usr/bin/env python3
"""Icono de la app: GOM sonriente con una porcion de pizza en la boca sobre una
explosion de rayos de atardecer, en pixel art.

Genera:
  - icono adaptativo (Android 8+): fondo + primer plano + monocromo (Android 13+)
  - icono clasico para Android 5-7 (cuadrado redondeado con borde)
  - docs/icono/ (512 px para tiendas y vista previa)

Uso:  python3 tools/make_icons.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

import extract_sprites as ex

ROOT = ex.ROOT
RES = os.path.join(ROOT, 'android', 'res')
N = 216                       # lienzo de diseno: 108 dp x 2
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
INK = (20, 12, 30, 255)

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


# ------------------------------------------------------------------ fondo
def background():
    """Rayos de sol pixelados con tramado sobre degradado radial + skyline."""
    stops = [(0.0, hexc('#fff2a8')), (0.22, hexc('#ffc94a')), (0.45, hexc('#ff8a3a')),
             (0.68, hexc('#e8485a')), (0.86, hexc('#8a2a6a')), (1.0, hexc('#2a1244'))]

    def grad(t):
        t = min(1.0, max(0.0, t))
        for i in range(len(stops) - 1):
            a, b = stops[i], stops[i + 1]
            if a[0] <= t <= b[0]:
                return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]))
        return stops[-1][1]

    img = np.zeros((N, N, 4), np.uint8)
    cx, cy = N / 2, N * 0.56
    rays = 16
    for y in range(N):
        for x in range(N):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy) / (N * 0.78)
            ang = (math.atan2(dy, dx) + math.pi) / (2 * math.pi) * rays + 0.25
            ray = (int(ang * 2) % 2) == 0
            # bandas cuantizadas con tramado ordenado
            bands = 9
            tq = r * bands + (BAYER[y % 4, x % 4] - 0.5) * 0.9
            t = math.floor(tq) / bands
            c = grad(t)
            if ray:
                c = lerp(c, (255, 244, 200, 255), 0.22 * max(0.0, 1 - r))
            img[y, x] = c
    im = Image.fromarray(img, 'RGBA')
    d = ImageDraw.Draw(im)
    # skyline de la ciudad en el horizonte
    rng = np.random.RandomState(7)
    x = 0
    base = int(N * 0.8)
    while x < N:
        w = int(rng.randint(10, 22))
        h = int(rng.randint(10, 34))
        col = (42, 18, 58, 255) if rng.rand() < 0.5 else (58, 24, 72, 255)
        d.rectangle([x, base - h, x + w, N], fill=col)
        for wy in range(base - h + 3, N - 2, 5):
            for wx in range(x + 2, x + w - 2, 4):
                if rng.rand() < 0.28:
                    d.rectangle([wx, wy, wx + 1, wy + 1], fill=(255, 214, 110, 255))
        x += w + int(rng.randint(0, 3))
    d.rectangle([0, base + 18, N, N], fill=(30, 12, 44, 255))
    # lineas de velocidad
    for y0, x0, ln in [(62, 10, 34), (80, 4, 26), (140, 8, 30), (156, 16, 22)]:
        d.rectangle([x0, y0, x0 + ln, y0 + 1], fill=(255, 246, 210, 200))
    return im


# ------------------------------------------------------------------ primer plano
def head_sprite():
    a = np.array(Image.open(os.path.join(ex.SRC, 'hoja_sprites_a.webp')).convert('RGBA'))
    src = a[294:432, 1310:1412]
    arr = ex.trim(ex.remove_bg(src))
    arr = ex.downscale(arr, 67)          # pixel art de verdad
    arr = ex.boost(arr, 1.12, 1.06)
    return Image.fromarray(arr, 'RGBA')


def slice_sprite():
    b = np.array(Image.open(os.path.join(ex.SRC, 'hoja_sprites_b.webp')).convert('RGBA'))
    src = b[353:472, 477:601]
    arr = ex.trim(ex.remove_bg(src))
    arr = ex.downscale(arr, 21)
    arr = ex.boost(arr, 1.1, 1.05)
    return Image.fromarray(arr, 'RGBA')


def outline(im, px, color=INK):
    a = np.array(im)
    mask = a[:, :, 3] > 0
    from scipy import ndimage as ndi
    grown = ndi.binary_dilation(mask, iterations=px, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    out = np.zeros_like(a)
    out[grown] = color
    out[mask] = a[mask]
    return Image.fromarray(out, 'RGBA')


def foreground():
    head = head_sprite()                     # ~46x62 px de arte
    sl = slice_sprite().rotate(-28, resample=Image.NEAREST, expand=True)
    # compone en resolucion de arte y luego escala x2 (pixeles de 2x2)
    art = Image.new('RGBA', (N // 2, N // 2), (0, 0, 0, 0))
    hx = (N // 2 - head.width) // 2 + 2
    hy = 16
    art.alpha_composite(head, (hx, hy))
    # porcion mordida: la punta entra en la boca abierta
    mx, my = hx + int(head.width * 0.80), hy + int(head.height * 0.47)
    art.alpha_composite(sl, (mx - 3, my - 4))
    art = outline(art, 1).copy()
    # brillo en las gafas
    px = art.load()
    for (x, y) in [(hx + 27, hy + 23), (hx + 28, hy + 22), (hx + 36, hy + 23)]:
        if 0 <= x < art.width and 0 <= y < art.height and px[x, y][3] > 0:
            px[x, y] = (255, 255, 255, 255)
    fg = art.resize((N, N), Image.NEAREST)
    # sombra suave desplazada para despegar del fondo
    sh = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    alpha = np.array(fg)[:, :, 3]
    shadow = np.zeros((N, N, 4), np.uint8)
    shadow[:, :, 3] = (alpha > 0) * 110
    sh = Image.fromarray(shadow, 'RGBA')
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    out.alpha_composite(sh, (4, 5))
    out.alpha_composite(fg)
    return out, fg


def monochrome(fg):
    a = np.array(fg)
    m = np.zeros_like(a)
    m[:, :, :3] = 255
    m[:, :, 3] = (a[:, :, 3] > 0) * 255
    return Image.fromarray(m, 'RGBA')


def legacy(bg, fg):
    """Icono clasico: cuadrado redondeado con borde dorado (el contenido cabe en 48 dp)."""
    big = 432
    base = bg.resize((big, big), Image.NEAREST)
    # el primer plano adaptativo tiene margen (108 dp): se amplia para llenar el icono
    f = fg.resize((int(big * 1.3), int(big * 1.3)), Image.NEAREST)
    off = (big - f.width) // 2
    canvas = base.copy()
    canvas.alpha_composite(f, (off, off + 6))
    mask = Image.new('L', (big, big), 0)
    r = int(big * 0.2)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=r, fill=255)
    out = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    d = ImageDraw.Draw(out)
    d.rounded_rectangle([3, 3, big - 4, big - 4], radius=r, outline=(20, 12, 30, 255), width=10)
    d.rounded_rectangle([8, 8, big - 9, big - 9], radius=r - 6, outline=(255, 200, 40, 255), width=8)
    return out


def save_scaled(im, name, dp, smooth=False):
    for dens, k in DENS.items():
        size = int(round(dp * k))
        method = Image.NEAREST if (k >= 1.5 and not smooth) else Image.LANCZOS
        d = os.path.join(RES, 'mipmap-' + dens)
        os.makedirs(d, exist_ok=True)
        im.resize((size, size), method).save(os.path.join(d, name + '.png'))


def main():
    bg = background()
    fg_shadow, fg = foreground()
    mono = monochrome(fg)
    save_scaled(bg, 'ic_launcher_background', 108)
    save_scaled(fg_shadow, 'ic_launcher_foreground', 108)
    save_scaled(mono, 'ic_launcher_monochrome', 108)
    leg = legacy(bg, fg_shadow)
    save_scaled(leg, 'ic_launcher', 48, smooth=True)
    any26 = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(any26, exist_ok=True)
    with open(os.path.join(any26, 'ic_launcher.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n'
                '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
                '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n'
                '</adaptive-icon>\n')
    # vista previa y version de tienda
    docs = os.path.join(ROOT, 'docs', 'icono')
    os.makedirs(docs, exist_ok=True)
    leg.resize((512, 512), Image.LANCZOS).save(os.path.join(docs, 'icono_512.png'))
    preview = Image.new('RGBA', (900, 300), (38, 34, 52, 255))
    full = bg.copy()
    full.alpha_composite(fg_shadow)
    for i, shape in enumerate(['circle', 'squircle', 'rounded']):
        m = Image.new('L', (N, N), 0)
        dd = ImageDraw.Draw(m)
        inset = 18  # la mascara del lanzador recorta a 72 dp de los 108
        if shape == 'circle':
            dd.ellipse([inset, inset, N - inset, N - inset], fill=255)
        elif shape == 'squircle':
            dd.rounded_rectangle([inset, inset, N - inset, N - inset], radius=70, fill=255)
        else:
            dd.rounded_rectangle([inset, inset, N - inset, N - inset], radius=30, fill=255)
        tile = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        tile.paste(full, (0, 0), m)
        preview.alpha_composite(tile.resize((240, 240), Image.NEAREST), (20 + i * 290, 30))
    preview.save(os.path.join(docs, 'vista_previa.png'))
    print('iconos generados')


if __name__ == '__main__':
    main()
