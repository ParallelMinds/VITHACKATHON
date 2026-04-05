"""
Data augmentation for critical items (Gun/Knife) using Albumentations.
Applies 3x augmentations per image to improve model robustness.

Usage: python augment.py
Requires: pip install albumentations
"""

import albumentations as A
import cv2
import numpy as np
from pathlib import Path
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).resolve().parent

# Source paths — can point to either your main dataset or the extracted critical_items_dataset
SRC_IMAGES = SCRIPT_DIR / "critical_items_dataset" / "images" / "train"
SRC_LABELS = SCRIPT_DIR / "critical_items_dataset" / "labels" / "train"

# Fallback to main dataset if critical items dataset doesn't exist
if not SRC_IMAGES.exists():
    SRC_IMAGES = SCRIPT_DIR / "images" / "train"
    SRC_LABELS = SCRIPT_DIR / "labels" / "train"
    print(f"[INFO] Using main training dataset at {SRC_IMAGES}")
else:
    print(f"[INFO] Using critical items dataset at {SRC_IMAGES}")

if not SRC_IMAGES.exists():
    print(f"[ERROR] Image directory not found: {SRC_IMAGES}")
    exit(1)

# Augmentation pipeline tuned for X-ray imagery
aug = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.7),
    A.Rotate(limit=15, border_mode=cv2.BORDER_CONSTANT, p=0.5),
    A.GaussNoise(p=0.3),
    A.CLAHE(p=0.4),
], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels']))

# Process all training images
image_files = list(SRC_IMAGES.glob("*.jpg")) + list(SRC_IMAGES.glob("*.png"))
print(f"\n[INFO] Found {len(image_files)} images to augment (3x each = {len(image_files)*3} total)")

augmented_count = 0

for img_path in tqdm(image_files, desc="Augmenting"):
    # Skip files already augmented to prevent exponential duplication on re-runs
    if "_aug" in img_path.stem:
        continue
    
    try:
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"[WARN] Failed to read image: {img_path}")
            continue
        
        # Read corresponding label file
        label_file = SRC_LABELS / img_path.with_suffix('.txt').name
        if not label_file.exists():
            print(f"[WARN] Label file not found: {label_file}")
            continue
        
        boxes_raw = label_file.read_text().splitlines()
        bboxes = []
        classes = []
        
        for line in boxes_raw:
            if line.strip():
                parts = line.split()
                if len(parts) >= 5:
                    try:
                        cls = int(parts[0])
                        bbox = list(map(float, parts[1:5]))
                        classes.append(cls)
                        bboxes.append(bbox)
                    except ValueError:
                        continue
        
        if not bboxes:
            print(f"[WARN] No valid bboxes in {label_file}")
            continue
        
        # Generate 3x augmentations per image
        for aug_idx in range(3):
            try:
                result = aug(image=img, bboxes=bboxes, class_labels=classes)
                
                out_name = f"{img_path.stem}_aug{aug_idx}.jpg"
                out_img_path = SRC_IMAGES / out_name
                out_lbl_path = SRC_LABELS / out_name.replace('.jpg', '.txt')
                
                # Save augmented image
                cv2.imwrite(str(out_img_path), result['image'])
                
                # Save augmented labels
                with open(out_lbl_path, 'w') as f:
                    for cls, bbox in zip(result['class_labels'], result['bboxes']):
                        f.write(f"{cls} {' '.join(map(str, bbox))}\n")
                
                augmented_count += 1
            
            except Exception as e:
                print(f"[WARN] Error augmenting {img_path} variant {aug_idx}: {e}")
                continue
    
    except Exception as e:
        print(f"[WARN] Error processing {img_path}: {e}")
        continue

print(f"\n{'='*50}")
print(f"[SUCCESS] Augmentation Complete")
print(f"{'='*50}")
print(f"Original images    : {len(image_files)}")
print(f"Augmented variants : {augmented_count}")
print(f"Total samples      : {len(image_files) + augmented_count}")
print(f"Output directory   : {SRC_IMAGES}")
print(f"{'='*50}")