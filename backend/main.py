"""
Deep CargoVision — FastAPI Backend
Runs YOLO inference on uploaded cargo X-ray images.
Supports both YOLO-baseline and EfficientNet two-stage pipeline.
"""
import os
import csv
import io
import json
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np

# Import EfficientNet pipeline
import inference_pipeline

# ─── Helper: Convert numpy types to Python native types ───────────────────────
def convert_to_native_python(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: convert_to_native_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native_python(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

# ─── Canonical Class Map ──────────────────────────────────────────────────────
# NOTE: This order MUST match the YOLO model's training order!
# Do NOT reorder these without retraining the model.
CLASS_NAMES = [
    'Baton',         # 0
    'Pliers',        # 1
    'Hammer',        # 2
    'Powerbank',     # 3
    'Scissors',      # 4
    'Wrench',        # 5
    'Gun',           # 6
    'Bullet',        # 7
    'Sprayer',       # 8
    'HandCuffs',     # 9
    'Knife',         # 10
    'Lighter'        # 11
]

CLASS_MAP = {i: name for i, name in enumerate(CLASS_NAMES)}

# ─── Wildlife Smuggling Classes ────────────────────────────────────────────────
WILDLIFE_CLASS_NAMES = [
    'Reptile',       # 0
    'Bird',          # 1
    'Mammal',        # 2
    'Organic Mass'   # 3
]

WILDLIFE_CLASS_MAP = {i: name for i, name in enumerate(WILDLIFE_CLASS_NAMES)}

# ─── Liquid Detection Classes ──────────────────────────────────────────────────
LIQUID_DETECTION_CLASS_NAMES = [
    'Cans',           # 0
    'CartonDrinks',   # 1
    'GlassBottle',    # 2
    'PlasticBottle',  # 3
    'SprayCans',      # 4
    'Tin',            # 5
    'VacuumCup'       # 6
]

LIQUID_DETECTION_CLASS_MAP = {i: name for i, name in enumerate(LIQUID_DETECTION_CLASS_NAMES)}

# ─── Inference Thresholds ─────────────────────────────────────────────────────
CONF_THRESHOLD = 0.45
IOU_THRESHOLD  = 0.50

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Deep CargoVision API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load YOLO Model ──────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "yolo-baseline" / "best.pt"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"YOLO model not found at {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))
print(f"✅ YOLO model loaded from {MODEL_PATH}")

# Validate class count matches
if len(model.names) != len(CLASS_NAMES):
    raise ValueError(
        f"Model has {len(model.names)} classes but CLASS_NAMES defines {len(CLASS_NAMES)}. "
        f"Model classes: {model.names}"
    )

# Warn if individual names differ (order is what matters, but good to flag)
for i, (model_name, our_name) in enumerate(zip(model.names.values(), CLASS_NAMES)):
    if model_name.lower() != our_name.lower():
        print(f"⚠️  Class {i} mismatch — model says '{model_name}', we expect '{our_name}'")

print(f"   Class map: {CLASS_MAP}")


# ─── Load Wildlife Model ───────────────────────────────────────────────────────
WILDLIFE_MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "wildlife-smuggling" / "best.pt"

wildlife_model = None
if WILDLIFE_MODEL_PATH.exists():
    try:
        wildlife_model = YOLO(str(WILDLIFE_MODEL_PATH))
        print(f"✅ Wildlife model loaded from {WILDLIFE_MODEL_PATH}")
        
        # Validate class count matches
        if len(wildlife_model.names) != len(WILDLIFE_CLASS_NAMES):
            print(f"⚠️  Wildlife model has {len(wildlife_model.names)} classes but WILDLIFE_CLASS_NAMES defines {len(WILDLIFE_CLASS_NAMES)}")
            print(f"   Model classes: {wildlife_model.names}")
        
        print(f"   Wildlife class map: {WILDLIFE_CLASS_MAP}")
    except Exception as e:
        print(f"⚠️  Failed to load wildlife model: {e}")
        wildlife_model = None
else:
    print(f"⚠️  Wildlife model not found at {WILDLIFE_MODEL_PATH}")

# ─── Load Liquid Detection Model ───────────────────────────────────────────────
LIQUID_DETECTION_MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "liquid-detection" / "best.pt"

liquid_detection_model = None
if LIQUID_DETECTION_MODEL_PATH.exists():
    try:
        liquid_detection_model = YOLO(str(LIQUID_DETECTION_MODEL_PATH))
        print(f"✅ Liquid detection model loaded from {LIQUID_DETECTION_MODEL_PATH}")
        
        # Validate class count matches
        if len(liquid_detection_model.names) != len(LIQUID_DETECTION_CLASS_NAMES):
            print(f"⚠️  Liquid detection model has {len(liquid_detection_model.names)} classes but LIQUID_DETECTION_CLASS_NAMES defines {len(LIQUID_DETECTION_CLASS_NAMES)}")
            print(f"   Model classes: {liquid_detection_model.names}")
        
        print(f"   Liquid detection class map: {LIQUID_DETECTION_CLASS_MAP}")
    except Exception as e:
        print(f"⚠️  Failed to load liquid detection model: {e}")
        liquid_detection_model = None
else:
    print(f"⚠️  Liquid detection model not found at {LIQUID_DETECTION_MODEL_PATH}")

def _run_inference_on_path(tmp_path: str):
    """Run YOLO inference on a temp file path and return (detections, w, h)."""
    results = model(
        tmp_path,
        conf=CONF_THRESHOLD,
        iou=IOU_THRESHOLD,
        agnostic_nms=True,
    )

    detections = []
    img_width = img_height = 0

    for r in results:
        if r.orig_img is not None:
            img_height, img_width = r.orig_img.shape[:2]
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls   = int(box.cls[0])
            conf  = float(box.conf[0])
            label = CLASS_MAP.get(cls, f"unknown_{cls}")
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "label":      label,
                "confidence": round(conf, 4),
                "x":          round(x1, 2),
                "y":          round(y1, 2),
                "width":      round(x2 - x1, 2),
                "height":     round(y2 - y1, 2),
                "type":       "detection",
            })

    return detections, img_width, img_height


