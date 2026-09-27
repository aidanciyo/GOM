#!/usr/bin/env python3
"""Genera los sprites procedurales del juego (personajes, coches, obstaculos,
animaciones de GOM) con el mismo estilo que los sprites extraidos del concepto.

Se dibuja a 4x con primitivas sin antialias y se reduce con el mismo filtro
'pixel art' (mediana por bloque) + contorno oscuro.

Uso:  python3 tools/gen_sprites.py   (despues de extract_sprites.py)
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw

import extract_sprites as ex

OUT = ex.OUT
S = 4  # factor de supermuestreo


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


def finish(img, outline=True):
    arr = np.array(img)
    arr = ex.downscale(arr, img.size[1] // S)
    arr = ex.trim(arr) if False else arr
    if outline:
        arr = ex.add_outline(arr)
    return arr


def save(name, arr):
    Image.fromarray(arr.astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'))


def strip(frames):
    """Une frames del mismo tamano en una tira horizontal."""
    h = max(f.shape[0] for f in frames)
    w = max(f.shape[1] for f in frames)
    out = np.zeros((h, w * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        out[h - f.shape[0]:, i * w:i * w + f.shape[1]] = f
    return out


# ---------------------------------------------------------------- humanos
SKINS = ['#f2c29b', '#e0a878', '#b97a50', '#8a5634', '#f7d7b8']
HAIRS = ['#2b1d16', '#5a3620', '#c98a3a', '#1c1c24', '#8c2f1c', '#d9c7a0']


def human(p, pose='idle', t=0):
    """Dibuja un humano de frente a 4x. p = dict de colores/estilo.
    pose: idle | wave | happy | walk | phone | back"""
    W, H = 18 * S, 38 * S
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    skin, skin_d = rgb(p['skin']), shade(rgb(p['skin']), 0.8)
    top, top_d, top_l = rgb(p['top']), shade(rgb(p['top']), 0.72), shade(rgb(p['top']), 1.18)
    pants, pants_d = rgb(p['pants']), shade(rgb(p['pants']), 0.75)
    hair, hair_d = rgb(p['hair']), shade(rgb(p['hair']), 0.7)
    shoe = rgb(p.get('shoe', '#26222e'))
    cx = W // 2
    bob = 0
    if pose in ('walk', 'phone', 'back'):
        bob = -S if t % 2 == 1 else 0
    if pose == 'happy':
        bob = -3 * S
    if pose == 'idle' and t == 1:
        bob = 0
    oy = bob

    def R(x0, y0, x1, y1, c):
        d.rectangle([x0, y0 + oy, x1, y1 + oy], fill=c)

    def E(x0, y0, x1, y1, c):
        d.ellipse([x0, y0 + oy, x1, y1 + oy], fill=c)

    # piernas
    leg_top, leg_bot = 25 * S, 35 * S
    ll = lr = 0
    if pose in ('walk', 'phone', 'back'):
        cyc = [(0, -2), (-1, -1), (-2, 0), (-1, -1)][t % 4]
        ll, lr = cyc[0] * S, cyc[1] * S
    R(cx - 5 * S, leg_top, cx - 1 * S, leg_bot + ll, pants)
    R(cx + 1 * S, leg_top, cx + 5 * S, leg_bot + lr, pants)
    R(cx - 5 * S, leg_top, cx - 4 * S, leg_bot + ll, pants_d)
    R(cx + 4 * S, leg_top, cx + 5 * S, leg_bot + lr, pants_d)
    # zapatos
    E(cx - 6 * S, leg_bot + ll - S, cx - 0 * S, leg_bot + ll + 2 * S, shoe)
    E(cx + 0 * S, leg_bot + lr - S, cx + 6 * S, leg_bot + lr + 2 * S, shoe)
    # torso
    d.rounded_rectangle([cx - 6 * S, 14 * S + oy, cx + 6 * S, 26 * S + oy], radius=3 * S, fill=top)
    R(cx - 6 * S, 22 * S, cx + 6 * S, 26 * S, top_d)
    R(cx - 3 * S, 15 * S, cx - 1 * S, 21 * S, top_l)
    if p.get('stripe'):
        R(cx - 6 * S, 19 * S, cx + 6 * S, 20 * S, rgb(p['stripe']))
    # brazos
    def arm(side, mode):
        sx = cx + side * 7 * S
        if mode == 'down':
            sw = 0
            if pose in ('walk', 'back'):
                sw = (1 if (t % 4) in (0, 1) else -1) * side * S
            R(sx - S - (S if side < 0 else 0), 15 * S + sw, sx + S - (S if side < 0 else 0), 23 * S + sw, top)
            E(sx - 2 * S - (S if side < 0 else 0) + S // 2, 22 * S + sw, sx + S - (S if side < 0 else 0) + S // 2, 25 * S + sw, skin)
        elif mode == 'up':
            wig = (S if t % 2 else -S) * side
            R(sx - S - (S if side < 0 else 0) + wig // 2, 5 * S, sx + S - (S if side < 0 else 0) + wig // 2, 16 * S, top)
            E(sx - 2 * S - (S if side < 0 else 0) + wig, 2 * S, sx + 2 * S - (S if side < 0 else 0) + wig, 6 * S, skin)
        elif mode == 'phone':
            R(sx - S - (S if side < 0 else 0), 15 * S, sx + S - (S if side < 0 else 0), 19 * S, top)
            ex_ = cx + side * 3 * S
            R(min(sx, ex_) - S, 18 * S, max(sx, ex_) + S, 20 * S, top)
    if pose == 'wave':
        arm(-1, 'down'); arm(1, 'up')
    elif pose == 'happy':
        arm(-1, 'up'); arm(1, 'up')
    elif pose == 'phone':
        arm(-1, 'phone'); arm(1, 'phone')
        # movil con pantalla brillante
        R(cx - 2 * S, 16 * S, cx + 2 * S, 20 * S, rgb('#1d2233'))
        R(cx - S - S // 2, 16 * S + S // 2, cx + S + S // 2, 19 * S, rgb('#8ff3ff'))
        E(cx - 4 * S, 17 * S, cx - S, 20 * S, skin)
        E(cx + S, 17 * S, cx + 4 * S, 20 * S, skin)
    else:
        arm(-1, 'down'); arm(1, 'down')
    # cuello
    R(cx - 2 * S, 12 * S, cx + 1 * S, 15 * S, skin_d)
    # cabeza
    hy = 0 if pose != 'phone' else S
    E(cx - 6 * S, 1 * S + hy, cx + 6 * S, 13 * S + hy, skin)
    E(cx - 6 * S, 7 * S + hy, cx - 4 * S, 10 * S + hy, skin_d)
    back = pose == 'back'
    style = p['style']
    if back:
        E(cx - 6 * S, 0 * S + hy, cx + 6 * S, 12 * S + hy, hair)
        R(cx - 6 * S, 6 * S + hy, cx + 6 * S, 11 * S + hy, hair_d)
        if style == 'long':
            R(cx - 6 * S, 6 * S + hy, cx + 6 * S, 16 * S + hy, hair)
    else:
        # ojos y boca
        ey = 7 * S + hy + (S if pose == 'phone' else 0)
        R(cx - 3 * S, ey, cx - 2 * S, ey + 2 * S - 1, rgb('#1a1420'))
        R(cx + 2 * S, ey, cx + 3 * S, ey + 2 * S - 1, rgb('#1a1420'))
        if pose == 'happy':
            E(cx - 2 * S, 9 * S + hy, cx + 2 * S, 12 * S + hy, rgb('#7a1f2b'))
        elif pose == 'phone':
            R(cx - S, 11 * S + hy, cx + S, 11 * S + hy + S - 1, rgb('#9a4a3a'))
        else:
            R(cx - 2 * S, 10 * S + hy, cx + 2 * S, 10 * S + hy + S - 1, rgb('#9a3a3a'))
        # mejillas
        R(cx - 5 * S, 9 * S + hy, cx - 4 * S, 10 * S + hy - 1, rgb('#f09a8a'))
        R(cx + 4 * S, 9 * S + hy, cx + 5 * S, 10 * S + hy - 1, rgb('#f09a8a'))
        # pelo
        if style == 'cap':
            cap, cap_d = rgb(p['cap']), shade(rgb(p['cap']), 0.72)
            d.pieslice([cx - 7 * S, 0 * S + hy + oy, cx + 7 * S, 10 * S + hy + oy], 180, 360, fill=cap)
            R(cx - 7 * S, 4 * S + hy, cx + 9 * S, 5 * S + hy + S // 2, cap_d)
            R(cx - 6 * S, 5 * S + hy, cx - 5 * S, 8 * S + hy, hair)
            R(cx + 5 * S, 5 * S + hy, cx + 6 * S, 8 * S + hy, hair)
            R(cx - 1 * S, 1 * S + hy, cx + 1 * S, 2 * S + hy, shade(cap, 1.3))
        elif style == 'long':
            d.pieslice([cx - 7 * S, 0 * S + hy + oy, cx + 7 * S, 12 * S + hy + oy], 180, 360, fill=hair)
            R(cx - 7 * S, 5 * S + hy, cx - 5 * S, 16 * S + hy, hair)
            R(cx + 5 * S, 5 * S + hy, cx + 7 * S, 16 * S + hy, hair)
            R(cx - 7 * S, 12 * S + hy, cx - 5 * S, 16 * S + hy, hair_d)
            R(cx + 5 * S, 12 * S + hy, cx + 7 * S, 16 * S + hy, hair_d)
            R(cx - 5 * S, 4 * S + hy, cx + 1 * S, 6 * S + hy, hair)
        elif style == 'bun':
            E(cx - 3 * S, -1 * S + hy + 0, cx + 3 * S, 4 * S + hy, hair)
            d.pieslice([cx - 7 * S, 1 * S + hy + oy, cx + 7 * S, 11 * S + hy + oy], 180, 360, fill=hair)
            R(cx - 6 * S, 5 * S + hy, cx - 5 * S, 9 * S + hy, hair)
            R(cx + 5 * S, 5 * S + hy, cx + 6 * S, 9 * S + hy, hair)
        else:  # short
            d.pieslice([cx - 7 * S, 0 * S + hy + oy, cx + 7 * S, 11 * S + hy + oy], 180, 360, fill=hair)
            R(cx - 7 * S, 5 * S + hy, cx - 5 * S, 9 * S + hy, hair)
            R(cx + 5 * S, 5 * S + hy, cx + 7 * S, 8 * S + hy, hair)
            R(cx - 4 * S, 4 * S + hy, cx + 3 * S, 6 * S + hy, hair_d)
    return im


def gen_humans():
    rnd = random.Random(7)
    tops = ['#e0453a', '#3a7be0', '#3ab86a', '#9b4ad8', '#f08a2a', '#e04a9a', '#2ab0b0', '#f2f2f2']
    pants = ['#2f4f8f', '#3a3a48', '#6b4a2f', '#23304d', '#5a5a66']
    styles = ['cap', 'short', 'long', 'bun']
    customers = []
    for i in range(8):
        p = dict(skin=SKINS[i % len(SKINS)], hair=HAIRS[(i * 3) % len(HAIRS)], top=tops[i % len(tops)],
                 pants=pants[i % len(pants)], style=styles[i % len(styles)], cap=tops[(i + 3) % len(tops)])
        if i % 3 == 2:
            p['stripe'] = '#ffffff'
        frames = [finish(human(p, 'idle', 0)), finish(human(p, 'idle', 1)),
                  finish(human(p, 'wave', 0)), finish(human(p, 'wave', 1)),
                  finish(human(p, 'happy', 0))]
        save('cust_%d' % i, strip(frames))
        customers.append(p)
    for i in range(6):
        p = dict(skin=SKINS[(i + 2) % len(SKINS)], hair=HAIRS[(i * 2 + 1) % len(HAIRS)],
                 top=tops[(i * 3 + 1) % len(tops)], pants=pants[(i + 2) % len(pants)],
                 style=styles[(i + 1) % len(styles)], cap=tops[(i + 5) % len(tops)])
        walk = [finish(human(p, 'walk', t)) for t in range(4)]
        phone = [finish(human(p, 'phone', t)) for t in range(4)]
        back = [finish(human(p, 'back', t)) for t in range(4)]
        save('ped_%d' % i, strip(walk + phone + back))
    print('humanos ok')


# ---------------------------------------------------------------- coches
def car(kind, color, frame=0):
    """Coche de perfil mirando a la derecha, dibujado a 4x."""
    base = rgb(color)
    dark, darker, light = shade(base, 0.72), shade(base, 0.5), shade(base, 1.22)
    glass, glass_l = rgb('#5ec8f0'), rgb('#c8f4ff')
    tire, rim, rim_d = rgb('#1c1a22'), rgb('#b8bcc8'), rgb('#6a6e7a')
    if kind == 'sport':
        W, H = 78, 26
        body = [(1, 13), (6, 11), (26, 10), (34, 4), (52, 4), (62, 10), (74, 12), (77, 15), (77, 20), (1, 20)]
        win = [(30, 10), (36, 5), (51, 5), (58, 10)]
        wheels = [(16, 20, 6.2), (62, 20, 6.2)]
    elif kind == 'hatch':
        W, H = 62, 30
        body = [(1, 14), (4, 12), (10, 11), (14, 3), (40, 3), (49, 11), (59, 12), (61, 15), (61, 24), (1, 24)]
        win = [(15, 11), (17, 5), (39, 5), (46, 11)]
        wheels = [(13, 24, 6.2), (49, 24, 6.2)]
    elif kind == 'suv':
        W, H = 76, 34
        body = [(1, 14), (3, 5), (8, 3), (50, 3), (58, 12), (73, 14), (75, 17), (75, 27), (1, 27)]
        win = [(6, 12), (8, 5), (49, 5), (55, 12)]
        wheels = [(16, 27, 7.2), (60, 27, 7.2)]
    else:  # sedan / taxi / police
        W, H = 74, 30
        body = [(1, 13), (4, 11), (16, 11), (23, 3), (47, 3), (56, 11), (71, 12), (73, 15), (73, 24), (1, 24)]
        win = [(18, 11), (24, 5), (46, 5), (53, 11)]
        wheels = [(15, 24, 6.4), (58, 24, 6.4)]
    im = Image.new('RGBA', ((W + 2) * S, (H + 6) * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    P = lambda pts: [(x * S, (y + 2) * S) for x, y in pts]
    d.polygon(P(body), fill=base)
    # sombreado inferior y brillo superior
    lower = min(y for _, y in body[-2:])
    d.rectangle([1 * S, (lower - 4 + 2) * S, (W - 1) * S, (lower + 2) * S], fill=dark)
    belt = win[0][1] + 1
    d.rectangle([5 * S, (belt + 2) * S, (W - 5) * S, (belt + 2) * S + S - 1], fill=light)
    # techo con brillo
    d.polygon(P([(win[1][0] + 1, win[1][1] - 1), (win[2][0] - 1, win[2][1] - 1), (win[2][0] - 1, win[2][1] - 0.2), (win[1][0] + 1, win[1][1] - 0.2)]), fill=light)
    # ventanas
    d.polygon(P(win), fill=glass)
    xs = [x for x, _ in win]
    mid = (min(xs) + max(xs)) / 2
    d.rectangle([(mid - 0.8) * S, 3 * S + 2 * S, (mid + 0.8) * S, (win[0][1] + 2) * S], fill=darker)
    # reflejo diagonal
    y0 = win[1][1] + 2
    d.polygon([((mid + 3) * S, (y0 + 1) * S), ((mid + 6) * S, (y0 + 1) * S), ((mid + 3) * S, (win[0][1] + 1) * S), ((mid + 0.5) * S, (win[0][1] + 1) * S)], fill=glass_l)
    # puerta y manilla
    d.rectangle([(mid - 0.5) * S, (win[0][1] + 2) * S, (mid + 0.2) * S, (lower - 2 + 2) * S], fill=darker)
    d.rectangle([(mid + 2) * S, (win[0][1] + 4) * S, (mid + 5) * S, (win[0][1] + 4) * S + S], fill=darker)
    # faros
    fy = (body[-3][1] + 3) if kind != 'sport' else 15
    d.rectangle([(W - 4) * S, (fy + 2) * S, (W - 1) * S, (fy + 4) * S], fill=rgb('#fff6c8'))
    d.rectangle([1 * S, (fy + 2) * S, 3 * S, (fy + 4) * S], fill=rgb('#ff3b3b'))
    # parachoques
    d.rectangle([0, (lower + 2 - 2) * S, 5 * S, (lower + 2) * S], fill=rgb('#3a3a44'))
    d.rectangle([(W - 6) * S, (lower + 2 - 2) * S, W * S, (lower + 2) * S], fill=rgb('#3a3a44'))
    # extras
    if kind == 'taxi':
        d.polygon(P([(3, 17), (70, 15), (70, 17), (3, 19)]), fill=rgb('#e03030'))
        d.rectangle([33 * S, 0 * S, 41 * S, 3 * S], fill=rgb('#f4f4f4'))
        d.rectangle([34 * S, 1 * S, 40 * S, 2 * S + S // 2], fill=rgb('#35d86a'))
    if kind == 'police':
        d.rectangle([2 * S, 16 * S, (W - 2) * S, 20 * S], fill=rgb('#2a52c8'))
        d.rectangle([30 * S, 1 * S, 35 * S, 4 * S], fill=rgb('#ff3030'))
        d.rectangle([36 * S, 1 * S, 41 * S, 4 * S], fill=rgb('#3070ff'))
    if kind == 'sport':
        d.rectangle([1 * S, 9 * S, 7 * S, 10 * S + S], fill=darker)
        d.rectangle([3 * S, 10 * S, 4 * S, 13 * S], fill=darker)
    # ruedas
    for (wx, wy, r) in wheels:
        wy2 = wy + 2
        d.ellipse([(wx - r - 1) * S, (wy2 - r - 1) * S, (wx + r + 1) * S, (wy2 + r + 1) * S], fill=shade(base, 0.35))
        d.ellipse([(wx - r) * S, (wy2 - r) * S, (wx + r) * S, (wy2 + r) * S], fill=tire)
        rr = r * 0.55
        d.ellipse([(wx - rr) * S, (wy2 - rr) * S, (wx + rr) * S, (wy2 + rr) * S], fill=rim)
        a0 = frame * math.pi / 4
        for k in range(3):
            a = a0 + k * 2 * math.pi / 3
            x1, y1 = wx + math.cos(a) * rr * 0.9, wy2 + math.sin(a) * rr * 0.9
            d.line([(wx * S, wy2 * S), (x1 * S, y1 * S)], fill=rim_d, width=S)
        d.ellipse([(wx - 1) * S, (wy2 - 1) * S, (wx + 1) * S, (wy2 + 1) * S], fill=rim_d)
    return im


def gen_cars():
    specs = [
        ('car_red', 'sedan', '#d8323c'), ('car_blue', 'sedan', '#2f6fe0'),
        ('car_white', 'hatch', '#e8e8f0'), ('car_green', 'hatch', '#2fb86a'),
        ('car_purple', 'sport', '#8a3fd8'), ('car_orange', 'sport', '#f07a22'),
        ('car_taxi', 'taxi', '#f4f4f4'), ('car_police', 'police', '#f0f0f6'),
        ('car_suv', 'suv', '#3a4a5a'), ('car_teal', 'suv', '#1f9e9e'),
    ]
    for name, kind, col in specs:
        frames = [finish(car(kind, col, f)) for f in range(2)]
        save(name, strip(frames))
    print('coches ok')


# ---------------------------------------------------------------- varios
def gen_misc():
    # gaviota (3 frames)
    frames = []
    for f in range(3):
        im = Image.new('RGBA', (18 * S, 14 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        wy = [2, 6, 10][f]
        d.polygon([(4 * S, 7 * S), (9 * S, wy * S), (10 * S, 7 * S)], fill=rgb('#c9d0dc'))
        d.polygon([(8 * S, 7 * S), (13 * S, wy * S), (14 * S, 7 * S)], fill=rgb('#aab2c2'))
        d.ellipse([3 * S, 6 * S, 15 * S, 10 * S], fill=rgb('#f6f7fb'))
        d.ellipse([12 * S, 5 * S, 17 * S, 9 * S], fill=rgb('#f6f7fb'))
        d.polygon([(16 * S, 7 * S), (18 * S, 8 * S), (16 * S, 8 * S + S)], fill=rgb('#f5b82e'))
        d.rectangle([14 * S, 6 * S, 15 * S - 1, 7 * S - 1], fill=rgb('#1a1420'))
        d.polygon([(3 * S, 8 * S), (0, 6 * S), (1 * S, 9 * S)], fill=rgb('#aab2c2'))
        frames.append(finish(im))
    save('gull', strip(frames))

    # barril rodando (vista del extremo, 4 frames)
    frames = []
    for f in range(4):
        im = Image.new('RGBA', (20 * S, 20 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse([1 * S, 1 * S, 19 * S, 19 * S], fill=rgb('#3e5a7a'))
        d.ellipse([3 * S, 3 * S, 17 * S, 17 * S], fill=rgb('#56789c'))
        d.ellipse([5 * S, 5 * S, 15 * S, 15 * S], fill=rgb('#4a6a8c'))
        a = f * math.pi / 2 + 0.4
        px, py = 10 + math.cos(a) * 4.5, 10 + math.sin(a) * 4.5
        d.ellipse([(px - 1.6) * S, (py - 1.6) * S, (px + 1.6) * S, (py + 1.6) * S], fill=rgb('#23344a'))
        a2 = a + math.pi
        qx, qy = 10 + math.cos(a2) * 5.5, 10 + math.sin(a2) * 5.5
        d.line([(10 * S, 10 * S), (qx * S, qy * S)], fill=rgb('#8fb0d0'), width=S)
        d.arc([2 * S, 2 * S, 18 * S, 18 * S], 200 + f * 90, 250 + f * 90, fill=rgb('#a8c6e6'), width=S)
        frames.append(finish(im))
    save('barrel_roll', strip(frames))

    # alcantarilla cerrada / abierta
    im = Image.new('RGBA', (28 * S, 10 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, 28 * S, 10 * S], fill=rgb('#4a4652'))
    d.ellipse([2 * S, 1 * S, 26 * S, 9 * S], fill=rgb('#6c6876'))
    for k in range(4):
        d.line([(5 * S + k * 5 * S, 2 * S), (5 * S + k * 5 * S, 8 * S)], fill=rgb('#57535f'), width=S)
    d.line([(3 * S, 5 * S), (25 * S, 5 * S)], fill=rgb('#57535f'), width=S)
    save('manhole', finish(im, outline=True))
    im = Image.new('RGBA', (34 * S, 12 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 1 * S, 26 * S, 11 * S], fill=rgb('#5a5662'))
    d.ellipse([2 * S, 2 * S, 24 * S, 10 * S], fill=rgb('#0c0a10'))
    d.ellipse([4 * S, 5 * S, 22 * S, 10 * S], fill=rgb('#1a1622'))
    d.ellipse([20 * S, 0, 34 * S, 5 * S], fill=rgb('#6c6876'))
    save('manhole_open', finish(im, outline=True))

    # valla de obras
    im = Image.new('RGBA', (32 * S, 24 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([4 * S, 10 * S, 6 * S, 23 * S], fill=rgb('#6a6a74'))
    d.rectangle([26 * S, 10 * S, 28 * S, 23 * S], fill=rgb('#6a6a74'))
    d.rectangle([1 * S, 21 * S, 9 * S, 23 * S], fill=rgb('#4a4a54'))
    d.rectangle([23 * S, 21 * S, 31 * S, 23 * S], fill=rgb('#4a4a54'))
    d.rectangle([0, 8 * S, 32 * S, 15 * S], fill=rgb('#f4f4f4'))
    for k in range(-2, 8):
        x0 = k * 6 * S
        d.polygon([(x0, 15 * S), (x0 + 4 * S, 8 * S), (x0 + 7 * S, 8 * S), (x0 + 3 * S, 15 * S)], fill=rgb('#e0302a'))
    d.rectangle([0, 0, 32 * S, 7 * S], fill=(0, 0, 0, 0))
    d.rectangle([0, 16 * S, 32 * S, 20 * S], fill=(0, 0, 0, 0))
    d.rectangle([4 * S, 16 * S, 6 * S, 20 * S], fill=rgb('#6a6a74'))
    d.rectangle([26 * S, 16 * S, 28 * S, 20 * S], fill=rgb('#6a6a74'))
    d.ellipse([13 * S, 2 * S, 19 * S, 8 * S], fill=rgb('#ffb020'))
    d.rectangle([15 * S, 7 * S, 17 * S, 9 * S], fill=rgb('#3a3a44'))
    save('barrier', finish(im))

    # iman
    im = Image.new('RGBA', (16 * S, 16 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.arc([1 * S, 1 * S, 15 * S, 15 * S], 180, 360, fill=rgb('#e0302a'), width=4 * S)
    d.rectangle([1 * S, 8 * S, 5 * S, 12 * S], fill=rgb('#e0302a'))
    d.rectangle([11 * S, 8 * S, 15 * S, 12 * S], fill=rgb('#e0302a'))
    d.rectangle([1 * S, 12 * S, 5 * S, 15 * S], fill=rgb('#e8e8f0'))
    d.rectangle([11 * S, 12 * S, 15 * S, 15 * S], fill=rgb('#e8e8f0'))
    save('magnet', finish(im))

    # casco dorado (escudo)
    im = Image.new('RGBA', (16 * S, 14 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.pieslice([1 * S, 1 * S, 15 * S, 21 * S], 180, 360, fill=rgb('#f5c518'))
    d.rectangle([1 * S, 10 * S, 16 * S, 12 * S], fill=rgb('#c8940c'))
    d.rectangle([8 * S, 5 * S, 14 * S, 9 * S], fill=rgb('#5ec8f0'))
    d.rectangle([4 * S, 3 * S, 6 * S, 6 * S], fill=rgb('#fff2a8'))
    save('helmet', finish(im))

    # rayo (turbo)
    im = Image.new('RGBA', (12 * S, 16 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(7 * S, 0), (1 * S, 9 * S), (5 * S, 9 * S), (3 * S, 16 * S), (11 * S, 6 * S), (7 * S, 6 * S), (9 * S, 0)], fill=rgb('#ffd21f'))
    save('bolt', finish(im))

    # chispa / estrella
    im = Image.new('RGBA', (9 * S, 9 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(4.5 * S, 0), (5.5 * S, 3.5 * S), (9 * S, 4.5 * S), (5.5 * S, 5.5 * S), (4.5 * S, 9 * S), (3.5 * S, 5.5 * S), (0, 4.5 * S), (3.5 * S, 3.5 * S)], fill=rgb('#fff6b0'))
    save('star', finish(im, outline=False))
    print('varios ok')


# ---------------------------------------------------------------- GOM
def rotsprite(arr, angle, pivot):
    """Rotacion estilo RotSprite simplificada: x6 vecino -> rotar -> reducir."""
    k = 6
    im = Image.fromarray(arr, 'RGBA')
    w, h = im.size
    pad = 10
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    big = canvas.resize(((w + pad * 2) * k, (h + pad * 2) * k), Image.NEAREST)
    px, py = (pivot[0] + pad) * k, (pivot[1] + pad) * k
    rot = big.rotate(angle, resample=Image.NEAREST, center=(px, py))
    small = ex.downscale(np.array(rot), (h + pad * 2))
    return ex.trim(small) if False else small


def gen_gom():
    base = np.array(Image.open(os.path.join(OUT, 'gom_bike.png')).convert('RGBA'))
    h, w = base.shape[:2]
    # ruedas: centro y radio interior a rotar
    wheels = [(12.5, 47.5), (52.5, 47.5)]
    frames = []
    for f in range(3):
        arr = base.copy()
        for (cx, cy) in wheels:
            r = 7.2
            x0, y0 = int(cx - r - 1), int(cy - r - 1)
            x1, y1 = int(cx + r + 2), int(cy + r + 2)
            sub = Image.fromarray(base[y0:y1, x0:x1])
            rot = np.array(sub.rotate(-f * 40, resample=Image.NEAREST, center=(cx - x0, cy - y0)))
            for yy in range(y1 - y0):
                for xx in range(x1 - x0):
                    if (xx + x0 - cx) ** 2 + (yy + y0 - cy) ** 2 <= r * r and rot[yy, xx, 3] > 0:
                        arr[y0 + yy, x0 + xx] = rot[yy, xx]
        frames.append(arr)
    save('gom_ride', strip(frames))
    # poses: caballito (-11 grados), picado (+7), salto (-20)
    for name, ang in [('gom_wheelie', 11), ('gom_nose', -7), ('gom_jump', 18)]:
        r = rotsprite(base, ang, (12, 57))
        save(name, r)
    print('gom ok', [f.shape for f in frames])


if __name__ == '__main__':
    gen_humans()
    gen_cars()
    gen_misc()
    gen_gom()
