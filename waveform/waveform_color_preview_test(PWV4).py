#!/usr/bin/env python3
# coding: utf-8

import numpy as np
import argparse
from matplotlib import pyplot as plt
from construct import Int32ub

parser = argparse.ArgumentParser()
parser.add_argument("filename", help="ANLZ0000.EXT file")
args = parser.parse_args()

with open(args.filename, "rb") as file:
    plt.figure()

    file_data = file.read()
    # noinspection PyTypeChecker
    pos = file_data.find(str.encode("PWV4"))
    if pos < 0:
        print("Could not found PWV4 data")
        exit(1)
    file_data = list(file_data)

    # skip header
    data = file_data[pos + 0x18 :]

    ws = 1
    w = int(1200 / ws)
    hs = 1
    h = int(128 / hs)

    # show channels
    for i in range(6):
        img = np.zeros([h, w, 3])
        for x in range(w):
            fh = int((data[x * ws * 6 + i] & 0x7F) / hs)

            r = g = b = 1
            if i == 0 or i == 1:
                r = g = b = 0.5
            if i == 3:
                g = b = 0.5
            if i == 4:
                r = b = 0.5
            if i == 5:
                r = g = 0.5

            img[0:fh, x, 0] = r
            img[0:fh, x, 1] = g
            img[0:fh, x, 2] = b

        plt.subplot(8, 1, i + 1)
        plt.imshow(img, origin="lower", interpolation="none")

    # show color and blue waveforms
    img = np.zeros([h, w, 3])
    img2 = np.zeros([h, w, 3])
    for x in range(w):
        # d0: unknown ?
        # d1: some kind of luminance boost ?
        d1 = data[x * ws * 6 + 1]
        # d2: inverse intensity for blue waveform
        d2 = data[x * ws * 6 + 2] & 0x7F
        # d3: red
        d3 = data[x * ws * 6 + 3] & 0x7F
        # d4: green
        d4 = data[x * ws * 6 + 4] & 0x7F
        # d5: blue and height of front waveform
        d5 = data[x * ws * 6 + 5] & 0x7F

        # background waveform height is max height of d3, d4 and probably d2 ?
        bh = int(max(d2, d3, d4, d5) / hs)  # int(max(d2, d3, d4) / hs)

        # front waveform height is d5
        fh = int(d5 / hs)

        # front waveform luminosity increase (arbitrary)
        fl = 32

        # color waveform
        r = d3 * (d1 / 127)
        g = d4 * (d1 / 127)
        b = d5 * (d1 / 127)

        img[0:bh, x, 0] = r
        img[0:bh, x, 1] = g
        img[0:bh, x, 2] = b

        img[0:fh, x, 0] = r + fl
        img[0:fh, x, 1] = g + fl
        img[0:fh, x, 2] = b + fl

        # blue waveform
        r = 95 - d2
        g = 95 - d2 * 0.5
        b = 95 - d2 * 0.25

        img2[0:bh, x, 0] = r
        img2[0:bh, x, 1] = g
        img2[0:bh, x, 2] = b

        img2[0:fh, x, 0] = r + fl
        img2[0:fh, x, 1] = g + fl
        img2[0:fh, x, 2] = b + fl

    img = np.clip(img, 0, 127)
    img /= 127
    plt.subplot(8, 1, 7)
    plt.imshow(img, origin="lower", interpolation="bicubic")

    img2 = np.clip(img2, 0, 127)
    img2 /= 127
    plt.subplot(8, 1, 8)
    plt.imshow(img2, origin="lower", interpolation="bicubic")

    plt.show()
    file.close()
