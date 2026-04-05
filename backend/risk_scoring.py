import numpy as np
import pandas as pd
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"

# Updated Weights: De-weight CLIP noise, rely on YOLO/ResNet
WEIGHT_YOLO = 0.55
WEIGHT_CLS = 0.40
WEIGHT_CLIP = 0.05

RISK_THRESHOLD_LOW = 0.35
RISK_THRESHOLD_HIGH = 0.70

EPS = 1e-6

CLASS_RISK_LEVELS = {
    "Gun": "high",
    "Bullet": "high",
    "HandCuffs": "high",
    "Knife": "high",
    "Baton": "high",
    "Hammer": "high",
    "Wrench": "medium",
    "Pliers": "medium",
    "Scissors": "medium",
    "Sprayer": "medium",
    "Powerbank": "low",
    "Lighter": "low"
}

# Updated Multipliers: Ensure medium/low items stay in their buckets
CLASS_RISK_MULTIPLIERS = {
    "high": 1.5,
    "medium": 0.8,
    "low": 0.4
}

print(f"Device: {device}")

def minmax_clip(x, lo=0.0, hi=1.0):
    return float(np.clip(x, lo, hi))


def get_class_risk_multiplier(class_name):
    """Get risk multiplier for a specific object class. Defaults to 1.0 (medium) for unknown classes."""
    risk_level = CLASS_RISK_LEVELS.get(class_name, "medium")
    return CLASS_RISK_MULTIPLIERS.get(risk_level, 1.0)


def clip_similarity_to_prob(similarity, sim_min=-0.2, sim_max=0.5):
    norm = (similarity - sim_min) / max(sim_max - sim_min, EPS)
    return minmax_clip(norm, 0.0, 1.0)


def compute_risk_score(yolo_conf, cls_prob, clip_similarity, class_name=None):
    y = minmax_clip(yolo_conf)
    c = minmax_clip(cls_prob)
    s = clip_similarity_to_prob(clip_similarity)

    # Calculate weighted base
    raw = (y * WEIGHT_YOLO) + (c * WEIGHT_CLS) + (s * WEIGHT_CLIP)
    
    # Apply class-based sensitivity
    multiplier = get_class_risk_multiplier(class_name)
    score = raw * multiplier
    
    # Robustness hack: If it's a lethal class and YOLO is sure, 
    # don't let a low classifier score drag it down too much.
    if multiplier > 1.0 and y > 0.8:
        score = max(score, 0.85) 

    return minmax_clip(score)


def risk_bucket(score):
    if score >= RISK_THRESHOLD_HIGH:
        return "high"
    if score >= RISK_THRESHOLD_LOW:
        return "medium"
    return "low"

def score_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    required_cols = {"yolo_conf", "cls_prob", "clip_similarity"}
    missing = required_cols.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    out = df.copy()
    out["risk_score"] = out.apply(
        lambda r: compute_risk_score(r["yolo_conf"], r["cls_prob"], r["clip_similarity"]), axis=1
    )
    out["risk_level"] = out["risk_score"].apply(risk_bucket)
    return out


def smoke_test() -> pd.DataFrame:
    sample_df = pd.DataFrame([
        {"yolo_conf": 0.91, "cls_prob": 0.84, "clip_similarity": 0.42},
        {"yolo_conf": 0.51, "cls_prob": 0.35, "clip_similarity": 0.10},
        {"yolo_conf": 0.20, "cls_prob": 0.12, "clip_similarity": -0.05}
    ])
    scored = score_dataframe(sample_df)
    assert scored["risk_score"].between(0, 1).all(), "Risk score must be in [0, 1]"
    print(scored)
    return scored


if __name__ == "__main__":
    smoke_test()