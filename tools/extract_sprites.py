#!/usr/bin/env python3
"""Extrae sprites pixel-art de las hojas de concepto (docs/concept) y los
reescala a la resolucion nativa del juego (270 px de alto logico).

Uso:  python3 tools/extract_sprites.py
Salida: game/assets/img/*.png
"""
import colorsys
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs', 'concept')
OUT = os.path.join(ROOT, 'game', 'assets', 'img')

SHEETS = {
    'A': 'hoja_sprites_a.webp',
    'B': 'hoja_sprites_b.webp',
    'L': 'logo_gom.webp',
    'M': 'mockup_escena.jpg',
}

OUTLINE = (18, 12, 30, 255)

# nombre: (hoja, (x, y, w, h), alto_objetivo | None, opciones)
# alto_objetivo = alto final en px logicos (None = factor en opciones['f'])
CROPS = {
    # --- GOM ---
    'gom_bike':      ('A', (44, 284, 212, 196), 58, {}),
    'gom_bike_b':    ('B', (326, 40, 198, 223), 58, {}),
    'gom_walk':      ('B', (1334, 34, 148, 227), 54, {}),
    'gom_front':     ('B', (573, 32, 110, 231), 56, {}),
    'bike_empty':    ('A', (298, 318, 212, 163), 44, {}),
    # expresiones (retrato HUD)
    'face_0':        ('A', (18, 514, 84, 112), 26, {}),
    'face_1':        ('A', (105, 514, 84, 110), 26, {}),
    'face_2':        ('A', (192, 514, 84, 112), 26, {}),
    'face_3':        ('A', (282, 514, 80, 112), 26, {}),
    'face_4':        ('A', (365, 514, 83, 112), 26, {}),
    'face_5':        ('A', (458, 514, 82, 112), 26, {}),
    # --- pizzas / iconos ---
    'pizza_box':     ('B', (29, 344, 198, 128), 12, {'outline': True}),
    'pizza_box_big': ('B', (29, 344, 198, 128), 26, {'outline': True}),
    'pizza_open':    ('B', (256, 298, 195, 194), 34, {'outline': True}),
    'slice':         ('B', (477, 353, 124, 119), 13, {'outline': True}),
    'pizza_whole':   ('A', (188, 676, 83, 87), 16, {'outline': True}),
    'box_logo':      ('A', (561, 319, 100, 95), 16, {'outline': True}),
    'coin':          ('B', (760, 805, 98, 107), 11, {'outline': True}),
    'heart':         ('B', (892, 834, 62, 63), 11, {'outline': True}),
    'stopwatch':     ('B', (1055, 818, 137, 106), 15, {'outline': True}),
    'soda':          ('A', (275, 671, 55, 91), 16, {'outline': True}),
    'pin':           ('A', (334, 682, 55, 73), 14, {'outline': True}),
    'phone':         ('A', (399, 677, 58, 82), 14, {'outline': True}),
    'gps':           ('A', (468, 683, 81, 76), 18, {'outline': True}),
    'flag':          ('B', (595, 784, 121, 151), 40, {'outline': True}),
    'sign_pizza':    ('B', (180, 792, 199, 143), 32, {'outline': True}),
    # --- personajes ---
    'customer':      ('B', (404, 802, 80, 131), 34, {'outline': True}),
    'bubble':        ('B', (484, 770, 71, 77), 17, {'outline': True}),
    # --- vehiculos / obstaculos ---
    'van':           ('B', (864, 334, 376, 174), 46, {'outline': True}),
    'cone':          ('A', (1175, 819, 57, 68), 17, {'outline': True}),
    'crate':         ('B', (1194, 817, 105, 107), 19, {'outline': True}),
    'barrel':        ('A', (1291, 820, 49, 67), 23, {'outline': True}),
    'ramp':          ('B', (1298, 817, 93, 106), 24, {'outline': True}),
    'trash':         ('A', (1453, 820, 48, 65), 21, {'outline': True}),
    'bench':         ('A', (1348, 823, 99, 64), 22, {'outline': True}),
    'planter':       ('A', (1177, 884, 93, 87), 22, {'outline': True}),
    'hydrant':       ('A', (1275, 900, 46, 71), 17, {'outline': True}),
    'billboard':     ('A', (1330, 887, 93, 84), 30, {'outline': True}),
    # --- decorado grande ---
    'palm':          ('B', (1132, 535, 144, 203), 92, {'outline': True, 'solid': False}),
    'lamp':          ('B', (1362, 542, 64, 196), 64, {'outline': True}),
    'house':         ('B', (864, 538, 227, 195), 84, {}),
    'pizzeria':      ('B', (1273, 295, 235, 212), 92, {}),
    'pizzeria_b':    ('A', (577, 822, 164, 143), 70, {}),
    'wall_pillar':   ('A', (739, 836, 52, 124), 44, {}),
    'fence':         ('A', (787, 874, 76, 89), 26, {'outline': True, 'solid': False}),
    # --- logo ---
    'logo':          ('L', (0, 0, 1254, 1254), 150, {'trim': True}),
}


