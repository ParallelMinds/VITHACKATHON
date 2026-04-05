"""
EfficientNet Two-Stage Pipeline: YOLO → ResNet18 Classifier → Risk Scoring

CLIP is dropped to avoid heavy dependencies (~1.7 GB download).
Uses relative paths for local model deployment.
Weights: YOLO 60% + Classifier 40% (risk_scoring.py handles this).
"""
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any

import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image
from ultralytics import YOLO

from classifier_model import ClassifierNet
from xray_filters import preprocess_xray
from risk_scoring import compute_risk_score

device = "cuda" if torch.cuda.is_available() else "cpu"

# ─── Relative paths to model directory ─────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "model" / "efficent-net"

YOLO_WEIGHTS = str(MODEL_DIR / "yolo_best.pt")
CLS_WEIGHTS = str(MODEL_DIR / "classifier_best.pth")

NUM_CLASSES = 12
CLASSIFIER_IMG_SIZE = 224
DET_CONF = 0.15

# ─── Runner-Up Threat Escalation thresholds ────────────────────────────────────
ESCALATION_RUNNER_UP_THRESHOLD = 0.40  # If runner-up Lethal item > 40% probability
ESCALATION_RISK_FLOOR = 0.85           # Escalate risk to minimum 0.85

# ─── Class Names & Taxonomy ────────────────────────────────────────────────────
# NOTE: Order MUST match YOLO model training!
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

class SUPER_CLASS_MAP:
    """Hierarchical class categorization for risk assessment."""
    mapping = {
        "Baton": "Lethal/Restraint",         # 0
        "Pliers": "Metal Tool",              # 1
        "Hammer": "Metal Tool",              # 2
        "Powerbank": "Benign Item",          # 3
        "Scissors": "Lethal/Restraint",      # 4
        "Wrench": "Metal Tool",              # 5
        "Gun": "Lethal/Restraint",           # 6
        "Bullet": "Lethal/Restraint",        # 7
        "Sprayer": "Lethal/Restraint",       # 8
        "HandCuffs": "Lethal/Restraint",     # 9
        "Knife": "Lethal/Restraint",         # 10
        "Lighter": "Lethal/Restraint"        # 11
    }
    
    @classmethod
    def get(cls, key, default="Unknown"):
        """Get super class for a given class name."""
        return cls.mapping.get(key, default)

print(f"Device: {device}")

yolo = None
classifier = None

