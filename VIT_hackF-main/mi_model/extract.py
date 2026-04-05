"""
Extract training and test images containing critical items: Gun (class 6) + Knife (class 10).
Optionally include Bullet (class 7) by editing TARGET_CLASSES.
Creates a focused dataset subset for intense training on critical items.
"""

import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

# Source paths (your current labeled data)
SRC_TRAIN_LABELS = SCRIPT_DIR / "labels" / "train"
SRC_TRAIN_IMAGES = SCRIPT_DIR / "images" / "train"
SRC_TEST_LABELS = SCRIPT_DIR / "labels" / "test"
SRC_TEST_IMAGES = SCRIPT_DIR / "images" / "test"

# Destination paths (extracted critical items only)
DST_DIR = SCRIPT_DIR / "critical_items_dataset"
DST_TRAIN_LABELS = DST_DIR / "labels" / "train"
DST_TRAIN_IMAGES = DST_DIR / "images" / "train"
DST_TEST_LABELS = DST_DIR / "labels" / "test"
DST_TEST_IMAGES = DST_DIR / "images" / "test"

# Class IDs: Gun=6, Knife=10, (optional: Bullet=7)
# Edit TARGET_CLASSES below to include/exclude Bullet
TARGET_CLASSES = {6, 10}  # Gun + Knife only
# TARGET_CLASSES = {6, 7, 10}  # Gun + Bullet + Knife (uncomment if you want all 3)

def extract_dataset(src_labels, src_images, dst_labels, dst_images, split_name):
    """Extract images containing target classes from source to destination."""
    if not src_labels.exists():
        print(f"[SKIP] {split_name} labels not found at {src_labels}")
        return 0
    
    dst_labels.mkdir(parents=True, exist_ok=True)
    dst_images.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for lbl_file in src_labels.glob("*.txt"):
        try:
            lines = lbl_file.read_text().splitlines()
            # Extract class IDs from each line (first column)
            class_ids = set()
            for line in lines:
                if line.strip():
                    try:
                        class_id = int(line.split()[0])
                        class_ids.add(class_id)
                    except (ValueError, IndexError):
                        continue
            
            # If this label contains Gun or Knife, copy it
            if class_ids & TARGET_CLASSES:
                shutil.copy(lbl_file, dst_labels / lbl_file.name)
                
                # Find and copy corresponding image
                for ext in [".jpg", ".jpeg", ".png"]:
                    img_src = src_images / (lbl_file.stem + ext)
                    if img_src.exists():
                        shutil.copy(img_src, dst_images / img_src.name)
                        count += 1
                        break
        
        except Exception as e:
            print(f"[WARN] Error processing {lbl_file.name}: {e}")
            continue
    
    return count

# Extract train and test splits
print("[INFO] Extracting critical items (Gun + Knife) from train split...")
train_count = extract_dataset(SRC_TRAIN_LABELS, SRC_TRAIN_IMAGES, DST_TRAIN_LABELS, DST_TRAIN_IMAGES, "train")

print("[INFO] Extracting critical items (Gun + Knife) from test split...")
test_count = extract_dataset(SRC_TEST_LABELS, SRC_TEST_IMAGES, DST_TEST_LABELS, DST_TEST_IMAGES, "test")

print(f"\n{'='*50}")
print(f"[SUCCESS] Extraction Complete")
print(f"{'='*50}")
print(f"Training images extracted : {train_count}")
print(f"Test images extracted     : {test_count}")
print(f"Total critical items      : {train_count + test_count}")
print(f"Classes extracted         : {sorted(TARGET_CLASSES)} (Gun=6, Knife=10, Bullet=7)")
print(f"Output directory          : {DST_DIR}")
print(f"{'='*50}")