def load(sheet):
    return np.array(Image.open(os.path.join(SRC, SHEETS[sheet])).convert('RGBA'))


def remove_bg(arr, thr=26, solid=True):
    """Quita el fondo negro de la hoja de concepto.

    solid=True  (por defecto): el sprite es un objeto macizo. Se toma como figura
                todo lo que no es negro puro, se cierran las rendijas y se rellenan
                los huecos interiores; asi los negros del dibujo (chaquetas,
                neumaticos, contornos, el circulo del logo) no se vuelven
                transparentes aunque toquen el fondo.
    solid=False: para sprites con huecos reales (palmera, verja): relleno desde el
                borde, pero erosionando antes para que no se cuele por contornos finos.
    """
    rgb = arr[:, :, :3].astype(int)
    mx = rgb.max(axis=2)
    if solid:
        fg = mx > 12
        fg = ndi.binary_closing(fg, structure=np.ones((3, 3), bool), iterations=2, border_value=0)
        fg = ndi.binary_fill_holes(fg)
        # recupera el contorno casi negro pegado a la silueta
        ring = ndi.binary_dilation(fg, iterations=2) & ~fg & (mx > 3)
        fg = ndi.binary_fill_holes(fg | ring)
    else:
        cand = mx < thr
        core = ndi.binary_erosion(cand, iterations=2, border_value=1)
        lab, _ = ndi.label(core)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
        border.discard(0)
        bg = ndi.binary_dilation(np.isin(lab, list(border)), iterations=3) & cand
        fg = ~bg
    out = arr.copy()
    out[:, :, 3] = np.where(fg, 255, 0)
    # limpia islas diminutas (ruido de compresion)
    op = out[:, :, 3] > 0
    lab2, n2 = ndi.label(op)
    if n2 > 1:
        sizes = ndi.sum(op, lab2, range(1, n2 + 1))
        keep = np.zeros(n2 + 1, bool)
        big = sizes.max()
        for i, sz in enumerate(sizes, 1):
            keep[i] = sz >= max(12, big * 0.004)
        out[:, :, 3] = np.where(keep[lab2], 255, 0)
    return out


