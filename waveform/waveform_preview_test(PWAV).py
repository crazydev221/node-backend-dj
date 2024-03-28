#!/usr/bin/env python3
# coding: utf-8

import numpy as np
import argparse
from matplotlib import pyplot as plt

parser = argparse.ArgumentParser()
parser.add_argument("filename", help="ANLZ0000.DAT file")
args = parser.parse_args()

with open(args.filename, "rb") as file:
    plt.figure()

    file_data = file.read()
    # noinspection PyTypeChecker
    pos = file_data.find(str.encode("PWAV"))
    pos1 = file_data.find(str.encode("PWV2"))
    if pos < 0 or pos1 < 0:
        print("Could not found PWAV or PWV2 data")
        exit(1)
    file_data = list(file_data)

    # skip header
    data = file_data[pos + 0x14 :]
    data1 = file_data[pos1 + 0x14 :]

    ws = 1
    w = int(400 / ws)
    hs = 1
    h = int(32 / hs)

    img = np.zeros([h, w, 3])
    img2 = np.zeros([h, w, 3])
    for x in range(w):
        d1 = data[x]
        d2 = data1[int(x / 4)]
        # front waveform height is d5
        fh = int(d1 % 32)
        fh2 = int(d2 % 32)

        # front waveform luminosity increase (arbitrary)
        fl = 32

        # color waveform
        r = d1 / 32
        g = d1 / 32
        b = d1 / 32

        r1 = d2 / 32
        g1 = d2 / 32
        b1 = d2 / 32

        # img[0:bh, x, 0] = r
        # img[0:bh, x, 1] = g
        # img[0:bh, x, 2] = b

        img[0:fh, x, 0] = r + fl
        img[0:fh, x, 1] = g + fl
        img[0:fh, x, 2] = b + fl

        # # blue waveform
        # r = 95 - d2
        # g = 95 - d2 * 0.5
        # b = 95 - d2 * 0.25

        img2[0:fh2, x, 0] = r1 + fl
        img2[0:fh2, x, 1] = g1 + fl
        img2[0:fh2, x, 2] = b1 + fl

    img = np.clip(img, 0, 127)
    img /= 127
    plt.subplot(2, 1, 1)
    plt.imshow(img, origin="lower", interpolation="bicubic")

    img2 = np.clip(img2, 0, 127)
    img2 /= 127
    plt.subplot(2, 1, 2)
    plt.imshow(img2, origin="lower", interpolation="bicubic")

    plt.show()
    file.close()
