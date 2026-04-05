# scripts/split_dataset.py

import random
import shutil
from pathlib import Path

AI_MODEL_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = AI_MODEL_DIR / "images"
LABELS_DIR = AI_MODEL_DIR / "labels"

SOURCE_SPLIT = "train"  # split this folder into train/val
TRAIN_RATIO = 0.8
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

src_images_dir = IMAGES_DIR / SOURCE_SPLIT
src_labels_dir = LABELS_DIR / SOURCE_SPLIT
train_images_dir = IMAGES_DIR / "train"
val_images_dir = IMAGES_DIR / "val"
train_labels_dir = LABELS_DIR / "train"
val_labels_dir = LABELS_DIR / "val"

for directory in [train_images_dir, val_images_dir, train_labels_dir, val_labels_dir]:
    directory.mkdir(parents=True, exist_ok=True)

images = [p for p in src_images_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
random.shuffle(images)

split_idx = int(len(images) * TRAIN_RATIO)
val_imgs = images[split_idx:]

for img_path in val_imgs:
    label_path = src_labels_dir / img_path.with_suffix(".txt").name
    new_img = val_images_dir / img_path.name
    new_lbl = val_labels_dir / label_path.name

    if new_img.exists():
        new_img.unlink()
    shutil.move(str(img_path), str(new_img))

    if label_path.exists():
        if new_lbl.exists():
            new_lbl.unlink()
        shutil.move(str(label_path), str(new_lbl))

print(f"Total images found in {src_images_dir}: {len(images)}")
print(f"Kept in train: {split_idx}")
print(f"Moved to val: {len(val_imgs)}")