def _run_wildlife_inference_on_path(tmp_path: str):
    """Run wildlife model inference on a temp file path and return (detections, w, h)."""
    if wildlife_model is None:
        raise HTTPException(status_code=503, detail="Wildlife model not available")
    
    results = wildlife_model(
        tmp_path,
        conf=CONF_THRESHOLD,
        iou=IOU_THRESHOLD,
        agnostic_nms=True,
    )

    detections = []
    img_width = img_height = 0

    for r in results:
        if r.orig_img is not None:
            img_height, img_width = r.orig_img.shape[:2]
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls   = int(box.cls[0])
            conf  = float(box.conf[0])
            label = WILDLIFE_CLASS_MAP.get(cls, f"unknown_{cls}")
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "label":      label,
                "confidence": round(conf, 4),
                "x":          round(x1, 2),
                "y":          round(y1, 2),
                "width":      round(x2 - x1, 2),
                "height":     round(y2 - y1, 2),
                "type":       "detection",
            })

    return detections, img_width, img_height

def _run_liquid_detection_inference_on_path(tmp_path: str):
    """Run liquid detection model inference on a temp file path and return (detections, w, h)."""
    if liquid_detection_model is None:
        raise HTTPException(status_code=503, detail="Liquid detection model not available")
    
    results = liquid_detection_model(
        tmp_path,
        conf=CONF_THRESHOLD,
        iou=IOU_THRESHOLD,
        agnostic_nms=True,
    )

    detections = []
    img_width = img_height = 0

    for r in results:
        if r.orig_img is not None:
            img_height, img_width = r.orig_img.shape[:2]
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls   = int(box.cls[0])
            conf  = float(box.conf[0])
            label = LIQUID_DETECTION_CLASS_MAP.get(cls, f"unknown_{cls}")
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "label":      label,
                "confidence": round(conf, 4),
                "x":          round(x1, 2),
                "y":          round(y1, 2),
                "width":      round(x2 - x1, 2),
                "height":     round(y2 - y1, 2),
                "type":       "detection",
            })

    return detections, img_width, img_height