cls_transform = transforms.Compose([
    transforms.Resize((CLASSIFIER_IMG_SIZE, CLASSIFIER_IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def predict_classifier_topk(crop_rgb: Image.Image, k: int = 3) -> List[Dict[str, Any]]:
    """
    Run classifier on a cropped image and return top K predictions.
    
    Args:
        crop_rgb: PIL Image in RGB format
        k: Number of top predictions to return (default 3)
        
    Returns:
        List of dicts with 'label', 'super_class', and 'probability' keys
    """
    if crop_rgb is None or crop_rgb.size[0] == 0:
        raise ValueError("Invalid crop_rgb: empty or None image")
    
    x = cls_transform(crop_rgb).unsqueeze(0).to(device)
    cls_logits = classifier(x)
    cls_probs = torch.sigmoid(cls_logits).squeeze(0)
    
    # Ensure we don't ask for more k than we have classes
    k = min(k, len(CLASS_NAMES))
    top_probs, top_indices = torch.topk(cls_probs, k=k)
    
    top_predictions = []
    for i in range(k):
        idx = int(top_indices[i].item())
        prob = float(top_probs[i].item())
        cls_name = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else f"class_{idx}"
        super_cls = SUPER_CLASS_MAP.get(cls_name, "Unknown")
        
        top_predictions.append({
            "label": cls_name,
            "super_class": super_cls,
            "probability": prob
        })
        
    return top_predictions

def load_pipeline_models(
    yolo_weights: str = YOLO_WEIGHTS,
    cls_weights: str = CLS_WEIGHTS
) -> Tuple:
    """Load YOLO and classifier models. CLIP is dropped to reduce overhead."""
    global yolo, classifier
    
    if yolo is None:
        if not os.path.exists(yolo_weights):
            raise FileNotFoundError(f"YOLO weights not found: {yolo_weights}")
        yolo = YOLO(yolo_weights)
        print(f"✅ YOLO model loaded from {yolo_weights}")
    
    if classifier is None:
        if not os.path.exists(cls_weights):
            raise FileNotFoundError(f"Classifier weights not found: {cls_weights}")
        
        cls_ckpt = torch.load(cls_weights, map_location=device)
        
        # Handle both checkpoint formats:
        # 1. Full checkpoint with "model_state_dict" key
        # 2. Direct state dict
        if isinstance(cls_ckpt, dict) and "model_state_dict" in cls_ckpt:
            state_dict = cls_ckpt["model_state_dict"]
            num_classes_ckpt = int(cls_ckpt.get("num_classes", NUM_CLASSES))
        else:
            # Fallback: assume it's a direct state dict
            state_dict = cls_ckpt
            num_classes_ckpt = NUM_CLASSES
        
        classifier = ClassifierNet(num_classes=num_classes_ckpt).to(device)
        classifier.load_state_dict(state_dict)
        classifier.eval()
        print(f"✅ Classifier model loaded from {cls_weights}")
    
    return yolo, classifier


def crop_with_padding(img: np.ndarray, box_xyxy: List[float], pad_ratio: float = 0.15) -> np.ndarray:
    """Crop detection box with padding."""
    x1, y1, x2, y2 = map(int, box_xyxy)
    h, w = img.shape[:2]
    bw, bh = x2 - x1, y2 - y1
    pw, ph = int(bw * pad_ratio), int(bh * pad_ratio)

    x1 = max(0, x1 - pw)
    y1 = max(0, y1 - ph)
    x2 = min(w - 1, x2 + pw)
    y2 = min(h - 1, y2 + ph)
    return img[y1:y2, x1:x2]


def compute_risk(
    yolo_conf: float,
    cls_prob: float,
    clip_sim: float,
    detected_class: str = None
) -> float:
    """Compute risk score. clip_sim is kept for API compatibility but defaults to 0."""
    return compute_risk_score(yolo_conf, cls_prob, clip_sim, class_name=detected_class)


def risk_bucket(score: float) -> str:
    """Determine risk level from score. Mirrors risk_scoring.py logic."""
    RISK_THRESHOLD_LOW = 0.35
    RISK_THRESHOLD_HIGH = 0.70
    
    if score >= RISK_THRESHOLD_HIGH:
        return "high"
    if score >= RISK_THRESHOLD_LOW:
        return "medium"
    return "low"


@torch.no_grad()
def run_pipeline(
    image_path: str,
    yolo_weights: str = YOLO_WEIGHTS,
    cls_weights: str = CLS_WEIGHTS
) -> Tuple[List[Dict[str, Any]], int, int]:
    """
    Run the EfficientNet two-stage pipeline (YOLO → ResNet18 classifier).
    Now includes Probabilistic Output and Runner-Up Threat Escalation.
    """
    load_pipeline_models(yolo_weights=yolo_weights, cls_weights=cls_weights)
    
    raw = cv2.imread(image_path)
    if raw is None:
        raise ValueError(f"Failed to read image: {image_path}")
    
    img_height, img_width = raw.shape[:2]
    
    proc = preprocess_xray(raw)
    proc_3ch = cv2.cvtColor(proc, cv2.COLOR_GRAY2BGR)

    det = yolo.predict(proc_3ch, conf=DET_CONF, verbose=False)[0]
    boxes = det.boxes.xyxy.cpu().numpy() if det.boxes is not None else np.empty((0, 4))
    confs = det.boxes.conf.cpu().numpy() if det.boxes is not None else np.array([])

    outputs = []
    for i, box in enumerate(boxes):
        crop = crop_with_padding(raw, box, pad_ratio=0.15)
        if crop.size == 0:
            continue

        crop_pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        
        # --- NEW: Grab Top 3 Predictions ---
        top_preds = predict_classifier_topk(crop_pil, k=3)
        if not top_preds:
            continue  # Skip if no predictions (defensive check)
        
        # Extract primary (#1) prediction to use as the main label
        primary = top_preds[0]
        classifier_class = primary["label"]
        super_class = primary["super_class"]
        cls_prob = primary["probability"]

        clip_similarity = 0.0
        risk = compute_risk(
            float(confs[i]),
            cls_prob,
            clip_similarity,
            detected_class=classifier_class
        )

        # --- NEW: Runner-Up Threat Escalation Logic ---
        escalated = False
        if len(top_preds) > 1:  # Only check runner-ups if we have multiple predictions
            for pred in top_preds[1:]:  # Loop through #2 and #3 predictions
                # If a Lethal item is a close second, escalate the risk automatically!
                if pred["super_class"] == "Lethal/Restraint" and pred["probability"] > ESCALATION_RUNNER_UP_THRESHOLD:
                    risk = max(risk, ESCALATION_RISK_FLOOR)
                    escalated = True
                    break

        x1, y1, x2, y2 = box
        outputs.append({
            "label": classifier_class,
            "super_class": super_class,
            "confidence": round(float(confs[i]), 4),
            "cls_prob": round(cls_prob, 4),
            "risk_score": round(risk, 4),
            "risk_level": risk_bucket(risk),
            
            # --- NEW: Expose probabilistic data to the frontend ---
            "escalated_by_runner_up": escalated,
            "top_predictions": [{"label": p["label"], "prob": round(p["probability"], 4)} for p in top_preds],
            
            "x": round(x1, 2),
            "y": round(y1, 2),
            "width": round(x2 - x1, 2),
            "height": round(y2 - y1, 2),
            "type": "detection",
        })

    return outputs, img_width, img_height
