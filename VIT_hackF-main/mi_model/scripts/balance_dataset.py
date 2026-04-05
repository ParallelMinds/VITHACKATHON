"""
STEP 2 — BALANCE DATASET + SAFE AUGMENTATION

What this script does:
1) Scans your YOLO train labels.
2) Keeps ALL weapon images: Gun, Bullet, Knife, Baton.
3) Downsamples majority non-weapon classes to a fixed cap.
4) Keeps a controlled number of background/empty-label images.
5) Creates extra weapon samples using label-safe augmentations:
   - brightness
   - contrast
   - noise
   - CLAHE
   - horizontal flip (with bbox correction)

Important:
- This script does NOT use rotation or scaling augmentations because
  those change bbox geometry and would require full bbox math updates.
- It writes a new balanced dataset into images/balanced and labels/balanced.

Run this AFTER audit.py so you know your counts.
"""

import random
import shutil
from pathlib import Path
from collections import defaultdict, Counter

import cv2
import numpy as np

# ============================================================
# CONFIG
# ============================================================

random.seed(42)
np.random.seed(42)

BASE = r"C:\Users\44184\Desktop\project\Customs_and_Border_Security_model\Ai_model"

IMAGES_SRC = Path(BASE) / "images" / "train"
LABELS_SRC = Path(BASE) / "labels" / "train"

IMAGES_DST = Path(BASE) / "images" / "balanced"
LABELS_DST = Path(BASE) / "labels" / "balanced"

# How many images per non-weapon class to keep at most
TARGET_PER_CLASS = 2500

# Keep a small number of background images so the detector still learns negatives
BACKGROUND_KEEP = 3000

# These are the weapon / critical classes in your dataset
# 0 Baton, 6 Gun, 7 Bullet, 10 Knife
WEAPON_CLASSES = {0, 6, 7, 10}

CLASS_NAMES = {
    0: "Baton",
    1: "Pliers",
    2: "Hammer",
    3: "Powerbank",
    4: "Scissors",
    5: "Wrench",
    6: "Gun",
    7: "Bullet",
    8: "Sprayer",
    9: "HandCuffs",
    10: "Knife",
    11: "Lighter",
}

# If you already created a balanced folder and want to rebuild it from scratch,
# keep this True. It will delete the old balanced output folders.
CLEAR_OUTPUT = True

# ============================================================
# IMAGE HELPERS
# ============================================================

def find_image_file(stem: str) -> Path | None:
    """Find the source image for a label stem."""
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = IMAGES_SRC / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def read_label_text(label_path: Path) -> str:
    """Read label text safely. Empty file -> empty string."""
    if not label_path.exists():
        return ""
    return label_path.read_text().strip()


def parse_label_classes(label_text: str) -> list[int]:
    """Return a list of class ids appearing in one label file."""
    classes = []
    for line in label_text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 5:
            try:
                classes.append(int(parts[0]))
            except ValueError:
                continue
    return classes


# ============================================================
# SAFE AUGMENTATIONS
# ============================================================

def aug_brightness(img, factor=None):
    if factor is None:
        factor = random.uniform(0.7, 1.35)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * factor, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def aug_contrast(img):
    alpha = random.uniform(0.75, 1.25)
    beta = random.randint(-15, 15)
    return np.clip(img.astype(np.float32) * alpha + beta, 0, 255).astype(np.uint8)


def aug_noise(img):
    sigma = random.uniform(4, 12)
    noise = np.random.normal(0, sigma, img.shape).astype(np.float32)
    return np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def aug_clahe(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(
        clipLimit=random.uniform(1.5, 3.0),
        tileGridSize=(8, 8)
    )
    l2 = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l2, a, b]), cv2.COLOR_LAB2BGR)


def flip_labels_horizontal(label_text: str) -> str:
    """
    Flip YOLO labels horizontally.
    YOLO format: class xc yc w h
    """
    out_lines = []
    for line in label_text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue

        cls_id = parts[0]
        try:
            xc = float(parts[1])
            yc = float(parts[2])
            bw = float(parts[3])
            bh = float(parts[4])
        except ValueError:
            continue

        xc = 1.0 - xc
        out_lines.append(f"{cls_id} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")

    return "\n".join(out_lines)


