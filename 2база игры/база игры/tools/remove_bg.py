#!/usr/bin/env python3
"""Flood-fill near-corner colors to transparent alpha for sprite PNGs."""
from __future__ import annotations

import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BACKUP = ASSETS / "_backup"
THRESHOLD = 42

FILES = [
    ASSETS / "heroes" / "trex.png",
    ASSETS / "heroes" / "ptero.png",
    ASSETS / "heroes" / "parasau.png",
    ASSETS / "heroes" / "stego.png",
    ASSETS / "enemies" / "grunt.png",
]


def color_dist(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def remove_bg(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    corners = [
        pixels[0, 0][:3],
        pixels[w - 1, 0][:3],
        pixels[0, h - 1][:3],
        pixels[w - 1, h - 1][:3],
    ]

    # Average corner as reference (checker/white/gray backgrounds)
    ref = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    visited = [[False] * w for _ in range(h)]
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]

    # Also seed edge midpoints for better coverage
    stack.extend(
        [
            (w // 2, 0),
            (w // 2, h - 1),
            (0, h // 2),
            (w - 1, h // 2),
        ]
    )

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        if color_dist((r, g, b), ref) > THRESHOLD:
            # Also accept near-white / light gray independently
            if not (r > 200 and g > 200 and b > 200):
                if not (abs(r - g) < 12 and abs(g - b) < 12 and r > 160):
                    continue
        pixels[x, y] = (r, g, b, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    # Second pass: make remaining near-white fringe transparent if touching transparent
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r > 210 and g > 210 and b > 210:
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] == 0:
                        pixels[x, y] = (r, g, b, 0)
                        break

    img.save(path)
    print(f"OK {path.relative_to(ROOT)}")


def main():
    BACKUP.mkdir(parents=True, exist_ok=True)
    for path in FILES:
        if not path.exists():
            print(f"SKIP missing {path}")
            continue
        rel = path.relative_to(ASSETS)
        dest = BACKUP / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            shutil.copy2(path, dest)
            print(f"backup {rel}")
        remove_bg(path)


if __name__ == "__main__":
    main()
