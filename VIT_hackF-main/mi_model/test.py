"""
Find all test images containing Gun (class 6) or Knife (class 10) detections.
Useful for quick demo/verification of trained model on critical items.
"""

from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
LABELS_DIR = SCRIPT_DIR / "labels" / "test"
IMAGES_DIR = SCRIPT_DIR / "images" / "test"

if not LABELS_DIR.exists():
    print(f"[ERROR] Labels directory not found: {LABELS_DIR}")
    exit(1)

critical_items = set()

for label_file in LABELS_DIR.glob("*.txt"):
    try:
        with open(label_file, "r") as f:
            lines = f.read().strip().split('\n')
        
        classes = []
        for line in lines:
            if line.strip():
                try:
                    class_id = int(line.split()[0])
                    classes.append(class_id)
                except (ValueError, IndexError):
                    continue
        
        # Class 6 = Gun, Class 10 = Knife
        if 6 in classes or 10 in classes:
            img_file = IMAGES_DIR / label_file.stem
            if img_file.with_suffix(".jpg").exists():
                critical_items.add(str(img_file.with_suffix(".jpg")))
            elif img_file.with_suffix(".png").exists():
                critical_items.add(str(img_file.with_suffix(".png")))
    
    except Exception as e:
        print(f"[WARN] Error reading {label_file}: {e}")
        continue

if critical_items:
    print(f"\n[INFO] Found {len(critical_items)} test image(s) with Gun or Knife:\n")
    for img_path in sorted(critical_items):
        print(img_path)
else:
    print("[INFO] No test images found with Gun or Knife annotations.")