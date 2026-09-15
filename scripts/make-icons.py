import zlib, struct, math, os

def png(path, w, h, pixel):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(pixel(x, y))
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    hdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)  # RGBA
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', hdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)
    print(path, len(data), 'bytes')

def cov(d, edge=1.0):
    """Antialiased coverage: 1 well inside, 0 well outside.

    The edge is one pixel wide whatever the image size - scaling it with the
    canvas is what turns a crisp glyph into a smear."""
    return max(0.0, min(1.0, 0.5 - d / edge))

def clock(w, h, ink):
    """A ring with two hands - reads as a clock at 16px and at 512px."""
    cx, cy, s = (w - 1) / 2, (h - 1) / 2, min(w, h)
    r, stroke = s * 0.34, max(1.6, s * 0.075)
    def pixel(x, y):
        dx, dy = x - cx, y - cy
        a = cov(abs(math.hypot(dx, dy) - r) - stroke / 2)
        # hour hand up, minute hand right - 3 o'clock, unambiguous at any size
        a = max(a, hand(dx, dy, 0, -1, r * 0.52, stroke))
        a = max(a, hand(dx, dy, 1, 0, r * 0.72, stroke))
        return (*ink, int(round(255 * a)))
    return pixel

def hand(dx, dy, ux, uy, length, stroke):
    along = dx * ux + dy * uy
    if along < 0 or along > length:
        return 0.0
    across = abs(dx * -uy + dy * ux)
    return cov(across - stroke / 2)

def rounded_app_icon(w, h):
    """Rounded square in the app's ink colour with the clock knocked out."""
    pad, radius = w * 0.10, w * 0.225
    glyph = clock(w, h, (255, 255, 255))
    def pixel(x, y):
        # signed distance to the rounded square
        qx = abs(x - (w - 1) / 2) - (w / 2 - pad - radius)
        qy = abs(y - (h - 1) / 2) - (h / 2 - pad - radius)
        d = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - radius
        bg = cov(d)
        gr, gg, gb, ga = glyph(x, y)
        t = (y / h) * 0.35
        r = int(38 + 20 * t); g = int(38 + 24 * t); b = int(44 + 40 * t)
        a = ga / 255
        return (
            int(r * (1 - a) + gr * a),
            int(g * (1 - a) + gg * a),
            int(b * (1 - a) + gb * a),
            int(round(255 * bg)),
        )
    return pixel

os.makedirs('resources', exist_ok=True)
os.makedirs('build', exist_ok=True)
# macOS template images are black + alpha; the system recolours them for
# light/dark menu bars and for the highlighted state.
png('resources/trayTemplate.png', 16, 16, clock(16, 16, (0, 0, 0)))
png('resources/trayTemplate@2x.png', 32, 32, clock(32, 32, (0, 0, 0)))
png('build/icon.png', 512, 512, rounded_app_icon(512, 512))
