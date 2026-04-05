from ultralytics import YOLO
from pathlib import Path

if __name__ == "__main__":
    model = YOLO(str(Path(__file__).resolve().parent / "best.pt"))

    model.train(
    data="focused.yaml",
    epochs=40,
    imgsz=640,
    batch=6,          # reduced from 12 — fits 4GB VRAM
    lr0=0.001,
    lrf=0.01,
    warmup_epochs=2,
    patience=10,
    cls=1.5,
    device=0,
    project="runs/detect",
    name="focused_finetune",
    exist_ok=True,
    workers=2,        # reduced from 8 — fixes the MemoryError on Windows
    cache=False,      # don't cache 20k images in RAM
    amp=True,         # mixed precision — halves VRAM usage
)