# ─── Manifest / CSV Helpers ───────────────────────────────────────────────────
def _normalize_category(value: str) -> str:
    return (value or "").strip().lower().replace("-", " ").replace("_", " ")


def _parse_manifest_counts(csv_text: str):
    reader = csv.DictReader(io.StringIO(csv_text))
    fieldnames = reader.fieldnames or []
    normalized_fields = {f.strip().lower() for f in fieldnames}
    required_fields = {"tracking_id", "item_description", "category", "quantity"}

    if not required_fields.issubset(normalized_fields):
        raise HTTPException(
            status_code=400,
            detail="CSV must include headers: Tracking_ID, Item_Description, Category, Quantity",
        )

    manifest_counts = defaultdict(int)
    for row in reader:
        category = _normalize_category(row.get("Category") or row.get("category") or "")
        quantity_raw = (row.get("Quantity") or row.get("quantity") or "0").strip()

        if not category:
            continue

        try:
            quantity = int(quantity_raw)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid quantity value in CSV: {quantity_raw}")

        if quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity cannot be negative")

        manifest_counts[category] += quantity

    return dict(manifest_counts)


def _build_detection_counts(detections: List[dict]):
    detection_counts = defaultdict(int)
    for detection in detections:
        detection_counts[_normalize_category(detection.get("label", ""))] += 1
    return dict(detection_counts)