def trim(arr):
    a = arr[:, :, 3] > 0
    ys, xs = np.where(a)
    if len(ys) == 0:
        return arr
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def downscale(arr, target_h):
    """Reescalado 'pixel art': alfa por mayoria y color por mediana del bloque."""
    arr = arr.astype(float)
    h, w = arr.shape[:2]
    f = h / float(target_h)
    nh, nw = max(1, int(round(h / f))), max(1, int(round(w / f)))
    out = np.zeros((nh, nw, 4), dtype=np.uint8)
    for y in range(nh):
        y0 = int(y * h / nh)
        y1 = max(y0 + 1, int((y + 1) * h / nh))
        for x in range(nw):
            x0 = int(x * w / nw)
            x1 = max(x0 + 1, int((x + 1) * w / nw))
            blk = arr[y0:y1, x0:x1].reshape(-1, 4)
            op = blk[blk[:, 3] > 127]
            if len(op) < 0.42 * len(blk):
                continue
            # muestra central ponderada: mediana de los opacos
            c = np.median(op[:, :3], axis=0)
            out[y, x, :3] = np.clip(c, 0, 255)
            out[y, x, 3] = 255
    return out


def add_outline(arr, color=OUTLINE):
    a = arr[:, :, 3] > 0
    pad = np.pad(arr, ((1, 1), (1, 1), (0, 0)))
    ap = np.pad(a, 1)
    ring = ndi.binary_dilation(ap, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~ap
    pad[ring] = color
    return pad


def boost(arr, sat=1.08, con=1.04):
    """Ligero realce de saturacion/contraste (el reescalado apaga un poco)."""
    out = arr.copy()
    rgb = out[:, :, :3].astype(float) / 255.0
    mean = 0.5
    rgb = (rgb - mean) * con + mean
    gray = rgb.mean(axis=2, keepdims=True)
    rgb = gray + (rgb - gray) * sat
    out[:, :, :3] = np.clip(rgb * 255, 0, 255).astype(np.uint8)
    return out


def hue_swap(arr, src_range, dst_hue, min_sat=0.45, sat_mul=1.0, val_mul=1.0, rows=None):
    """Cambia el tono de los pixeles cuyo matiz cae en src_range (grados)."""
    out = arr.copy()
    h, w = arr.shape[:2]
    for y in range(h):
        if rows is not None and not rows(y, h):
            continue
        for x in range(w):
            r, g, b, a = arr[y, x]
            if a == 0:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            deg = hh * 360
            lo, hi = src_range
            inside = (lo <= deg <= hi) if lo <= hi else (deg >= lo or deg <= hi)
            if inside and ss >= min_sat:
                nr, ng, nb = colorsys.hsv_to_rgb((dst_hue % 360) / 360.0, min(1, ss * sat_mul), min(1, vv * val_mul))
                out[y, x, :3] = (int(nr * 255), int(ng * 255), int(nb * 255))
    return out


def save(name, arr):
    Image.fromarray(arr.astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'))


def main():
    os.makedirs(OUT, exist_ok=True)
    cache = {}
    made = {}
    only = set(sys.argv[1:])
    for name, (sheet, (x, y, w, h), th, opt) in CROPS.items():
        if only and name not in only:
            continue
        if sheet not in cache:
            cache[sheet] = load(sheet)
        src = cache[sheet][y:y + h, x:x + w]
        arr = remove_bg(src, solid=opt.get('solid', True))
        arr = trim(arr)
        arr = downscale(arr, th)
        arr = boost(arr)
        if opt.get('outline'):
            arr = add_outline(arr)
        save(name, arr)
        made[name] = arr
        print('%-14s %3dx%-3d' % (name, arr.shape[1], arr.shape[0]))

    # variantes de color (cliente y furgoneta rival)
    if 'customer' in made:
        c = made['customer']
        for i, hue in enumerate([215, 130, 280, 35]):
            save('customer_%d' % (i + 1), hue_swap(c, (340, 14), hue, min_sat=0.5,
                                                  rows=lambda y, h: y < h * 0.3 or y > h * 0.64))
    if 'van' in made:
        v = made['van']
        # furgoneta rival "Pizza Rapida": amarillo -> rojo carmesi
        save('van_rival', hue_swap(v, (28, 62), 352, min_sat=0.35, sat_mul=1.0, val_mul=0.92))
        save('van_green', hue_swap(v, (28, 62), 150, min_sat=0.35, val_mul=0.85))


if __name__ == '__main__':
    main()