def apply_random_safe_augmentation(img, label_text):
    """
    Apply only label-safe augmentations.
    Horizontal flip is allowed because we update the x-center in labels.
    """
    ops = [
        aug_brightness,
        aug_contrast,
        aug_noise,
        aug_clahe,
    ]

    # 2-3 photometric augmentations
    n_transforms = random.randint(2, 3)
    for op in random.sample(ops, n_transforms):
        img = op(img)

    # Horizontal flip with 50% chance
    if random.random() < 0.5:
        img = cv2.flip(img, 1)
        label_text = flip_labels_horizontal(label_text)

    return img, label_text


# ============================================================
# SAVE HELPERS
# ============================================================

def save_pair(src_stem: str, dst_stem: str, augment: bool = False) -> bool:
    """
    Copy an image + label pair to the balanced dataset.
    If augment=True, apply safe augmentations before saving.
    """
    img_src = find_image_file(src_stem)
    lbl_src = LABELS_SRC / f"{src_stem}.txt"

    if img_src is None or not img_src.exists():
        return False

    img = cv2.imread(str(img_src))
    if img is None:
        return False

    label_text = read_label_text(lbl_src)

    if augment:
        img, label_text = apply_random_safe_augmentation(img, label_text)

    out_img = IMAGES_DST / f"{dst_stem}.png"
    out_lbl = LABELS_DST / f"{dst_stem}.txt"

    cv2.imwrite(str(out_img), img)
    out_lbl.write_text(label_text + ("\n" if label_text else ""))

    return True


def clear_output_dirs():
    """Delete old balanced dataset folders if they exist."""
    if CLEAR_OUTPUT:
        if IMAGES_DST.exists():
            shutil.rmtree(IMAGES_DST)
        if LABELS_DST.exists():
            shutil.rmtree(LABELS_DST)


# ============================================================
# MAIN PIPELINE
# ============================================================

