"""
STEP 1 — DATASET AUDIT
Run this first. Shows exact class distribution so we know
what we're working with before touching any data.
"""

import os
from pathlib import Path
from collections import defaultdict

BASE = r"C:\Users\44184\Desktop\project\Customs_and_Border_Security_model\Ai_model"
LABELS_DIR = Path(BASE) / "labels" / "train"

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

# Lethal/critical weapon classes we want to boost
WEAPON_CLASSES = {6, 7, 10, 0}   # Gun, Bullet, Knife, Baton

print("Scanning labels directory...")
print(f"Path: {LABELS_DIR}\n")

# Count images per class
images_per_class   = defaultdict(int)   # how many images contain this class
instances_per_class = defaultdict(int)  # total annotation instances

# Track which images contain weapons
weapon_images  = set()
all_label_files = list(LABELS_DIR.glob("*.txt"))
total_files     = len(all_label_files)

print(f"Total label files: {total_files:,}")
print("Scanning...\n")

empty_count = 0

for label_file in all_label_files:
    classes_in_image = set()
    with open(label_file) as f:
        lines = [l.strip() for l in f if l.strip()]

    if not lines:
        empty_count += 1
        continue

    for line in lines:
        cls = int(line.split()[0])
        classes_in_image.add(cls)
        instances_per_class[cls] += 1

    for cls in classes_in_image:
        images_per_class[cls] += 1

    if classes_in_image & WEAPON_CLASSES:
        weapon_images.add(label_file.stem)

# Print results
print("=" * 55)
print(f"{'CLASS':<14} {'IMAGES':>8} {'INSTANCES':>10} {'TYPE':>12}")
print("=" * 55)

sorted_classes = sorted(images_per_class.items(), key=lambda x: x[1], reverse=True)

for cls_id, img_count in sorted_classes:
    name     = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
    inst     = instances_per_class[cls_id]
    tag      = "*** WEAPON ***" if cls_id in WEAPON_CLASSES else ""
    print(f"{name:<14} {img_count:>8,} {inst:>10,} {tag:>12}")

print("=" * 55)
print(f"\nTotal labelled images : {total_files - empty_count:,}")
print(f"Empty label files     : {empty_count:,}  (background/negative)")
print(f"Images with weapons   : {len(weapon_images):,}")
print(f"Weapon image ratio    : {len(weapon_images)/(total_files)*100:.1f}%")

max_class = max(images_per_class.values())
min_class = min(images_per_class.values())
print(f"\nImbalance ratio       : {max_class/min_class:.1f}x")
print(f"  Most common class   : {CLASS_NAMES[max(images_per_class, key=images_per_class.get)]} ({max_class:,})")
print(f"  Rarest class        : {CLASS_NAMES[min(images_per_class, key=images_per_class.get)]} ({min_class:,})")

print("\nSave this output — needed for Step 2.")