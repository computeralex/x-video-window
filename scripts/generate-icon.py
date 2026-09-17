#!/usr/bin/env python3
"""Generate assets/icon.png (1024x1024) without third-party libraries."""

from __future__ import annotations

import os
import struct
import zlib

W = 1024
H = 1024


def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: str, pixels: bytearray) -> None:
    raw = bytearray()
    row = W * 4
    for y in range(H):
        raw.append(0)
        raw.extend(pixels[y * row : (y + 1) * row])
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)
    blob = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(blob)


def in_rounded_rect(x: int, y: int, x0: int, y0: int, x1: int, y1: int, r: int) -> bool:
    if x < x0 or x >= x1 or y < y0 or y >= y1:
        return False
    cx = x0 + r if x < x0 + r else (x1 - 1 - r if x > x1 - 1 - r else x)
    cy = y0 + r if y < y0 + r else (y1 - 1 - r if y > y1 - 1 - r else y)
    if cx == x and cy == y:
        return True
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def in_triangle(x: int, y: int, a, b, c) -> bool:
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    p = (x, y)
    d1 = sign(p, a, b)
    d2 = sign(p, b, c)
    d3 = sign(p, c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)


def main() -> None:
    px = bytearray(W * H * 4)
    x0, y0, x1, y1, radius = 64, 64, 960, 960, 196
    play_outer = ((400, 340), (400, 780), (780, 560))
    play_inner = ((430, 400), (430, 720), (710, 560))

    for y in range(H):
        for x in range(W):
            i = (y * W + x) * 4
            if not in_rounded_rect(x, y, x0, y0, x1, y1, radius):
                continue
            # window chrome
            if y < 160 and in_rounded_rect(x, y, x0, y0, x1, y1, radius):
                color = (22, 24, 28, 255)
            else:
                color = (15, 17, 19, 255)
            # border
            inner = in_rounded_rect(x, y, x0 + 18, y0 + 18, x1 - 18, y1 - 18, radius - 12)
            if not inner:
                color = (47, 51, 54, 255)
            px[i : i + 4] = bytes(color)

            # traffic-light dots
            for cx, cy, rgb in (
                (168, 112, (244, 33, 46)),
                (228, 112, (255, 212, 0)),
                (288, 112, (0, 186, 124)),
            ):
                if (x - cx) ** 2 + (y - cy) ** 2 <= 18 * 18:
                    px[i : i + 4] = bytes((*rgb, 255))

            if in_triangle(x, y, *play_outer):
                px[i : i + 4] = bytes((231, 233, 234, 255))
            if in_triangle(x, y, *play_inner):
                px[i : i + 4] = bytes((29, 155, 240, 255))

    out = os.path.join(os.path.dirname(__file__), "..", "assets", "icon.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_png(os.path.abspath(out), px)
    print(f"wrote {os.path.abspath(out)}")


if __name__ == "__main__":
    main()