def main():
    if not IMAGES_SRC.exists():
        raise FileNotFoundError(f"Images folder not found: {IMAGES_SRC}")
    if not LABELS_SRC.exists():
        raise FileNotFoundError(f"Labels folder not found: {LABELS_SRC}")

    clear_output_dirs()
    IMAGES_DST.mkdir(parents=True, exist_ok=True)
    LABELS_DST.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("STEP 2 — BALANCE + AUGMENT DATASET")
    print("=" * 70)
    print(f"Source images : {IMAGES_SRC}")
    print(f"Source labels : {LABELS_SRC}")
    print(f"Output images  : {IMAGES_DST}")
    print(f"Output labels  : {LABELS_DST}")
    print()

    # --------------------------------------------------------
    # 1) Scan labels
    # --------------------------------------------------------
    print("[1/5] Scanning labels...")

    all_label_files = sorted(LABELS_SRC.glob("*.txt"))
    if not all_label_files:
        raise RuntimeError(f"No label files found in {LABELS_SRC}")

    class_stems = defaultdict(list)    # class_id -> list of image stems
    weapon_stems = []
    background_stems = []

    total_label_files = len(all_label_files)
    empty_count = 0

    for lf in all_label_files:
        label_text = read_label_text(lf)
        classes_here = parse_label_classes(label_text)

        if not classes_here:
            empty_count += 1
            background_stems.append(lf.stem)
            continue

        unique_classes = set(classes_here)

        for c in unique_classes:
            class_stems[c].append(lf.stem)

        if unique_classes & WEAPON_CLASSES:
            weapon_stems.append(lf.stem)

    weapon_stems = sorted(set(weapon_stems))
    background_stems = sorted(set(background_stems))

    print(f"   Total label files      : {total_label_files:,}")
    print(f"   Labeled images         : {total_label_files - empty_count:,}")
    print(f"   Empty/background files : {empty_count:,}")
    print(f"   Images with weapons    : {len(weapon_stems):,}")
    print(f"   Background images      : {len(background_stems):,}")
    print()

    print("   Class counts:")
    for cls_id in range(12):
        if cls_id in class_stems:
            print(f"     {CLASS_NAMES[cls_id]:12s}: {len(set(class_stems[cls_id])):,}")
        else:
            print(f"     {CLASS_NAMES[cls_id]:12s}: 0")

    # --------------------------------------------------------
    # 2) Build non-weapon pool
    # --------------------------------------------------------
    print("\n[2/5] Building sampled non-weapon pool...")
    non_weapon_pool = []

    for cls_id, stems in class_stems.items():
        if cls_id in WEAPON_CLASSES:
            continue
        unique_stems = sorted(set(stems))
        keep_n = min(len(unique_stems), TARGET_PER_CLASS)
        sampled = random.sample(unique_stems, keep_n)
        non_weapon_pool.extend(sampled)
        print(f"   {CLASS_NAMES[cls_id]:12s}: {len(unique_stems):,} -> keeping {keep_n:,}")

    non_weapon_pool = sorted(set(non_weapon_pool))
    print(f"   Non-weapon pool size  : {len(non_weapon_pool):,}")

    # Background sample
    background_sample_n = min(len(background_stems), BACKGROUND_KEEP)
    background_pool = random.sample(background_stems, background_sample_n) if background_sample_n > 0 else []
    print(f"   Background kept       : {len(background_pool):,}")

    # --------------------------------------------------------
    # 3) Copy all weapon images
    # --------------------------------------------------------
    print(f"\n[3/5] Copying all weapon images...")
    copied_weapon = 0
    for stem in weapon_stems:
        if save_pair(stem, stem, augment=False):
            copied_weapon += 1
    print(f"   Copied weapon images  : {copied_weapon:,}")

    # --------------------------------------------------------
    # 4) Augment weapon images to reach target
    # --------------------------------------------------------
    print(f"\n[4/5] Augmenting weapon images...")
    target_weapon_images = TARGET_PER_CLASS * len(WEAPON_CLASSES)
    augment_target = max(0, target_weapon_images - len(weapon_stems))

    print(f"   Current weapon images : {len(weapon_stems):,}")
    print(f"   Target weapon images  : {target_weapon_images:,}")
    print(f"   Need to generate      : {augment_target:,}")

    aug_count = 0
    if weapon_stems and augment_target > 0:
        idx = 0
        while aug_count < augment_target:
            src_stem = weapon_stems[idx % len(weapon_stems)]
            dst_stem = f"{src_stem}_aug{idx}"
            if save_pair(src_stem, dst_stem, augment=True):
                aug_count += 1
                if aug_count % 500 == 0:
                    print(f"   Generated {aug_count:,} / {augment_target:,}")
            idx += 1

    print(f"   Augmented weapon imgs : {aug_count:,}")

    # --------------------------------------------------------
    # 5) Copy non-weapon + background images
    # --------------------------------------------------------
    print(f"\n[5/5] Copying non-weapon and background images...")
    copied_non_weapon = 0
    for stem in non_weapon_pool:
        if save_pair(stem, stem, augment=False):
            copied_non_weapon += 1

    copied_background = 0
    for stem in background_pool:
        if save_pair(stem, stem, augment=False):
            copied_background += 1

    print(f"   Copied non-weapon     : {copied_non_weapon:,}")
    print(f"   Copied background     : {copied_background:,}")

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------
    total_out_labels = len(list(LABELS_DST.glob("*.txt")))
    total_out_images = len(list(IMAGES_DST.glob("*.*")))

    print("\n" + "=" * 70)
    print("BALANCED DATASET READY")
    print("=" * 70)
    print(f"   Output label files    : {total_out_labels:,}")
    print(f"   Output image files    : {total_out_images:,}")
    print(f"   Weapon originals      : {copied_weapon:,}")
    print(f"   Weapon augmentations  : {aug_count:,}")
    print(f"   Non-weapon kept       : {copied_non_weapon:,}")
    print(f"   Background kept       : {copied_background:,}")
    print()
    print(f"   Images saved to       : {IMAGES_DST}")
    print(f"   Labels saved to       : {LABELS_DST}")
    print("\nNext: point your YAML train/val paths to the balanced dataset.")

if __name__ == "__main__":
    main()