import json, os
from pathlib import Path
from tqdm import tqdm

def convert(json_path, output_labels_dir):
    os.makedirs(output_labels_dir, exist_ok=True)
    
    with open(json_path) as f:
        coco = json.load(f)
    
    id_to_img = {img['id']: img for img in coco['images']}
    cat_to_idx = {cat['id']: i for i, cat in enumerate(coco['categories'])}
    
    # Group annotations by image
    anns_by_img = {}
    for ann in coco['annotations']:
        anns_by_img.setdefault(ann['image_id'], []).append(ann)
    
    for img in tqdm(coco['images'], desc=f"Converting {Path(json_path).stem}"):
        iw, ih = img['width'], img['height']
        lines = []
        for ann in anns_by_img.get(img['id'], []):
            x, y, w, h = ann['bbox']
            xc = max(0, min(1, (x + w/2) / iw))
            yc = max(0, min(1, (y + h/2) / ih))
            wn = max(0, min(1, w / iw))
            hn = max(0, min(1, h / ih))
            lines.append(f"{cat_to_idx[ann['category_id']]} {xc:.6f} {yc:.6f} {wn:.6f} {hn:.6f}")
        
        label_file = Path(output_labels_dir) / (Path(img['file_name']).stem + '.txt')
        with open(label_file, 'w') as f:
            f.write('\n'.join(lines))
    
    print(f"✅ Done! Categories:")
    for cat in coco['categories']:
        print(f"  {cat_to_idx[cat['id']]}: {cat['name']}")

# Use script directory as base (works everywhere relative paths are from Ai_model folder)
BASE = Path(__file__).resolve().parent

convert(str(BASE / "annotation" / "train.json"), str(BASE / "labels" / "train"))
convert(str(BASE / "annotation" / "test.json"),  str(BASE / "labels" / "test"))