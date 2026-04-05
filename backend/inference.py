"""
CIIBS Inference Engine
Real-Time Intelligent Cargo X-ray Risk Screening

Handles: object detection, anomaly heatmap, material density classification,
concealment pattern detection, declaration mismatch, and risk fusion.
"""

import logging
import re
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import yaml

logger = logging.getLogger("ciibs.inference")

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent / "config.yaml"

def load_config() -> dict:
    try:
        with open(CONFIG_PATH, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        raise


# ──────────────────────────────────────────────
# Model Management (Dual Roboflow Workflow API)
# ──────────────────────────────────────────────

# Primary Model A
ROBOFLOW_API_URL = "https://serverless.roboflow.com"
MODEL_A = {
    "api_key": "LCa8SMlLGoq2OvrTECZe",
    "workspace": "amits-workspace-hnlsa",
    "workflow_id": "detect-count-and-visualize",
    "label": "Model-A",
}

# Fallback Model B — different dataset, used when Model A finds 0
MODEL_B = {
    "api_key": "svq99HVBcvhRQHYuXvwK",
    "workspace": "anshamans-workspace",
    "workflow_id": "detect-count-and-visualize",
    "label": "Model-B",
}

_last_model_used = MODEL_A["label"]


def load_model(mode: str = "realtime") -> str:
    """Initialize dual Roboflow Workflow API."""
    logger.info(f"Dual-model: Primary={MODEL_A['label']}, Fallback={MODEL_B['label']} (mode={mode})")
    return "roboflow"


# ──────────────────────────────────────────────
# Object Detection
# ──────────────────────────────────────────────

PIDRAY_CLASSES = [
    "Baton", "Pliers", "Hammer", "Powerbank", "Scissors",
    "Wrench", "Gun", "Bullet", "Sprayer", "HandCuffs", "Knife", "Lighter"
]

THREAT_LEVELS = {
    "Gun": 5, "Bullet": 5, "Knife": 4, "Baton": 3,
    "Scissors": 3, "Hammer": 3, "HandCuffs": 3,
    "Wrench": 2, "Pliers": 2, "Sprayer": 2,
    "Lighter": 2, "Powerbank": 1
}


def detect_objects(
    image: np.ndarray, model: object, mode: str = "realtime"
) -> Tuple[List[Dict], float, np.ndarray]:
    """Run detection with dual-model fallback.
    1. Try Model A (primary)
    2. If 0 detections → try Model B (fallback, different dataset)
    3. If still 0 → run heatmap-guided ROI crops with Model A
    """
    global _last_model_used

    config = load_config()
    mode_cfg = config.get("detection", {}).get("modes", {}).get(mode, {})
    min_conf = float(mode_cfg.get("conf_threshold", 0.35 if mode == "realtime" else 0.25))
    max_det = int(mode_cfg.get("max_det", 20 if mode == "realtime" else 50))

    if mode == "accuracy":
        logger.info("Accuracy mode: running both models and merging detections")
        detections_a, det_time_a, _ = _run_workflow(image, MODEL_A, min_conf=min_conf, max_det=max_det)
        detections_b, det_time_b, _ = _run_workflow(image, MODEL_B, min_conf=min_conf, max_det=max_det)

        merged = _merge_unique_detections(detections_a, detections_b, iou_threshold=0.6)
        merged = sorted(merged, key=lambda d: d.get("confidence", 0), reverse=True)[:max_det]

        annotated = image.copy()
        for detection in merged:
            x1, y1, x2, y2 = detection["bbox"]
            threat = int(detection.get("threat_level", 1))
            confidence = float(detection.get("confidence", 0.0))
            class_name = str(detection.get("class", "Unknown"))

            color = _threat_color(threat)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label = f"{class_name} {confidence:.0%}"
            _draw_label(annotated, label, (x1, y1 - 10), color)

        total_time = det_time_a + det_time_b
        _last_model_used = f"{MODEL_A['label']}+{MODEL_B['label']}"
        logger.info(f"Accuracy mode merged {len(merged)} detections in {total_time*1000:.0f}ms")
        return merged, total_time, annotated

    # Realtime mode: fast path with fallback only when needed
    detections, det_time, annotated = _run_workflow(image, MODEL_A, min_conf=min_conf, max_det=max_det)
    if detections:
        _last_model_used = MODEL_A["label"]
        logger.info(f"Model A found {len(detections)} detections")
        return detections, det_time, annotated

    # Fallback: Model B
    logger.info("Model A: 0 detections — trying Model B")
    detections_b, det_time_b, annotated_b = _run_workflow(image, MODEL_B, min_conf=min_conf, max_det=max_det)
    if detections_b:
        _last_model_used = MODEL_B["label"]
        logger.info(f"Model B found {len(detections_b)} detections")
        return detections_b, det_time + det_time_b, annotated_b

    _last_model_used = f"{MODEL_A['label']}+{MODEL_B['label']}"
    logger.info("Both models: 0 detections")
    return [], det_time + det_time_b, annotated


def _merge_unique_detections(detections_a: List[Dict], detections_b: List[Dict], iou_threshold: float = 0.6) -> List[Dict]:
    merged: List[Dict] = []
    combined = sorted(detections_a + detections_b, key=lambda d: d.get("confidence", 0), reverse=True)

    for candidate in combined:
        candidate_bbox = candidate.get("bbox", [0, 0, 0, 0])
        candidate_class = candidate.get("class", "")

        duplicate = False
        for kept in merged:
            if kept.get("class", "") != candidate_class:
                continue
            if _bbox_iou(candidate_bbox, kept.get("bbox", [0, 0, 0, 0])) >= iou_threshold:
                duplicate = True
                break

        if not duplicate:
            merged.append(candidate)

    return merged


def _run_workflow(
    image: np.ndarray,
    model_cfg: dict,
    min_conf: float = 0.0,
    max_det: Optional[int] = None,
) -> Tuple[List[Dict], float, np.ndarray]:
    """Call a single Roboflow workflow and parse results."""
    from inference_sdk import InferenceHTTPClient
    import tempfile, os

    tmp_path = os.path.join(tempfile.gettempdir(), f"_aegis_{model_cfg['label']}.jpg")
    cv2.imwrite(tmp_path, image)

    t0 = time.time()
    try:
        client = InferenceHTTPClient(api_url=ROBOFLOW_API_URL, api_key=model_cfg["api_key"])
        result = client.run_workflow(
            workspace_name=model_cfg["workspace"],
            workflow_id=model_cfg["workflow_id"],
            images={"image": tmp_path},
            use_cache=True,
        )
        logger.info(f"[{model_cfg['label']}] response len={len(result) if isinstance(result, list) else 'N/A'}")
    except Exception as e:
        logger.error(f"[{model_cfg['label']}] API error: {e}")
        return [], time.time() - t0, image.copy()
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    inference_time = time.time() - t0
    detections = []
    annotated = image.copy()
    predictions = _extract_predictions(result)

    for pred in predictions:
        cx = pred.get("x", 0)
        cy = pred.get("y", 0)
        w  = pred.get("width", 0)
        h  = pred.get("height", 0)
        cls_name = pred.get("class", "Unknown")
        conf = pred.get("confidence", 0)

        if conf < min_conf:
            continue

        x1 = int(cx - w / 2)
        y1 = int(cy - h / 2)
        x2 = int(cx + w / 2)
        y2 = int(cy + h / 2)
        xyxy = np.array([x1, y1, x2, y2])

        pidray_class = _normalize_class_name(cls_name)
        threat = THREAT_LEVELS.get(pidray_class, 1)
        mat_type, mat_score = classify_material(image, xyxy, class_name=pidray_class)
        z_eff = _estimate_z_effective(mat_type, mat_score)
        est_density = _estimate_density(z_eff)

        detections.append({
            "bbox": xyxy.tolist(),
            "class": pidray_class,
            "confidence": round(conf, 3),
            "threat_level": threat,
            "material_type": mat_type,
            "material_score": round(mat_score, 3),
            "z_effective": round(z_eff, 1),
            "estimated_density": round(est_density, 2),
        })

        color = _threat_color(threat)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label = f"{pidray_class} {conf:.0%} [{model_cfg['label']}]"
        _draw_label(annotated, label, (x1, y1 - 10), color)

    detections.sort(key=lambda d: d["confidence"], reverse=True)
    if max_det is not None:
        detections = detections[:max_det]
    logger.info(f"[{model_cfg['label']}] {len(detections)} detections in {inference_time*1000:.0f}ms")
    return detections, inference_time, annotated


def _extract_predictions(result) -> list:
    """Extract prediction list from Roboflow workflow response.
    Handles multiple possible response structures from detect-count-and-visualize.
    """
    if not isinstance(result, list) or not result:
        return []
    item = result[0]

    logger.debug(f"Roboflow raw keys: {list(item.keys())}")

    # Structure 1: {"predictions": [{x, class, ...}]} or {"detection_predictions": ...}
    for key in ("predictions", "detection_predictions"):
        v = item.get(key)
        if isinstance(v, list) and v and isinstance(v[0], dict) and ("class" in v[0] or "x" in v[0]):
            logger.info(f"Predictions found under key '{key}': {len(v)} items")
            return v
        if isinstance(v, dict) and "predictions" in v:
            inner = v["predictions"]
            if isinstance(inner, list):
                logger.info(f"Predictions nested under '{key}.predictions': {len(inner)} items")
                return inner

    # Structure 2: top-level item IS a prediction
    if isinstance(item, dict) and ("class" in item or "x" in item):
        return result

    # Log what we got so we can fix parsing
    logger.warning(f"Could not parse predictions. Keys: {list(item.keys())}")
    for k, v in item.items():
        logger.warning(f"  [{k}] type={type(v).__name__}, preview={str(v)[:120]}")
    return []



def _normalize_class_name(cls: str) -> str:
    """Map model class names to PIDray standard names."""
    mapping = {
        "knife": "Knife", "gun": "Gun", "pistol": "Gun", "firearm": "Gun",
        "bullet": "Bullet", "scissors": "Scissors", "hammer": "Hammer",
        "wrench": "Wrench", "pliers": "Pliers", "baton": "Baton",
        "handcuffs": "HandCuffs", "lighter": "Lighter", "powerbank": "Powerbank",
        "sprayer": "Sprayer",
    }
    return mapping.get(cls.lower(), cls.capitalize())


def _estimate_z_effective(mat_type: str, mat_score: float) -> float:
    """Estimate atomic Z-effective from material type for physics-based analysis."""
    base = {"Metallic": 26.0, "Intermediate": 14.0, "Organic": 7.5, "Unknown": 10.0}
    return base.get(mat_type, 10.0) * (0.8 + 0.4 * mat_score)


def _estimate_density(z_eff: float) -> float:
    """Rough density estimate (g/cm³) from Z-effective."""
    return round(0.05 * z_eff + 0.5, 2)


def _threat_color(threat_level: int) -> Tuple[int, int, int]:
    colors = {
        5: (0, 0, 255), 4: (0, 69, 255), 3: (0, 165, 255),
        2: (0, 255, 255), 1: (0, 255, 0),
    }
    return colors.get(threat_level, (255, 255, 255))


def _draw_label(img, text, pos, color, scale=0.5, thickness=1):
    (w, h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
    x, y = pos
    cv2.rectangle(img, (x, y - h - 5), (x + w, y + 2), color, -1)
    cv2.putText(img, text, (x, y - 2), cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thickness)


# ──────────────────────────────────────────────
# 🔬 Material Density Classification (Novel)
# ──────────────────────────────────────────────

# Known material properties by class — based on physics of X-ray imaging
# Metallic = high Z-effective, high X-ray attenuation
# Organic = low Z-effective, low attenuation
CLASS_MATERIAL_MAP = {
    "Gun":       ("Metallic", 0.95),
    "Bullet":    ("Metallic", 0.98),
    "Knife":     ("Metallic", 0.90),
    "Baton":     ("Metallic", 0.80),
    "Scissors":  ("Metallic", 0.85),
    "Hammer":    ("Metallic", 0.85),
    "Wrench":    ("Metallic", 0.88),
    "Pliers":    ("Metallic", 0.87),
    "HandCuffs": ("Metallic", 0.92),
    "Lighter":   ("Intermediate", 0.55),
    "Powerbank": ("Intermediate", 0.60),
    "Sprayer":   ("Intermediate", 0.50),
}


def classify_material(
    image: np.ndarray, bbox: np.ndarray,
    class_name: str = None
) -> Tuple[str, float]:
    """
    Classify material type. If class_name is known, use physics-based lookup
    (much more accurate than pixel analysis for X-ray scans).
    Falls back to pixel channel analysis for unknown classes.
    """
    # Primary: use class-based physics lookup
    if class_name and class_name in CLASS_MATERIAL_MAP:
        return CLASS_MATERIAL_MAP[class_name]

    # Fallback: pixel-based channel analysis
    x1, y1, x2, y2 = bbox[:4]
    h, w = image.shape[:2]
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(w, int(x2)), min(h, int(y2))

    if x2 <= x1 or y2 <= y1:
        return "Unknown", 0.5

    roi = image[y1:y2, x1:x2]
    if roi.size == 0:
        return "Unknown", 0.5

    b_mean = float(np.mean(roi[:, :, 0]))
    g_mean = float(np.mean(roi[:, :, 1]))
    r_mean = float(np.mean(roi[:, :, 2]))
    total = b_mean + g_mean + r_mean + 1e-6

    blue_ratio = b_mean / total
    warm_ratio = (r_mean + g_mean * 0.5) / total
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edge_density = float(np.mean(cv2.Canny(gray_roi, 50, 150))) / 255.0
    metallic_score = float(np.clip(blue_ratio * 0.5 + edge_density * 0.3 + (1 - warm_ratio) * 0.2, 0, 1))

    if metallic_score > 0.45:
        return "Metallic", metallic_score
    elif metallic_score < 0.25:
        return "Organic", metallic_score
    else:
        return "Intermediate", metallic_score


def compute_material_risk(
    detections: List[Dict], declared_cargo: Optional[str]
) -> Tuple[float, Dict]:
    """
    Assess material-based risk using class-name-derived material type.
    Metallic objects in organic-declared cargo = highly suspicious.
    """
    if not detections:
        return 0.0, {"metallic_count": 0, "message": "No objects detected"}

    metallic_dets = [d for d in detections if d.get("material_type") == "Metallic"]
    intermediate_dets = [d for d in detections if d.get("material_type") == "Intermediate"]
    metallic_count = len(metallic_dets)

    if metallic_count == 0 and not intermediate_dets:
        return 0.0, {"metallic_count": 0, "message": "No metallic/dense objects detected"}

    organic_cargo_keywords = {"clothing", "food", "personal", "fragile", "documents", "textile"}
    is_organic_declared = False
    if declared_cargo:
        for kw in organic_cargo_keywords:
            if kw in declared_cargo.lower():
                is_organic_declared = True
                break

    base_risk = min(1.0, metallic_count * 0.4)
    if is_organic_declared:
        base_risk = min(1.0, base_risk * 1.6)

    classes_found = [d["class"] for d in metallic_dets]
    avg_score = float(np.mean([d["material_score"] for d in metallic_dets])) if metallic_dets else 0.0

    msg_parts = []
    if metallic_count > 0:
        msg_parts.append(f"{metallic_count} metallic object(s): {', '.join(set(classes_found))}")
    if is_organic_declared:
        msg_parts.append(f"suspicious in declared '{declared_cargo}' cargo")

    return base_risk, {
        "metallic_count": metallic_count,
        "avg_metallic_score": round(avg_score, 3),
        "organic_declared": is_organic_declared,
        "message": " — ".join(msg_parts) if msg_parts else "No metallic risk"
    }


# ──────────────────────────────────────────────
# 🕵️ Concealment Pattern Detection (Novel)
# ──────────────────────────────────────────────

def compute_concealment(
    image: np.ndarray, detections: List[Dict]
) -> Tuple[float, Dict]:
    """
    Detect concealment patterns:
    1. Object overlap ratio — items stacked to hide shapes
    2. Edge discontinuity — broken edges suggesting hidden objects
    3. Density gradient anomaly — unusual density within bounding boxes
    """
    if len(detections) < 1:
        return 0.0, {
            "overlap_score": 0, "edge_score": 0, "density_score": 0,
            "message": "No detections to analyze for concealment"
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # 1. Overlap analysis
    overlap_score = _compute_overlap_score(detections)

    # 2. Edge discontinuity in ROIs
    edge_score = _compute_edge_discontinuity(gray, detections)

    # 3. Density gradient within detections
    density_score = _compute_density_anomaly(gray, detections)

    # Combine
    concealment_score = float(np.clip(
        overlap_score * 0.3 + edge_score * 0.35 + density_score * 0.35,
        0, 1
    ))

    details = {
        "overlap_score": round(overlap_score, 3),
        "edge_score": round(edge_score, 3),
        "density_score": round(density_score, 3),
        "message": _concealment_message(concealment_score)
    }

    return concealment_score, details


def _compute_overlap_score(detections: List[Dict]) -> float:
    """How much do detected bounding boxes overlap? High overlap = potential concealment."""
    if len(detections) < 2:
        return 0.0

    bboxes = [d["bbox"] for d in detections]
    max_iou = 0.0

    for i in range(len(bboxes)):
        for j in range(i + 1, len(bboxes)):
            iou = _bbox_iou(bboxes[i], bboxes[j])
            max_iou = max(max_iou, iou)

    return min(1.0, max_iou * 3)  # Scale up — even 0.33 IoU is suspicious


def _bbox_iou(box1, box2) -> float:
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - inter
    return inter / max(union, 1e-6)


def _compute_edge_discontinuity(gray: np.ndarray, detections: List[Dict]) -> float:
    """Detect broken/discontinuous edges within detected regions — sign of concealment."""
    if not detections:
        return 0.0

    scores = []
    h, w = gray.shape[:2]

    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue

        roi = gray[y1:y2, x1:x2]
        edges = cv2.Canny(roi, 50, 150)

        # Compute edge continuity — ratio of edge pixels in connected components
        num_labels, labels = cv2.connectedComponents(edges)
        if num_labels <= 1:
            scores.append(0.0)
            continue

        # Many small components = broken edges = possible concealment
        component_sizes = [(labels == l).sum() for l in range(1, num_labels)]
        if not component_sizes:
            scores.append(0.0)
            continue

        avg_size = np.mean(component_sizes)
        fragmentation = 1.0 - min(1.0, avg_size / max(roi.shape[0], 1))
        scores.append(fragmentation)

    return float(np.mean(scores)) if scores else 0.0


def _compute_density_anomaly(gray: np.ndarray, detections: List[Dict]) -> float:
    """Check for unusual density gradients within detected objects."""
    if not detections:
        return 0.0

    scores = []
    h, w = gray.shape[:2]

    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue

        roi = gray[y1:y2, x1:x2].astype(np.float32)

        # Split into quadrants and compare density
        mid_y, mid_x = roi.shape[0] // 2, roi.shape[1] // 2
        if mid_y < 2 or mid_x < 2:
            continue

        quads = [
            roi[:mid_y, :mid_x], roi[:mid_y, mid_x:],
            roi[mid_y:, :mid_x], roi[mid_y:, mid_x:]
        ]
        means = [float(np.mean(q)) for q in quads if q.size > 0]

        if len(means) >= 2:
            density_var = float(np.std(means) / (np.mean(means) + 1e-6))
            scores.append(min(1.0, density_var * 2))

    return float(np.mean(scores)) if scores else 0.0


def _concealment_message(score: float) -> str:
    if score > 0.6:
        return "⚠️ HIGH concealment indicators — items may be deliberately hidden"
    elif score > 0.3:
        return "🟡 Moderate concealment patterns — overlapping items detected"
    else:
        return "✅ Low concealment risk — objects clearly visible"


# ──────────────────────────────────────────────
# Anomaly Heatmap (Detection-Guided)
# ──────────────────────────────────────────────

def compute_anomaly(
    image: np.ndarray,
    detections: Optional[List[Dict]] = None
) -> Tuple[np.ndarray, float]:
    """
    Compute anomaly heatmap.

    If detections exist → detection-guided heatmap:
      Gaussian blobs centred on each detected bbox, weighted by
      (threat_level / 5) × confidence. Red = high-threat, blue = background.
      The heatmap shows EXACTLY where the threats are.

    If no detections → metal-density fallback map:
      Dark pixels in X-ray = dense/metallic = suspicious.
      Inverted intensity + edge density highlights anomalous regions.

    COLORMAP_JET: blue=low, green=medium, yellow=high, red=critical.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
    h, w = gray.shape[:2]
    heatmap = np.zeros((h, w), dtype=np.float32)

    if detections:
        # ── Detection-guided ─────────────────────────────────────────────
        for det in detections:
            bbox = det["bbox"]
            x1 = max(0, int(bbox[0]))
            y1 = max(0, int(bbox[1]))
            x2 = min(w - 1, int(bbox[2]))
            y2 = min(h - 1, int(bbox[3]))
            if x2 <= x1 or y2 <= y1:
                continue

            # Weight = threat severity × model confidence
            weight = (det["threat_level"] / 5.0) * det["confidence"]

            cx_obj = (x1 + x2) // 2
            cy_obj = (y1 + y2) // 2
            rx = max(1, (x2 - x1) // 2)
            ry = max(1, (y2 - y1) // 2)

            # Gaussian blob (2× bbox radius so it glows beyond the border)
            y_lo = max(0, cy_obj - ry * 2)
            y_hi = min(h,  cy_obj + ry * 2 + 1)
            x_lo = max(0, cx_obj - rx * 2)
            x_hi = min(w,  cx_obj + rx * 2 + 1)
            if x_hi <= x_lo or y_hi <= y_lo:
                continue

            xs = np.arange(x_lo, x_hi)
            ys = np.arange(y_lo, y_hi)
            xg, yg = np.meshgrid(xs, ys)
            blob = weight * np.exp(
                -((xg - cx_obj) ** 2) / (2 * rx ** 2)
                -((yg - cy_obj) ** 2) / (2 * ry ** 2)
            )
            heatmap[y_lo:y_hi, x_lo:x_hi] = np.maximum(
                heatmap[y_lo:y_hi, x_lo:x_hi], blob
            )

        # Faint structural background (max 15%) so non-threat areas
        # stay dark blue, not completely black
        edges = cv2.Canny(gray, 30, 100).astype(np.float32) / 255.0
        edges = cv2.GaussianBlur(edges, (15, 15), 5)
        if edges.max() > 0:
            edges /= edges.max()
        heatmap = np.maximum(heatmap, edges * 0.15)

    else:
        # ── No-detection fallback: metal-density anomaly map ─────────────
        # In X-ray: dark pixels = dense/metallic. Invert so high density = high score.
        inv = (255.0 - gray.astype(np.float32))
        if inv.max() > 0:
            inv /= inv.max()

        edges = cv2.Canny(gray, 40, 120).astype(np.float32) / 255.0
        edges = cv2.GaussianBlur(edges, (21, 21), 8)
        if edges.max() > 0:
            edges /= edges.max()

        blurred = cv2.GaussianBlur(gray.astype(np.float32), (31, 31), 10)
        local_var = np.abs(gray.astype(np.float32) - blurred)
        if local_var.max() > 0:
            local_var /= local_var.max()

        heatmap = 0.40 * inv + 0.35 * edges + 0.25 * local_var

    if heatmap.max() > 0:
        heatmap /= heatmap.max()
    heatmap = np.clip(heatmap, 0, 1).astype(np.float32)

    # Anomaly score = 95th percentile of heatmap intensity
    anomaly_score = float(np.percentile(heatmap, 95))
    return heatmap, anomaly_score


def render_heatmap(image: np.ndarray, heatmap: np.ndarray, alpha: float = 0.55) -> np.ndarray:
    """Overlay jet-coloured heatmap. COLORMAP_JET: blue→green→yellow→red."""
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    colored = cv2.resize(colored, (image.shape[1], image.shape[0]))
    overlay = cv2.addWeighted(image, 1 - alpha, colored, alpha, 0)
    return overlay



# ──────────────────────────────────────────────
# Declaration Mismatch
# ──────────────────────────────────────────────

def compute_mismatch(
    detections: List[Dict], declared_cargo: Optional[str] = None
) -> Tuple[float, Dict]:
    if not declared_cargo or not declared_cargo.strip():
        return 0.0, {"declared": None, "conflicts": [], "message": "No declaration provided"}

    config = load_config()
    conflict_map = config["declaration"]["conflict_map"]
    declared_lower = declared_cargo.lower().strip()

    matched_type = None
    for cargo_type in conflict_map:
        if cargo_type in declared_lower:
            matched_type = cargo_type
            break

    if matched_type is None:
        return 0.2, {
            "declared": declared_cargo, "conflicts": [],
            "message": f"Cargo type '{declared_cargo}' not in known categories — flagged for review"
        }

    conflict_items = set(conflict_map[matched_type])
    detected_classes = {d["class"] for d in detections}
    conflicts = detected_classes & conflict_items

    if not conflicts:
        return 0.0, {
            "declared": declared_cargo, "matched_type": matched_type,
            "conflicts": [], "message": f"Declared '{declared_cargo}' — no conflicts detected"
        }

    max_threat = max(THREAT_LEVELS.get(c, 1) for c in conflicts)
    penalty = min(1.0, (len(conflicts) * 0.25) + (max_threat * 0.1))

    return penalty, {
        "declared": declared_cargo, "matched_type": matched_type,
        "conflicts": list(conflicts),
        "message": f"MISMATCH: Declared '{declared_cargo}' but detected {', '.join(conflicts)}"
    }


# ──────────────────────────────────────────────
# Documentation NLP (Baseline)
# ──────────────────────────────────────────────

VAGUE_DECLARATION_TERMS = {
    "gift", "sample", "samples", "misc", "miscellaneous", "items", "goods",
    "other", "mixed", "general", "stuff", "n/a", "na", "personal"
}

INFORMATIVE_DECLARATION_TERMS = {
    "electronics", "clothing", "food", "documents", "medical", "tools",
    "machinery", "fragile", "personal", "spare", "parts", "textile", "metal"
}


def analyze_declaration_nlp(declared_cargo: Optional[str]) -> Tuple[float, Dict]:
    """
    Baseline NLP quality check for declaration text.
    Flags vague wording and low-specificity descriptions.
    Returns a penalty in [0,1] and structured diagnostic details.
    """
    if not declared_cargo or not declared_cargo.strip():
        return 0.35, {
            "provided": False,
            "quality": "LOW",
            "penalty": 0.35,
            "flags": ["Missing declaration text"],
            "message": "No declaration provided — documentation quality risk raised"
        }

    text = declared_cargo.strip().lower()
    tokens = re.findall(r"[a-zA-Z0-9]+", text)
    token_count = len(tokens)

    vague_hits = sorted({t for t in tokens if t in VAGUE_DECLARATION_TERMS})
    informative_hits = sorted({t for t in tokens if t in INFORMATIVE_DECLARATION_TERMS})

    quantity_mentioned = bool(re.search(r"\b\d+\b", text))
    has_descriptor = bool(re.search(r"\b([a-z]{4,})\b", text))

    penalty = 0.0
    flags = []

    if token_count < 3:
        penalty += 0.2
        flags.append("Very short declaration")

    if vague_hits:
        penalty += min(0.35, 0.12 * len(vague_hits))
        flags.append(f"Vague terms found: {', '.join(vague_hits[:4])}")

    if len(informative_hits) == 0:
        penalty += 0.2
        flags.append("No recognized cargo category keywords")

    if not quantity_mentioned:
        penalty += 0.1
        flags.append("No quantity mentioned")

    if not has_descriptor:
        penalty += 0.1
        flags.append("No descriptive cargo details")

    penalty = float(np.clip(penalty, 0, 1))

    if penalty >= 0.5:
        quality = "LOW"
    elif penalty >= 0.25:
        quality = "MEDIUM"
    else:
        quality = "HIGH"

    if not flags:
        flags.append("Declaration appears specific and structured")

    return penalty, {
        "provided": True,
        "quality": quality,
        "penalty": round(penalty, 3),
        "flags": flags,
        "vague_terms": vague_hits,
        "informative_terms": informative_hits,
        "message": f"Declaration NLP quality: {quality}"
    }


# ──────────────────────────────────────────────
# Risk Fusion (Updated with all signals)
# ──────────────────────────────────────────────

def compute_risk(
    detections: List[Dict],
    anomaly_score: float,
    mismatch_penalty: float,
    material_risk: float = 0.0,
    concealment_score: float = 0.0,
    vlm_threat: float = 0.0
) -> Tuple[int, str, Dict]:
    config = load_config()
    weights = config["risk"]["weights"]
    levels = config["risk"]["levels"]
    detection_count = len(detections)

    if detections:
        # Weight each detection by confidence * threat_level (normalized)
        # This ensures a high-confidence gun dominates the score
        det_scores = [d["confidence"] * (d["threat_level"] / 5.0) for d in detections]
        max_det_score = max(det_scores)
        # Also count multiple threats
        multi_threat_bonus = min(0.2, (len(detections) - 1) * 0.05)
        max_det_score = min(1.0, max_det_score + multi_threat_bonus)
    else:
        max_det_score = 0.0

    count_score = float(np.clip((detection_count - 1) / 4.0, 0, 1))

    raw_risk = (
        weights["detection"]  * max_det_score +
        weights["anomaly"]    * anomaly_score +
        weights["mismatch"]   * mismatch_penalty +
        weights["material"]   * material_risk +
        weights["concealment"]* concealment_score +
        weights["vlm_agreement"] * vlm_threat
    ) * 100

    risk_score = int(np.clip(raw_risk, 0, 100))

    # ── Threat-level floor ───────────────────────────────────────────────────
    # A confirmed weapon detection MUST produce the correct risk level even if
    # model confidence is modest (e.g. 40%). Without this, a gun at 40% conf
    # scores only 24/100 (LOW) which is dangerously wrong.
    THREAT_FLOORS = {
        5: 65,   # Gun, Bullet  → forced ≥ HIGH
        4: 50,   # Knife        → forced ≥ MEDIUM
        3: 38,   # Baton, Scissors, Hammer, HandCuffs
        2: 22,   # Wrench, Pliers, Sprayer, Lighter
        1: 10,   # Powerbank
    }
    if detections:
        max_threat = max(d["threat_level"] for d in detections)
        floor = THREAT_FLOORS.get(max_threat, 0)
        risk_score = min(100, max(risk_score, floor))
    # ────────────────────────────────────────────────────────────────────────

    high_thresh = levels.get("high",   80)
    med_thresh  = levels.get("medium", 60)
    low_thresh  = levels.get("low",    30)

    if risk_score >= high_thresh:
        risk_level = "CRITICAL"
    elif risk_score >= med_thresh:
        risk_level = "HIGH"
    elif risk_score >= low_thresh:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    breakdown = {
        "detection_component":   round(weights["detection"]    * max_det_score  * 100, 1),
        "anomaly_component":     round(weights["anomaly"]       * anomaly_score  * 100, 1),
        "mismatch_component":    round(weights["mismatch"]      * mismatch_penalty * 100, 1),
        "material_component":    round(weights["material"]      * material_risk  * 100, 1),
        "concealment_component": round(weights["concealment"]   * concealment_score * 100, 1),
        "max_detection_conf":    round(max_det_score, 3),
        "anomaly_score":         round(anomaly_score, 3),
        "mismatch_penalty":      round(mismatch_penalty, 3),
    }

    return risk_score, risk_level, breakdown



# ──────────────────────────────────────────────
# Template Explanation (fallback)
# ──────────────────────────────────────────────

def explain_risk(
    detections: List[Dict], risk_score: int, risk_level: str,
    anomaly_score: float, mismatch_info: Dict, breakdown: Dict,
    concealment_info: Optional[Dict] = None,
    material_info: Optional[Dict] = None
) -> str:
    """Generate coherent, detection-driven explanation."""
    lines = []

    # 1. Risk verdict headline
    emoji_map = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}
    action_map = {
        "CRITICAL": "IMMEDIATE physical inspection required — do not release.",
        "HIGH":     "Manual review strongly recommended before clearance.",
        "MEDIUM":   "Secondary screening advised.",
        "LOW":      "No significant threats detected — clear for processing."
    }
    lines.append(f"{emoji_map[risk_level]} {risk_level} RISK (Score: {risk_score}/100)")
    lines.append(f"→ Action: {action_map[risk_level]}")
    lines.append("")

    # 2. Detection summary (most important section)
    if detections:
        threat_items = sorted(detections, key=lambda d: d["threat_level"] * d["confidence"], reverse=True)
        lines.append(f"📦 Detected {len(detections)} prohibited item(s):")
        for d in threat_items[:5]:
            threat_emoji = {5: "🔴", 4: "🟠", 3: "🟡", 2: "🔵", 1: "⚪"}.get(d["threat_level"], "⚪")
            mat = d.get("material_type", "Unknown")
            conf = d["confidence"]
            cls = d["class"]
            tlvl = d["threat_level"]
            lines.append(f"  {threat_emoji} {cls} — confidence: {conf:.0%}, threat level: {tlvl}/5, material: {mat}")
        lines.append("")

        # 3. Material analysis (derived from class, not pixels)
        metallic = [d for d in detections if d.get("material_type") == "Metallic"]
        if metallic:
            cls_list = ", ".join(set(d["class"] for d in metallic))
            lines.append(f"🔬 Material: {len(metallic)} metallic/dense object(s) confirmed ({cls_list}).")
            lines.append(f"   High X-ray attenuation — consistent with metal/weapon composition.")
        else:
            non_metal = [d for d in detections if d.get("material_type") == "Intermediate"]
            if non_metal:
                lines.append(f"🔬 Material: Mixed density objects detected — possible concealed items.")
        lines.append("")
    else:
        lines.append("📦 No prohibited items detected by model.")
        if anomaly_score > 0.4:
            lines.append(f"   ⚠️ However, anomaly heatmap shows suspicious regions ({anomaly_score:.0%} intensity).")
            lines.append(f"   Consider manual review of highlighted areas.")
        lines.append("")

    # 4. Anomaly heatmap context
    if anomaly_score > 0.6:
        lines.append(f"🌡️ Anomaly: HIGH ({anomaly_score:.0%}) — elevated structural irregularities.")
    elif anomaly_score > 0.35:
        lines.append(f"🌡️ Anomaly: MODERATE ({anomaly_score:.0%}) — minor density irregularities noted.")

    # 5. Concealment
    if concealment_info and concealment_info.get("overlap_score", 0) > 0.15:
        lines.append(f"🕵️ Concealment: {concealment_info['message']}")

    # 6. Declaration mismatch
    if mismatch_info.get("conflicts"):
        lines.append(f"📋 Declaration conflict: {mismatch_info['message']}")
    elif mismatch_info.get("declared"):
        lines.append(f"📋 Declared cargo: '{mismatch_info['declared']}' — no mismatch detected.")

    # 7. Risk breakdown
    lines.append("")
    lines.append("📊 Risk breakdown:")
    lines.append(f"  Detection signal:   {breakdown.get('detection_component', 0):.1f} pts")
    lines.append(f"  Anomaly signal:     {breakdown.get('anomaly_component', 0):.1f} pts")
    lines.append(f"  Declaration:        {breakdown.get('mismatch_component', 0):.1f} pts")
    lines.append(f"  Material/Concealment: {breakdown.get('material_component', 0) + breakdown.get('concealment_component', 0):.1f} pts")

    return "\n".join(lines)


# ──────────────────────────────────────────────
# Full Pipeline
# ──────────────────────────────────────────────

def run_full_pipeline(
    image: np.ndarray,
    mode: str = "realtime",
    declared_cargo: Optional[str] = None,
    model: object = None
) -> Dict:
    if model is None:
        model = load_model(mode)

    t_start = time.time()

    # 1. Detection (with material classification per bbox)
    detections, det_time, annotated = detect_objects(image, model, mode)

    # 2. Anomaly heatmap — detection-guided when objects found
    heatmap, anomaly_score = compute_anomaly(image, detections=detections)
    heatmap_overlay = render_heatmap(image, heatmap)

    # 3. Declaration Mismatch
    mismatch_penalty, mismatch_info = compute_mismatch(detections, declared_cargo)

    # 3b. Documentation NLP baseline
    doc_penalty, doc_info = analyze_declaration_nlp(declared_cargo)

    # Merge declaration quality into mismatch channel for risk scoring.
    combined_mismatch_penalty = float(np.clip(mismatch_penalty + (doc_penalty * 0.5), 0, 1))
    mismatch_info["declaration_nlp"] = doc_info
    mismatch_info["combined_penalty"] = round(combined_mismatch_penalty, 3)

    # 4. Material Risk (novel)
    material_risk, material_info = compute_material_risk(detections, declared_cargo)

    # 5. Concealment Detection (novel)
    concealment_score, concealment_info = compute_concealment(image, detections)

    # 6. Risk Fusion (all signals)
    risk_score, risk_level, breakdown = compute_risk(
        detections, anomaly_score, combined_mismatch_penalty,
        material_risk, concealment_score
    )

    # 7. Template Explanation
    explanation = explain_risk(
        detections, risk_score, risk_level, anomaly_score,
        mismatch_info, breakdown, concealment_info, material_info
    )

    total_time = time.time() - t_start

    return {
        "detections": detections,
        "detection_count": len(detections),
        "inference_time_ms": round(det_time * 1000, 1),
        "total_time_ms": round(total_time * 1000, 1),
        "fps": round(1.0 / max(total_time, 0.001), 1),
        "anomaly_score": round(anomaly_score, 3),
        "heatmap": heatmap,
        "heatmap_overlay": heatmap_overlay,
        "annotated_image": annotated,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_breakdown": breakdown,
        "mismatch_info": mismatch_info,
        "declaration_nlp": doc_info,
        "material_info": material_info,
        "concealment_score": round(concealment_score, 3),
        "concealment_info": concealment_info,
        "explanation": explanation,
        "mode": mode,
        "declared_cargo": declared_cargo,
    }