# ─── Single Predict Endpoint ──────────────────────────────────────────────────
@app.post("/predict")
async def predict(file: UploadFile = File(...), csv_file: Optional[UploadFile] = File(None)):
    """
    Accept an image file, run YOLO inference, return detections
    in a format compatible with the React frontend ImageViewer.
    Optionally accepts a CSV manifest to compare detected vs declared items.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    csv_summary = None
    manifest_counts = None
    if csv_file is not None:
        csv_name = (csv_file.filename or "").lower()
        if not csv_name.endswith(".csv"):
            raise HTTPException(status_code=400, detail="CSV file must have a .csv extension")

        csv_bytes = await csv_file.read()
        try:
            csv_text = csv_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")

        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)
        header = rows[0] if rows else []
        manifest_counts = _parse_manifest_counts(csv_text)
        csv_summary = {
            "filename": csv_file.filename,
            "rows": max(len(rows) - 1, 0) if rows else 0,
            "columns": len(header),
            "header": header,
        }

    try:
        detections, img_width, img_height = _run_inference_on_path(tmp_path)
        manifest_match = None
        detection_counts = None
        manifest_mismatch_details = None

        if manifest_counts is not None:
            detection_counts = _build_detection_counts(detections)
            all_categories = sorted(set(manifest_counts.keys()) | set(detection_counts.keys()))
            mismatches = []

            for category in all_categories:
                expected_qty = manifest_counts.get(category, 0)
                detected_qty = detection_counts.get(category, 0)
                if expected_qty != detected_qty:
                    mismatches.append({
                        "category": category,
                        "manifest_quantity": expected_qty,
                        "detected_quantity": detected_qty,
                    })

            manifest_match = len(mismatches) == 0
            if not manifest_match:
                manifest_mismatch_details = {
                    "message": "Manifest and detected items do not match. The person must be interrogated.",
                    "differences": mismatches,
                }

        return {
            "detections":             detections,
            "image_width":            img_width,
            "image_height":           img_height,
            "model":                  "yolo-baseline",
            "total_detections":       len(detections),
            "manifest_processed":     csv_summary is not None,
            "manifest_summary":       csv_summary,
            "manifest_match":         manifest_match,
            "manifest_counts":        manifest_counts,
            "detection_counts":       detection_counts,
            "manifest_mismatch_details": manifest_mismatch_details,
            "thresholds":             {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
        }
    finally:
        os.unlink(tmp_path)


# ─── Batch Predict Endpoint ───────────────────────────────────────────────────
@app.post("/predict-batch")
async def predict_batch(files: List[UploadFile] = File(...)):
    """
    Accept multiple image files, run YOLO inference on each, and return:
    - per_image: individual results per file
    - aggregates: class frequency, confidence distribution, summary stats
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    MAX_BATCH = 50
    if len(files) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Max {MAX_BATCH} images per batch")

    # Read all file bytes first (async)
    file_records = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            continue
        suffix = os.path.splitext(f.filename or "upload.jpg")[1] or ".jpg"
        data = await f.read()
        file_records.append((f.filename or f"image_{len(file_records)}", suffix, data))

    if not file_records:
        raise HTTPException(status_code=400, detail="No valid image files found")

    # Write to temp files
    tmp_paths = []
    for _, suffix, data in file_records:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_paths.append(tmp.name)

    all_detections = []
    per_image = []

    try:
        for idx, (tmp_path, (filename, _, _)) in enumerate(zip(tmp_paths, file_records)):
            detections, img_width, img_height = _run_inference_on_path(tmp_path)
            per_image.append({
                "filename":         filename,
                "index":            idx,
                "detections":       detections,
                "total_detections": len(detections),
                "image_width":      img_width,
                "image_height":     img_height,
                "has_threat":       len(detections) > 0,
            })
            all_detections.extend(detections)

        # ── Aggregate stats ────────────────────────────────────────────────
        total_images   = len(per_image)
        flagged_images = sum(1 for img in per_image if img["has_threat"])
        clean_images   = total_images - flagged_images

        # Class frequency
        class_freq = {name: 0 for name in CLASS_NAMES}
        for d in all_detections:
            if d["label"] in class_freq:
                class_freq[d["label"]] += 1

        # Confidence distribution buckets
        conf_buckets = {
            "0.45-0.5": 0,
            "0.5-0.6": 0,
            "0.6-0.7": 0,
            "0.7-0.8": 0,
            "0.8-0.9": 0,
            "0.9-1.0": 0,
        }
        for d in all_detections:
            c = d["confidence"]
            if c < 0.5:
                conf_buckets["0.45-0.5"] += 1
            elif c < 0.6:
                conf_buckets["0.5-0.6"] += 1
            elif c < 0.7:
                conf_buckets["0.6-0.7"] += 1
            elif c < 0.8:
                conf_buckets["0.7-0.8"] += 1
            elif c < 0.9:
                conf_buckets["0.8-0.9"] += 1
            else:
                conf_buckets["0.9-1.0"] += 1

        # Detections per image (for trend chart)
        detections_series = [
            {
                "name":  (img["filename"][:14] + "…") if len(img["filename"]) > 15 else img["filename"],
                "index": img["index"] + 1,
                "count": img["total_detections"],
            }
            for img in per_image
        ]

        avg_conf = (
            sum(d["confidence"] for d in all_detections) / len(all_detections)
            if all_detections else 0.0
        )

        return {
            "model":             "yolo-baseline",
            "total_images":      total_images,
            "flagged_images":    flagged_images,
            "clean_images":      clean_images,
            "total_detections":  len(all_detections),
            "avg_confidence":    round(avg_conf, 4),
            "thresholds":        {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
            "per_image":         per_image,
            "class_frequency":   class_freq,
            "conf_distribution": conf_buckets,
            "detections_series": detections_series,
        }

    finally:
        for p in tmp_paths:
            try:
                os.unlink(p)
            except Exception:
                pass


# ─── EfficientNet Pipeline Endpoints (Two-Stage: YOLO → ResNet18) ─────────────
@app.post("/predict-efficientnet")
async def predict_efficientnet(file: UploadFile = File(...)):
    """
    Accept an image file, run EfficientNet two-stage pipeline:
    1. YOLO detection
    2. ResNet18 classifier (per detection)
    3. Risk scoring (YOLO 60% + Classifier 40%, CLIP dropped)

    Returns detections with super_class, cls_prob, and risk_score.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        detections, img_width, img_height = inference_pipeline.run_pipeline(tmp_path)
        response = {
            "detections":       detections,
            "image_width":      img_width,
            "image_height":     img_height,
            "model":            "efficientnet-pipeline",
            "total_detections": len(detections),
        }
        return convert_to_native_python(response)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/predict-batch-efficientnet")
async def predict_batch_efficientnet(files: List[UploadFile] = File(...)):
    """
    Accept multiple image files, run EfficientNet two-stage pipeline on each.

    Returns:
    - per_image: individual results per file
    - aggregates: class frequency, confidence distribution, summary stats
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    MAX_BATCH = 50
    if len(files) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Max {MAX_BATCH} images per batch")

    # Read all file bytes first
    file_records = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            continue
        suffix = os.path.splitext(f.filename or "upload.jpg")[1] or ".jpg"
        data = await f.read()
        file_records.append((f.filename or f"image_{len(file_records)}", suffix, data))

    if not file_records:
        raise HTTPException(status_code=400, detail="No valid image files found")

    # Write to temp files
    tmp_paths = []
    for _, suffix, data in file_records:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_paths.append(tmp.name)

    all_detections = []
    per_image = []

    try:
        for idx, (tmp_path, (filename, _, _)) in enumerate(zip(tmp_paths, file_records)):
            detections, img_width, img_height = inference_pipeline.run_pipeline(tmp_path)
            per_image.append({
                "filename":         filename,
                "index":            idx,
                "detections":       detections,
                "total_detections": len(detections),
                "image_width":      img_width,
                "image_height":     img_height,
                "has_threat":       len(detections) > 0,
            })
            all_detections.extend(detections)

        # ── Aggregate stats ────────────────────────────────────────────────
        total_images   = len(per_image)
        flagged_images = sum(1 for img in per_image if img["has_threat"])
        clean_images   = total_images - flagged_images

        # Class frequency
        class_freq = {name: 0 for name in inference_pipeline.CLASS_NAMES}
        for d in all_detections:
            if d["label"] in class_freq:
                class_freq[d["label"]] += 1

        # Confidence distribution buckets
        conf_buckets = {
            "0.15-0.3": 0,
            "0.3-0.5": 0,
            "0.5-0.7": 0,
            "0.7-0.85": 0,
            "0.85-1.0": 0,
        }
        for d in all_detections:
            c = d["confidence"]
            if c < 0.3:
                conf_buckets["0.15-0.3"] += 1
            elif c < 0.5:
                conf_buckets["0.3-0.5"] += 1
            elif c < 0.7:
                conf_buckets["0.5-0.7"] += 1
            elif c < 0.85:
                conf_buckets["0.7-0.85"] += 1
            else:
                conf_buckets["0.85-1.0"] += 1

        # Detections per image
        detections_series = [
            {
                "name":  (img["filename"][:14] + "…") if len(img["filename"]) > 15 else img["filename"],
                "index": img["index"] + 1,
                "count": img["total_detections"],
            }
            for img in per_image
        ]

        avg_conf = (
            sum(d["confidence"] for d in all_detections) / len(all_detections)
            if all_detections else 0.0
        )

        # Risk level distribution
        risk_dist = {"high": 0, "medium": 0, "low": 0}
        for d in all_detections:
            risk_level = d.get("risk_level", "low")
            if risk_level in risk_dist:
                risk_dist[risk_level] += 1

        response = {
            "model":             "efficientnet-pipeline",
            "total_images":      total_images,
            "flagged_images":    flagged_images,
            "clean_images":      clean_images,
            "total_detections":  len(all_detections),
            "avg_confidence":    round(avg_conf, 4),
            "per_image":         per_image,
            "class_frequency":   class_freq,
            "conf_distribution": conf_buckets,
            "risk_distribution": risk_dist,
            "detections_series": detections_series,
        }
        return convert_to_native_python(response)

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch pipeline error: {str(e)}")
    finally:
        for p in tmp_paths:
            try:
                os.unlink(p)
            except Exception:
                pass


# ─── Wildlife Smuggling Detection Endpoints ────────────────────────────────────
@app.post("/predict-wildlife")
async def predict_wildlife(file: UploadFile = File(...)):
    """
    Accept an image file, run wildlife model inference to detect reptiles and birds.
    """
    if wildlife_model is None:
        raise HTTPException(status_code=503, detail="Wildlife model not available")
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        detections, img_width, img_height = _run_wildlife_inference_on_path(tmp_path)

        return {
            "detections":             detections,
            "image_width":            img_width,
            "image_height":           img_height,
            "model":                  "wildlife-smuggling",
            "total_detections":       len(detections),
            "manifest_processed":     False,
            "manifest_summary":       None,
            "manifest_match":         None,
            "manifest_counts":        None,
            "detection_counts":       None,
            "manifest_mismatch_details": None,
            "thresholds":             {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
        }
    finally:
        os.unlink(tmp_path)


@app.post("/predict-batch-wildlife")
async def predict_batch_wildlife(files: List[UploadFile] = File(...)):
    """
    Accept multiple image files, run wildlife model inference on each.
    Detects reptiles and birds for wildlife smuggling detection.
    """
    if wildlife_model is None:
        raise HTTPException(status_code=503, detail="Wildlife model not available")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    MAX_BATCH = 50
    if len(files) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Max {MAX_BATCH} images per batch")

    # Read all file bytes first (async)
    file_records = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            continue
        suffix = os.path.splitext(f.filename or "upload.jpg")[1] or ".jpg"
        data = await f.read()
        file_records.append((f.filename or f"image_{len(file_records)}", suffix, data))

    if not file_records:
        raise HTTPException(status_code=400, detail="No valid image files found")

    # Write to temp files
    tmp_paths = []
    for _, suffix, data in file_records:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_paths.append(tmp.name)

    all_detections = []
    per_image = []

    try:
        for idx, (tmp_path, (filename, _, _)) in enumerate(zip(tmp_paths, file_records)):
            detections, img_width, img_height = _run_wildlife_inference_on_path(tmp_path)
            per_image.append({
                "filename":         filename,
                "index":            idx,
                "detections":       detections,
                "total_detections": len(detections),
                "image_width":      img_width,
                "image_height":     img_height,
                "has_threat":       len(detections) > 0,
            })
            all_detections.extend(detections)

        # ── Aggregate stats ────────────────────────────────────────────────
        total_images   = len(per_image)
        flagged_images = sum(1 for img in per_image if img["has_threat"])
        clean_images   = total_images - flagged_images

        # Class frequency
        class_freq = {name: 0 for name in WILDLIFE_CLASS_NAMES}
        for d in all_detections:
            if d["label"] in class_freq:
                class_freq[d["label"]] += 1

        # Confidence distribution buckets
        conf_buckets = {
            "0.45-0.5": 0,
            "0.5-0.6": 0,
            "0.6-0.7": 0,
            "0.7-0.8": 0,
            "0.8-0.9": 0,
            "0.9-1.0": 0,
        }
        for d in all_detections:
            c = d["confidence"]
            if c < 0.5:
                conf_buckets["0.45-0.5"] += 1
            elif c < 0.6:
                conf_buckets["0.5-0.6"] += 1
            elif c < 0.7:
                conf_buckets["0.6-0.7"] += 1
            elif c < 0.8:
                conf_buckets["0.7-0.8"] += 1
            elif c < 0.9:
                conf_buckets["0.8-0.9"] += 1
            else:
                conf_buckets["0.9-1.0"] += 1

        # Detections per image (for trend chart)
        detections_series = [
            {
                "name":  (img["filename"][:14] + "…") if len(img["filename"]) > 15 else img["filename"],
                "index": img["index"] + 1,
                "count": img["total_detections"],
            }
            for img in per_image
        ]

        avg_conf = (
            sum(d["confidence"] for d in all_detections) / len(all_detections)
            if all_detections else 0.0
        )

        return {
            "model":             "wildlife-smuggling",
            "total_images":      total_images,
            "flagged_images":    flagged_images,
            "clean_images":      clean_images,
            "total_detections":  len(all_detections),
            "avg_confidence":    round(avg_conf, 4),
            "thresholds":        {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
            "per_image":         per_image,
            "class_frequency":   class_freq,
            "conf_distribution": conf_buckets,
            "detections_series": detections_series,
        }

    finally:
        for p in tmp_paths:
            try:
                os.unlink(p)
            except Exception:
                pass


# ─── Liquid Detection Endpoints ────────────────────────────────────────────────

@app.post("/predict-liquid")
async def predict_liquid(file: UploadFile = File(...)):
    """
    Accept an image file, run liquid detection model inference.
    Detects liquid containers like bottles, cans, spray cans, etc.
    """
    if liquid_detection_model is None:
        raise HTTPException(status_code=503, detail="Liquid detection model not available")
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        detections, img_width, img_height = _run_liquid_detection_inference_on_path(tmp_path)

        return {
            "detections":             detections,
            "image_width":            img_width,
            "image_height":           img_height,
            "model":                  "liquid-detection",
            "total_detections":       len(detections),
            "manifest_processed":     False,
            "manifest_summary":       None,
            "manifest_match":         None,
            "manifest_counts":        None,
            "detection_counts":       None,
            "manifest_mismatch_details": None,
            "thresholds":             {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
        }
    finally:
        os.unlink(tmp_path)


@app.post("/predict-batch-liquid")
async def predict_batch_liquid(files: List[UploadFile] = File(...)):
    """
    Accept multiple image files, run liquid detection model inference on each.
    """
    if liquid_detection_model is None:
        raise HTTPException(status_code=503, detail="Liquid detection model not available")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    MAX_BATCH = 50
    if len(files) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Max {MAX_BATCH} images per batch")

    # Read all file bytes first (async)
    file_records = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            continue
        suffix = os.path.splitext(f.filename or "upload.jpg")[1] or ".jpg"
        data = await f.read()
        file_records.append((f.filename or f"image_{len(file_records)}", suffix, data))

    if not file_records:
        raise HTTPException(status_code=400, detail="No valid image files found")

    # Write to temp files
    tmp_paths = []
    for _, suffix, data in file_records:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_paths.append(tmp.name)

    all_detections = []
    per_image = []

    try:
        for idx, (tmp_path, (filename, _, _)) in enumerate(zip(tmp_paths, file_records)):
            detections, img_width, img_height = _run_liquid_detection_inference_on_path(tmp_path)
            per_image.append({
                "filename":         filename,
                "index":            idx,
                "detections":       detections,
                "total_detections": len(detections),
                "image_width":      img_width,
                "image_height":     img_height,
                "has_threat":       len(detections) > 0,
            })
            all_detections.extend(detections)

        # ── Aggregate stats ────────────────────────────────────────────────
        total_images   = len(per_image)
        flagged_images = sum(1 for img in per_image if img["has_threat"])
        clean_images   = total_images - flagged_images

        # Class frequency
        class_freq = {name: 0 for name in LIQUID_DETECTION_CLASS_NAMES}
        for d in all_detections:
            if d["label"] in class_freq:
                class_freq[d["label"]] += 1

        # Confidence distribution buckets
        conf_buckets = {
            "0.45-0.5": 0,
            "0.5-0.6": 0,
            "0.6-0.7": 0,
            "0.7-0.8": 0,
            "0.8-0.9": 0,
            "0.9-1.0": 0,
        }
        for d in all_detections:
            c = d["confidence"]
            if c < 0.5:
                conf_buckets["0.45-0.5"] += 1
            elif c < 0.6:
                conf_buckets["0.5-0.6"] += 1
            elif c < 0.7:
                conf_buckets["0.6-0.7"] += 1
            elif c < 0.8:
                conf_buckets["0.7-0.8"] += 1
            elif c < 0.9:
                conf_buckets["0.8-0.9"] += 1
            else:
                conf_buckets["0.9-1.0"] += 1

        # Detections per image (for trend chart)
        detections_series = [
            {
                "name":  (img["filename"][:14] + "…") if len(img["filename"]) > 15 else img["filename"],
                "index": img["index"] + 1,
                "count": img["total_detections"],
            }
            for img in per_image
        ]

        avg_conf = (
            sum(d["confidence"] for d in all_detections) / len(all_detections)
            if all_detections else 0.0
        )

        return {
            "model":             "liquid-detection",
            "total_images":      total_images,
            "flagged_images":    flagged_images,
            "clean_images":      clean_images,
            "total_detections":  len(all_detections),
            "avg_confidence":    round(avg_conf, 4),
            "thresholds":        {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
            "per_image":         per_image,
            "class_frequency":   class_freq,
            "conf_distribution": conf_buckets,
            "detections_series": detections_series,
        }

    finally:
        for p in tmp_paths:
            try:
                os.unlink(p)
            except Exception:
                pass


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check showing YOLO-baseline, EfficientNet pipeline, and Wildlife model status."""
    models_status = {
        "yolo-baseline": {
            "status": "loaded",
            "path": str(MODEL_PATH),
            "classes": len(CLASS_MAP),
        }
    }

    # Check EfficientNet pipeline model availability
    try:
        efficient_model_dir = Path(__file__).resolve().parent.parent / "model" / "efficent-net"
        yolo_weights = efficient_model_dir / "yolo_best.pt"
        cls_weights = efficient_model_dir / "classifier_best.pth"

        if yolo_weights.exists() and cls_weights.exists():
            models_status["efficientnet-pipeline"] = {
                "status": "available",
                "yolo_weights": str(yolo_weights),
                "classifier_weights": str(cls_weights),
                "classes": len(inference_pipeline.CLASS_NAMES),
            }
        else:
            models_status["efficientnet-pipeline"] = {
                "status": "missing_weights",
                "yolo_weights_exists": yolo_weights.exists(),
                "classifier_weights_exists": cls_weights.exists(),
            }
    except Exception as e:
        models_status["efficientnet-pipeline"] = {
            "status": "error",
            "error": str(e),
        }

    # Check Wildlife model availability
    if wildlife_model is not None:
        models_status["wildlife-smuggling"] = {
            "status": "loaded",
            "path": str(WILDLIFE_MODEL_PATH),
            "classes": len(WILDLIFE_CLASS_MAP),
            "class_names": WILDLIFE_CLASS_NAMES,
        }
    else:
        models_status["wildlife-smuggling"] = {
            "status": "not_loaded",
            "path": str(WILDLIFE_MODEL_PATH),
            "path_exists": WILDLIFE_MODEL_PATH.exists(),
        }

    return {
        "status":  "ok",
        "models":  models_status,
        "classes": CLASS_MAP,
        "wildlife_classes": WILDLIFE_CLASS_MAP,
        "endpoints": {
            "yolo-baseline": [
                "POST /predict",
                "POST /predict-batch",
            ],
            "efficientnet-pipeline": [
                "POST /predict-efficientnet",
                "POST /predict-batch-efficientnet",
            ],
            "wildlife-smuggling": [
                "POST /predict-wildlife",
                "POST /predict-batch-wildlife",
            ],
        },
        "thresholds": {"conf": CONF_THRESHOLD, "iou": IOU_THRESHOLD},
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)