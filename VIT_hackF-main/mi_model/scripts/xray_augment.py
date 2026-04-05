# scripts/xray_augment.py
import cv2
import numpy as np
import random
from pathlib import Path


def clahe_enhance(img_bgr):
    """Boost local contrast — critical for X-ray density regions."""
    lab  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab   = cv2.merge([clahe.apply(l), a, b])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def density_jitter(img_bgr, factor_range=(0.75, 1.25)):
    """
    Simulate different material densities / scanner calibration drift.
    Multiplies pixel intensity by a random factor per channel.
    """
    factors = [random.uniform(*factor_range) for _ in range(3)]
    out = img_bgr.astype(np.float32)
    for c, f in enumerate(factors):
        out[:, :, c] *= f
    return np.clip(out, 0, 255).astype(np.uint8)


def random_erase(img_bgr, boxes_xyxy, erase_prob=0.3, max_erase_ratio=0.4):
    """
    Randomly erase rectangular regions to simulate occlusion.
    Avoids erasing the center of annotated boxes.
    boxes_xyxy: list of [x1,y1,x2,y2] in pixel coords.
    """
    if random.random() > erase_prob:
        return img_bgr
    h, w = img_bgr.shape[:2]
    out  = img_bgr.copy()
    n_erases = random.randint(1, 3)
    for _ in range(n_erases):
        rw = int(w * random.uniform(0.05, max_erase_ratio))
        rh = int(h * random.uniform(0.05, max_erase_ratio))
        rx = random.randint(0, w - rw)
        ry = random.randint(0, h - rh)
        # fill with noise to simulate dense cargo
        noise = np.random.randint(50, 180, (rh, rw, 3), dtype=np.uint8)
        out[ry:ry+rh, rx:rx+rw] = noise
    return out


def overlay_weapon_crop(
        base_img_bgr,
        weapon_crop_bgr,
        alpha_range=(0.55, 0.85),
):
    """
    Synthetically superimpose a weapon crop onto a benign X-ray.
    This directly simulates the concealment/overlap problem.

    Usage:
        base   = benign cargo X-ray
        weapon = cropped gun/knife region from another X-ray
    """
    h, w  = base_img_bgr.shape[:2]
    wh, ww = weapon_crop_bgr.shape[:2]

    # Random placement, random scale
    scale = random.uniform(0.5, 1.2)
    new_w = max(30, int(ww * scale))
    new_h = max(30, int(wh * scale))
    new_w = min(new_w, w - 10)
    new_h = min(new_h, h - 10)
    weapon_resized = cv2.resize(weapon_crop_bgr, (new_w, new_h))

    x1 = random.randint(0, w - new_w)
    y1 = random.randint(0, h - new_h)
    alpha = random.uniform(*alpha_range)

    roi    = base_img_bgr[y1:y1+new_h, x1:x1+new_w].astype(np.float32)
    weapon = weapon_resized.astype(np.float32)
    blended = cv2.addWeighted(roi, 1 - alpha, weapon, alpha, 0)

    out = base_img_bgr.copy()
    out[y1:y1+new_h, x1:x1+new_w] = blended.astype(np.uint8)

    # Return image and the new bounding box (normalised YOLO format)
    cx = (x1 + new_w / 2) / w
    cy = (y1 + new_h / 2) / h
    bw = new_w / w
    bh = new_h / h
    return out, (cx, cy, bw, bh)


def augment_xray(img_bgr, boxes_xyxy=None, strong=False):
    """
    Master augmentation function.
    strong=True  → heavier augmentation for Gun/Knife (critical classes)
    strong=False → lighter for other classes
    """
    img = clahe_enhance(img_bgr)
    img = density_jitter(img, factor_range=(0.7, 1.3) if strong else (0.85, 1.15))

    # Always flip horizontally
    if random.random() > 0.5:
        img = cv2.flip(img, 1)
        if boxes_xyxy:
            w = img.shape[1]
            boxes_xyxy = [[w - x2, y1, w - x1, y2]
                          for x1, y1, x2, y2 in boxes_xyxy]

    # Full rotation for X-ray (items can be at any angle on belt)
    angle = random.uniform(-180, 180) if strong else random.uniform(-30, 30)
    h, w  = img.shape[:2]
    M     = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    img   = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)

    if boxes_xyxy:
        img = random_erase(img, boxes_xyxy, erase_prob=0.4 if strong else 0.2)

    return img