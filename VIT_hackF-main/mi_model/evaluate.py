from ultralytics import YOLO
from pathlib import Path

def main():
    ROOT = Path(__file__).resolve().parent
    model_path = ROOT / "best.pt"

    if not model_path.exists():
        model_path = Path(__file__).resolve().parent / "best.pt"
        if not model_path.exists():
            print(f"[ERROR] Model not found at {model_path}")
            return

    print(f"[INFO] Loading model from: {model_path}")
    model = YOLO(str(model_path))

    metrics = model.val(
        data=str(ROOT / "data/balanced.yaml"),
        split='val',
        conf=0.25,
        iou=0.5,
        augment=False,
        save_json=True,
        plots=True,
        workers=4   # 🔥 IMPORTANT FIX
    )

    print(f"\n{'='*50}")
    print(f"         HACKATHON RESULTS — PIDRAY")
    print(f"{'='*50}")
    print(f"mAP50:      {metrics.box.map50:.4f}")
    print(f"mAP50-95:   {metrics.box.map:.4f}")
    print(f"Precision:  {metrics.box.mp:.4f}")
    print(f"Recall:     {metrics.box.mr:.4f}")
    print(f"{'='*50}")

    print(f"\nPer-class AP:")
    for i, name in enumerate(model.names.values()):
        print(f"  {name:12s}: AP50 = {metrics.box.ap50[i]:.4f}")

    print(f"\nSaved to: {metrics.save_dir}")

if __name__ == "__main__":
    main()