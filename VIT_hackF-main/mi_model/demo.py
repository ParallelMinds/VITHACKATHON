"""
╔══════════════════════════════════════════════════════════════════╗
║           CARGO X-RAY INSPECTOR — CUSTOMS AI SYSTEM             ║
║  YOLOv8s fine-tuned on PIDray | CIIBS Hackathon 2025            ║
╚══════════════════════════════════════════════════════════════════╝

Capabilities:
  ✅ Image Preprocessing & Enhancement
  ✅ Optional Gaussian Denoising
  ✅ Object Detection with Bounding Boxes
  ✅ Object Classification (Prohibited / Restricted / Dual-Use)
  ✅ Heatmap over Suspicious Regions
  ✅ Pessimistic Risk Scoring (security-first model)
  ✅ Confidence Floor for Critical Items (Gun always >= CRITICAL)
  ✅ Inference Reasoning & Officer Recommendation
  ✅ Image Comparison (Manifest Tampering Detection)
  ✅ Analyst Dashboard Interface
  ✅ Scan Audit Log (CSV — auto-saved per scan)
  ✅ Statistics Dashboard Tab
  ✅ [NEW] Ground Truth Validation — TP / FP / FN with IoU matching
  ✅ [NEW] Officer Feedback — live FP / FN flagging logged to CSV
  ✅ [NEW] Precision / Recall / F1 metrics per validation run
"""

# ──────────────────────────────────────────────────────────────────
# IMPORTS
# ──────────────────────────────────────────────────────────────────
import gradio as gr
from ultralytics import YOLO
import numpy as np
from PIL import Image
import cv2
import csv
import os
import json
from datetime import datetime
from pathlib import Path
from collections import Counter


# ──────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).resolve().parent / "best.pt"

DEFAULT_CONF         = 0.03
DEFAULT_IOU          = 0.45
HEATMAP_ALPHA        = 0.45
DIFF_THRESHOLD       = 30
SCAN_LOG_PATH        = "scan_log.csv"
FEEDBACK_LOG_PATH    = "feedback_log.csv"
VALIDATION_LOG_PATH  = "validation_log.csv"

# Preprocessing defaults
DEFAULT_CLAHE_CLIP    = 2.0
DEFAULT_CLAHE_GRID    = 8
DEFAULT_DENOISE       = True
DEFAULT_DENOISE_KSIZE = 3
DEFAULT_DENOISE_SIGMA = 1.0
DEFAULT_SHARP_SIGMA   = 3
DEFAULT_SHARP_WEIGHT  = 1.5
DEFAULT_GAMMA         = 1.2

# Validation colour scheme (BGR for OpenCV)
COLOR_TP  = (0, 200, 0)    # Green  — True Positive
COLOR_FP  = (0, 0, 220)    # Red    — False Positive
COLOR_FN  = (0, 165, 255)  # Orange — False Negative
COLOR_GT  = (200, 200, 0)  # Cyan   — Ground Truth reference
IOU_MATCH_THRESH = 0.45


# ──────────────────────────────────────────────────────────────────
# MODEL LOAD
# ──────────────────────────────────────────────────────────────────
print(f"[INFO] Loading model: {MODEL_PATH}")
model = YOLO(str(MODEL_PATH))
print(f"[INFO] Model loaded. Classes: {list(model.names.values())}")
print(f"[MODEL ACTUALLY LOADED]: {MODEL_PATH}")


# ──────────────────────────────────────────────────────────────────
# THREAT INTELLIGENCE DATABASE
# ──────────────────────────────────────────────────────────────────
THREAT_DB = {
    "Gun":       {"level": "CRITICAL", "score": 100, "color_bgr": (0, 0, 220),
                  "reason": "Firearm detected. Strictly prohibited under international cargo and aviation security law. Immediate cargo detention and law enforcement notification required."},
    "Bullet":    {"level": "CRITICAL", "score": 95,  "color_bgr": (0, 0, 200),
                  "reason": "Live ammunition detected. Prohibited under IATA DGR and customs regulations. Cargo must be secured and flagged for law enforcement review."},
    "Knife":     {"level": "HIGH",     "score": 85,  "color_bgr": (0, 80, 220),
                  "reason": "Bladed weapon detected. Classified as prohibited assault item in cargo screening. Manual inspection and shipper declaration verification required."},
    "Baton":     {"level": "HIGH",     "score": 75,  "color_bgr": (0, 100, 210),
                  "reason": "Impact weapon detected. Restricted item under customs regulations. Requires officer inspection and authorization documentation from shipper."},
    "HandCuffs": {"level": "MEDIUM",   "score": 55,  "color_bgr": (0, 180, 220),
                  "reason": "Restraint device detected. Requires valid declaration and authorization. Cross-check with cargo manifest."},
    "Scissors":  {"level": "MEDIUM",   "score": 45,  "color_bgr": (0, 200, 200),
                  "reason": "Sharp implement detected. Dual-use item flagged for manual inspection. Verify declared purpose and packaging compliance."},
    "Wrench":    {"level": "LOW",      "score": 30,  "color_bgr": (0, 200, 80),
                  "reason": "Tool detected. Common dual-use item. Log for manifest audit."},
    "Pliers":    {"level": "LOW",      "score": 25,  "color_bgr": (0, 200, 80),
                  "reason": "Tool detected. Low-risk dual-use item. Log for audit trail only."},
    "Hammer":    {"level": "LOW",      "score": 25,  "color_bgr": (0, 200, 80),
                  "reason": "Tool detected. Low-risk dual-use item. Log for audit trail only."},
    "Sprayer":   {"level": "LOW",      "score": 30,  "color_bgr": (0, 180, 100),
                  "reason": "Aerosol/sprayer detected. Potential chemical risk. Verify contents declaration and hazmat compliance."},
    "Powerbank": {"level": "LOW",      "score": 20,  "color_bgr": (0, 200, 120),
                  "reason": "High-capacity battery detected. Fire risk per IATA DGR. Verify watt-hour rating against declared specifications."},
    "Lighter":   {"level": "LOW",      "score": 20,  "color_bgr": (0, 200, 120),
                  "reason": "Ignition device detected. Flammable goods restriction applies. Verify quantity and packaging compliance."},
}

SCORE_FLOORS     = {"Gun": 80, "Bullet": 75, "Knife": 60, "Baton": 55}
CRITICAL_CLASSES = {"Gun", "Bullet", "Knife", "Baton"}

COCO_FALLBACK = {
    "knife":    {"level": "HIGH",     "score": 85,  "color_bgr": (0, 80, 220),  "reason": "Bladed weapon detected."},
    "gun":      {"level": "CRITICAL", "score": 100, "color_bgr": (0, 0, 220),   "reason": "Firearm detected."},
    "scissors": {"level": "MEDIUM",   "score": 45,  "color_bgr": (0, 200, 200), "reason": "Sharp implement detected."},
}

def get_threat(class_name):
    if class_name in THREAT_DB:             return THREAT_DB[class_name]
    if class_name.lower() in COCO_FALLBACK: return COCO_FALLBACK[class_name.lower()]
    return {"level": "LOW", "score": 15, "color_bgr": (100, 100, 100),
            "reason": f"{class_name} detected. Not in prohibited list — logged for audit."}

def risk_decision(score):
    if score >= 80: return "CRITICAL — DETAIN CARGO IMMEDIATELY"
    if score >= 60: return "HIGH    — FLAG FOR INSPECTION"
    if score >= 35: return "MEDIUM  — MANUAL CHECK REQUIRED"
    return                 "LOW     — CLEARED (Log Only)"

def risk_emoji(score):
    if score >= 80: return "🔴"
    if score >= 60: return "🟠"
    if score >= 35: return "🟡"
    return                 "🟢"


# ──────────────────────────────────────────────────────────────────
# PESSIMISTIC RISK SCORE CALCULATOR
# ──────────────────────────────────────────────────────────────────
def calculate_wscore(threat, conf, class_name):
    level, base = threat["level"], threat["score"]
    if level == "CRITICAL": wscore = base * (0.4 + 0.6 * conf)
    elif level == "HIGH":   wscore = base * (0.3 + 0.7 * conf)
    else:                   wscore = base * conf
    wscore  = round(wscore, 1)
    floor   = SCORE_FLOORS.get(class_name, 0)
    flagged = ""
    if wscore < floor:
        wscore  = float(floor)
        flagged = " (floor-applied)"
    return wscore, flagged


# ──────────────────────────────────────────────────────────────────
# SCAN AUDIT LOG
# ──────────────────────────────────────────────────────────────────
def log_scan(detections, risk_score, decision):
    file_exists = os.path.exists(SCAN_LOG_PATH)
    with open(SCAN_LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Timestamp", "Detections", "Risk Score", "Decision", "Item Count"])
        detected_names = ", ".join(d["name"] for d in detections) if detections else "None"
        writer.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                         detected_names, f"{risk_score:.0f}", decision, len(detections)])


# ──────────────────────────────────────────────────────────────────
# OFFICER FEEDBACK LOG  [NEW]
# ──────────────────────────────────────────────────────────────────
def log_feedback(detection_name, conf, feedback_type, officer_note=""):
    """
    feedback_type: 'FALSE_POSITIVE' | 'CONFIRMED_TP' | 'FALSE_NEGATIVE'
    """
    file_exists = os.path.exists(FEEDBACK_LOG_PATH)
    with open(FEEDBACK_LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Timestamp", "Detection", "Confidence", "FeedbackType", "OfficerNote"])
        writer.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                         detection_name, f"{conf:.3f}", feedback_type, officer_note])


def load_feedback_stats():
    if not os.path.exists(FEEDBACK_LOG_PATH):
        return "No officer feedback logged yet."
    rows = []
    with open(FEEDBACK_LOG_PATH, "r", encoding="utf-8") as f:
        for r in csv.DictReader(f): rows.append(r)
    if not rows:
        return "No officer feedback logged yet."

    tp    = sum(1 for r in rows if r["FeedbackType"] == "CONFIRMED_TP")
    fp    = sum(1 for r in rows if r["FeedbackType"] == "FALSE_POSITIVE")
    fn    = sum(1 for r in rows if r["FeedbackType"] == "FALSE_NEGATIVE")
    total = tp + fp + fn
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1        = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    fp_by_class = Counter(r["Detection"] for r in rows if r["FeedbackType"] == "FALSE_POSITIVE")
    fn_by_class = Counter(r["Detection"] for r in rows if r["FeedbackType"] == "FALSE_NEGATIVE")

    lines = [
        "OFFICER FEEDBACK — FP / FN STATISTICS", "=" * 46,
        f"  Total Feedback Entries : {total}",
        f"  Confirmed TP           : {tp}",
        f"  False Positives (FP)   : {fp}",
        f"  False Negatives (FN)   : {fn}",
        "",
        f"  Precision  : {precision:.3f}  (TP / (TP + FP))",
        f"  Recall     : {recall:.3f}  (TP / (TP + FN))",
        f"  F1 Score   : {f1:.3f}",
        "",
        "  Top False Positive Classes (model hallucinated):",
                                                 ]
    for cls, cnt in (fp_by_class.most_common(5) or [("—", 0)]):
        lines.append(f"    {cls:14s}: {cnt}x")
    lines.append("  Top False Negative Classes (model missed):")
    for cls, cnt in (fn_by_class.most_common(5) or [("—", 0)]):
        lines.append(f"    {cls:14s}: {cnt}x")
    lines += ["", f"  Log: {FEEDBACK_LOG_PATH}", "=" * 46]
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────
# VALIDATION LOG  [NEW]
# ──────────────────────────────────────────────────────────────────
def log_validation(image_name, tp, fp, fn, precision, recall, f1):
    file_exists = os.path.exists(VALIDATION_LOG_PATH)
    with open(VALIDATION_LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Timestamp", "Image", "TP", "FP", "FN",
                             "Precision", "Recall", "F1"])
        writer.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                         image_name, tp, fp, fn,
                         f"{precision:.3f}", f"{recall:.3f}", f"{f1:.3f}"])


# ──────────────────────────────────────────────────────────────────
# STATS DASHBOARD
# ──────────────────────────────────────────────────────────────────
def load_scan_stats():
    if not os.path.exists(SCAN_LOG_PATH):
        return "No scans logged yet. Run some analyses first."
    rows = []
    with open(SCAN_LOG_PATH, "r", encoding="utf-8") as f:
        for r in csv.DictReader(f): rows.append(r)
    if not rows: return "No scans logged yet."

    total     = len(rows)
    scores    = [float(r["Risk Score"]) for r in rows]
    avg_score = sum(scores) / len(scores)
    critical  = sum(1 for s in scores if s >= 80)
    high      = sum(1 for s in scores if 60 <= s < 80)
    medium    = sum(1 for s in scores if 35 <= s < 60)
    low       = sum(1 for s in scores if s < 35)
    flagged   = critical + high
    flag_pct  = (flagged / total * 100) if total > 0 else 0

    all_items = []
    for r in rows:
        if r["Detections"] != "None":
            all_items.extend([i.strip() for i in r["Detections"].split(",")])
    top_items = Counter(all_items).most_common(3)

    lines = ["SCAN STATISTICS DASHBOARD", "=" * 44,
             f"  Total Scans Logged   : {total}",
             f"  Average Risk Score   : {avg_score:.1f} / 100",
             f"  Flagged (HIGH+CRIT)  : {flagged} ({flag_pct:.1f}%)", "",
             "  Risk Level Breakdown:",
             f"    CRITICAL             : {critical} scans",
             f"    HIGH                 : {high} scans",
             f"    MEDIUM               : {medium} scans",
             f"    LOW                  : {low} scans", "",
             "  Most Detected Items:"]
    for item, count in (top_items or [("—", 0)]):
        lines.append(f"    {item:14s}: {count} detection(s)")
    lines += ["", f"  Log File : {SCAN_LOG_PATH}", "=" * 44]
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────
# MODULE 1 — IMAGE PREPROCESSING & ENHANCEMENT
# ──────────────────────────────────────────────────────────────────
def preprocess_xray(
        image_pil,
        clahe_clip_limit: float = DEFAULT_CLAHE_CLIP,
        clahe_grid_size:  int   = DEFAULT_CLAHE_GRID,
        apply_denoising:  bool  = DEFAULT_DENOISE,
        denoise_ksize:    int   = DEFAULT_DENOISE_KSIZE,
        denoise_sigma:    float = DEFAULT_DENOISE_SIGMA,
        sharp_sigma:      float = DEFAULT_SHARP_SIGMA,
        sharp_weight:     float = DEFAULT_SHARP_WEIGHT,
        gamma:            float = DEFAULT_GAMMA,
):
    img_bgr = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    steps   = []

    # Step 1: CLAHE on LAB L-channel
    lab          = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b      = cv2.split(lab)
    clahe        = cv2.createCLAHE(clipLimit=clahe_clip_limit,
                                   tileGridSize=(clahe_grid_size, clahe_grid_size))
    lab_enhanced = cv2.merge([clahe.apply(l), a, b])
    img_bgr      = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
    steps.append(
        f"1. CLAHE  (clipLimit={clahe_clip_limit}, grid={clahe_grid_size}x{clahe_grid_size})\n"
        "   -> Enhances local contrast in dense/dark cargo regions\n"
        "   -> Operates on L channel (LAB) — colour information preserved"
    )

    # Step 2: Optional Gaussian Denoising
    if apply_denoising:
        ksize   = denoise_ksize if denoise_ksize % 2 == 1 else denoise_ksize + 1
        img_bgr = cv2.GaussianBlur(img_bgr, (ksize, ksize), sigmaX=denoise_sigma)
        steps.append(
            f"2. Gaussian Denoising  (kernel={ksize}x{ksize}, sigma={denoise_sigma})\n"
            "   -> Removes sensor/scatter noise before sharpening\n"
            "   -> Prevents noise amplification in unsharp mask step"
        )
    else:
        steps.append("2. Gaussian Denoising  SKIPPED (apply_denoising=False)")

    # Step 3: Unsharp Masking
    gaussian = cv2.GaussianBlur(img_bgr, (0, 0), sigmaX=sharp_sigma)
    img_bgr  = cv2.addWeighted(img_bgr, sharp_weight, gaussian, -(sharp_weight - 1), 0)
    steps.append(
        f"3. Unsharp Mask  (sigma={sharp_sigma}, weight={sharp_weight})\n"
        "   -> Sharpens weapon outlines and object boundaries\n"
        "   -> Improves YOLO bounding box localisation accuracy"
    )

    # Step 4: Gamma Correction via LUT
    lut     = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype=np.uint8)
    img_bgr = cv2.LUT(img_bgr, lut)
    steps.append(
        f"4. Gamma Correction  (gamma={gamma})\n"
        "   -> Brightens dark X-ray backgrounds without overexposure\n"
        "   -> Applied via pre-computed LUT for zero inference overhead"
    )

    enhanced_pil = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    report = (
            "PREPROCESSING APPLIED\n"
            "─────────────────────────────────────────\n"
            + "\n\n".join(steps)
    )
    return enhanced_pil, report


# ──────────────────────────────────────────────────────────────────
# MODULE 2 — THREAT HEATMAP GENERATOR
# ──────────────────────────────────────────────────────────────────
def generate_heatmap(image_pil, boxes_data):
    img_bgr = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    h, w    = img_bgr.shape[:2]
    heat    = np.zeros((h, w), dtype=np.float32)
    for box in boxes_data:
        x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        sx     = max((x2 - x1) / 3, 10)
        sy     = max((y2 - y1) / 3, 10)
        weight = box["score"] / 100.0
        for gy in range(max(0, y1), min(h, y2)):
            for gx in range(max(0, x1), min(w, x2)):
                heat[gy, gx] += weight * np.exp(
                    -(((gx - cx) ** 2) / (2 * sx ** 2) +
                      ((gy - cy) ** 2) / (2 * sy ** 2)))
    if heat.max() > 0: heat = (heat / heat.max() * 255).astype(np.uint8)
    else:              heat = heat.astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
    mask          = heat > 10
    overlay       = img_bgr.copy()
    blended       = cv2.addWeighted(img_bgr, 1 - HEATMAP_ALPHA, heatmap_color, HEATMAP_ALPHA, 0)
    overlay[mask] = blended[mask]
    return Image.fromarray(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))


# ──────────────────────────────────────────────────────────────────
# MODULE 3 — OFFICER RECOMMENDATION
# ──────────────────────────────────────────────────────────────────
def get_recommendation(score, detections):
    names = ", ".join(d["name"] for d in detections)
    if score >= 80:
        return (f"IMMEDIATE ACTION REQUIRED — {names} detected.\n"
                "  1. Detain cargo. Do NOT release under any circumstances.\n"
                "  2. Notify senior officer and law enforcement immediately.\n"
                "  3. Initiate full physical inspection protocol.")
    if score >= 60:
        return (f"HIGH PRIORITY FLAG — {names} detected.\n"
                "  1. Assign to manual inspection queue.\n"
                "  2. Cross-check against declared cargo manifest.\n"
                "  3. Request supporting documentation from shipper.")
    if score >= 35:
        return (f"ADVISORY — Dual-use item(s) found: {names}.\n"
                "  1. Verify declared purpose in manifest.\n"
                "  2. Officer discretion advised.\n"
                "  3. Documentation review recommended.")
    return (f"LOW RISK — Item(s) logged: {names}.\n"
            "  No immediate action required.\n"
            "  Proceed with standard clearance protocol.")


# ──────────────────────────────────────────────────────────────────
# MODULE 4 — MAIN ANALYSIS PIPELINE
# ──────────────────────────────────────────────────────────────────
def analyze_image(image_pil, conf_threshold=DEFAULT_CONF, iou_threshold=DEFAULT_IOU,
                  apply_denoising=DEFAULT_DENOISE, denoise_ksize=DEFAULT_DENOISE_KSIZE):
    if image_pil is None:
        empty = "No image."
        return None, None, None, empty, empty, empty, gr.update(visible=False), "[]"

    enhanced_pil, pre_report = preprocess_xray(image_pil,
                                               apply_denoising=apply_denoising,
                                               denoise_ksize=int(denoise_ksize))
    results    = model(np.array(enhanced_pil), conf=conf_threshold, iou=iou_threshold)[0]
    detect_img = Image.fromarray(results.plot())

    if len(results.boxes) == 0:
        img_arr  = np.array(enhanced_pil.convert("L"))
        is_dense = float(img_arr.mean()) < 180
        if is_dense:
            sus_score = 65
            decision  = risk_decision(sus_score)
            no_threat = (f"WARNING: NO OBJECTS DETECTED — BUT IMAGE IS DENSE\n\n"
                         f"Risk Score : {sus_score} / 100\n"
                         f"Decision   : {risk_emoji(sus_score)} {decision}")
            log_scan([], sus_score, decision)
            return (enhanced_pil, detect_img, enhanced_pil, pre_report, no_threat,
                    "SUSPICIOUS — Dense cargo, no clear detection.\n"
                    "  1. Do NOT auto-clear this shipment.\n"
                    "  2. Assign to manual inspection queue.\n"
                    "  3. Dense/overlapping cargo may be concealing prohibited items.",
                    gr.update(visible=False), "[]")
        else:
            decision  = risk_decision(0)
            no_threat = (f"No suspicious items detected.\n\nRisk Score : 0 / 100\n"
                         f"Decision   : {risk_emoji(0)} {decision}")
            log_scan([], 0, decision)
            return (enhanced_pil, detect_img, enhanced_pil, pre_report, no_threat,
                    "No prohibited or restricted items found.\nShipment cleared. No officer action required.",
                    gr.update(visible=False), "[]")

    detections = []
    boxes_data = []
    max_score  = 0.0

    for box in results.boxes:
        name   = model.names[int(box.cls)]
        conf   = float(box.conf)
        xyxy   = box.xyxy[0].tolist()
        threat = get_threat(name)
        wscore, floor_flag = calculate_wscore(threat, conf, name)
        max_score = max(max_score, wscore)
        detections.append({"name": name, "conf": conf,
                           "level": threat["level"] + floor_flag,
                           "score": wscore, "reason": threat["reason"]})
        boxes_data.append({"x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3],
                           "score": wscore, "color_bgr": threat["color_bgr"]})

    detections.sort(key=lambda d: d["score"], reverse=True)
    heatmap_img = generate_heatmap(enhanced_pil, boxes_data)
    emoji       = risk_emoji(max_score)
    decision    = risk_decision(max_score)

    summary = [f"  {len(detections)} ITEM(S) DETECTED", "─" * 46]
    for d in detections:
        summary.append(f"  {d['level']:22s} | {d['name']:12s} | "
                       f"conf {d['conf']:.1%} | score {d['score']:.0f}/100")
    summary += ["─" * 46, f"Risk Score : {max_score:.0f} / 100",
                f"Decision   : {emoji} {decision}", "",
                "Scoring model: pessimistic security-first.",
                "Critical threats receive confidence floors —",
                "even low-confidence gun detections are flagged CRITICAL."]

    reasoning = ["INFERENCE REASONING", "=" * 46]
    for i, d in enumerate(detections, 1):
        reasoning.append(f"\n[{i}] {d['name']}  |  {d['level']}  |  {d['conf']:.1%} confidence\n"
                         f"    Risk Score : {d['score']:.0f}/100\n"
                         f"    Reason     : {d['reason']}")
    reasoning += ["\n" + "─" * 46, "OFFICER RECOMMENDATION:",
                  get_recommendation(max_score, detections)]

    log_scan(detections, max_score, decision)

    # Build officer feedback panel hint text
    fb_rows = [f"  [{d['name']}]  conf={d['conf']:.1%}  score={d['score']:.0f}" for d in detections]
    feedback_hint = (
            "─" * 46 + "\nOFFICER FEEDBACK — Detections this scan:\n" +
            "\n".join(fb_rows) +
            "\n" + "─" * 46 +
            "\nUse the buttons below to mark each as TP / FP, or report a missed item (FN).\n"
            "All feedback is logged to: " + FEEDBACK_LOG_PATH
    )

    last_detections_json = json.dumps([{"name": d["name"], "conf": d["conf"]} for d in detections])

    return (enhanced_pil, detect_img, heatmap_img,
            pre_report, "\n".join(summary), "\n".join(reasoning),
            gr.update(visible=True, value=feedback_hint),
            last_detections_json)


# ──────────────────────────────────────────────────────────────────
# MODULE 5 — IMAGE COMPARISON PIPELINE
# ──────────────────────────────────────────────────────────────────
def compare_images(img_a_pil, img_b_pil, conf_threshold=DEFAULT_CONF):
    if img_a_pil is None or img_b_pil is None:
        return None, None, None, "Upload both images to compare."

    enh_a, _ = preprocess_xray(img_a_pil)
    enh_b, _ = preprocess_xray(img_b_pil)
    arr_a    = np.array(enh_a)
    arr_b    = cv2.resize(np.array(enh_b), (arr_a.shape[1], arr_a.shape[0]))
    res_a    = model(arr_a, conf=conf_threshold)[0]
    res_b    = model(arr_b, conf=conf_threshold)[0]
    ann_a    = Image.fromarray(res_a.plot())
    ann_b    = Image.fromarray(res_b.plot())

    gray_a    = cv2.cvtColor(arr_a, cv2.COLOR_RGB2GRAY)
    gray_b    = cv2.cvtColor(arr_b, cv2.COLOR_RGB2GRAY)
    diff      = cv2.absdiff(gray_a, gray_b)
    _, thr    = cv2.threshold(diff, DIFF_THRESHOLD, 255, cv2.THRESH_BINARY)
    diff_heat = cv2.applyColorMap(cv2.GaussianBlur(thr, (21, 21), 0), cv2.COLORMAP_HOT)
    diff_pil  = Image.fromarray(
        cv2.cvtColor(
            cv2.addWeighted(cv2.cvtColor(arr_a, cv2.COLOR_RGB2BGR), 0.6, diff_heat, 0.4, 0),
            cv2.COLOR_BGR2RGB))

    names_a       = {res_a.names[int(b.cls)] for b in res_a.boxes}
    names_b       = {res_b.names[int(b.cls)] for b in res_b.boxes}
    new_items     = names_b - names_a
    missing_items = names_a - names_b
    common_items  = names_a & names_b
    risk_flag     = bool(new_items or missing_items)

    lines = ["CARGO COMPARISON REPORT", "=" * 42,
             f"Scan A : {len(res_a.boxes)} item(s)  —  {', '.join(names_a) or 'None'}",
             f"Scan B : {len(res_b.boxes)} item(s)  —  {', '.join(names_b) or 'None'}", ""]
    if new_items:     lines.append(f"  NEW in Scan B (undeclared) : {', '.join(new_items)}")
    if missing_items: lines.append(f"  MISSING from Scan B        : {', '.join(missing_items)}")
    if common_items:  lines.append(f"  Consistent in both scans   : {', '.join(common_items)}")
    if not risk_flag: lines.append("  No item differences detected between scans.")
    lines += ["", "─" * 42,
              f"TAMPERING RISK : {'HIGH — Discrepancy detected' if risk_flag else 'LOW — Scans consistent'}",
              "", "ANOMALY MAP: Bright regions show significant pixel-level changes between the two scans."]
    return ann_a, ann_b, diff_pil, "\n".join(lines)


# ──────────────────────────────────────────────────────────────────
# MODULE 6 — GROUND TRUTH VALIDATION  [NEW]
# ──────────────────────────────────────────────────────────────────
def compute_iou(box_a, box_b):
    """Compute IoU between two [x1, y1, x2, y2] boxes."""
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    ix1 = max(ax1, bx1); iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2); iy2 = min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = ((ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1)) - inter
    return inter / union if union > 0 else 0.0


def parse_yolo_label(label_path, img_w, img_h):
    """
    Parse a YOLO-format annotation .txt file.
    Format per line:  class_id  cx_norm  cy_norm  w_norm  h_norm
    Returns list of {"class": str, "box": [x1, y1, x2, y2]}
    """
    boxes = []
    with open(label_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5: continue
            cls_id = int(parts[0])
            cx, cy, bw, bh = map(float, parts[1:5])
            x1 = (cx - bw / 2) * img_w;  y1 = (cy - bh / 2) * img_h
            x2 = (cx + bw / 2) * img_w;  y2 = (cy + bh / 2) * img_h
            cls_name = model.names.get(cls_id, f"class_{cls_id}")
            boxes.append({"class": cls_name, "box": [x1, y1, x2, y2]})
    return boxes


def draw_validation_overlay(image_pil, tp_list, fp_list, fn_list, gt_boxes):
    """
    Draw colour-coded bounding boxes:
      Green  solid   = True Positive  (matched prediction)
      Red    solid   = False Positive (unmatched prediction)
      Orange dashed  = False Negative (missed GT object)
      Cyan   thin    = Ground Truth reference
    """
    img       = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    thickness = 2
    font      = cv2.FONT_HERSHEY_SIMPLEX
    fs        = 0.55

    # Ground truth — thin cyan outline (reference only, not scored)
    for gt in gt_boxes:
        x1, y1, x2, y2 = [int(v) for v in gt["box"]]
        cv2.rectangle(img, (x1, y1), (x2, y2), COLOR_GT, 1)
        cv2.putText(img, f"GT:{gt['class']}", (x1, y1 - 4), font, 0.4, COLOR_GT, 1)

    # True Positives — solid green
    for item in tp_list:
        x1, y1, x2, y2 = [int(v) for v in item["pred_box"]]
        cv2.rectangle(img, (x1, y1), (x2, y2), COLOR_TP, thickness)
        mismatch = f" ≠GT:{item['gt_class']}" if item["class"] != item["gt_class"] else ""
        cv2.putText(img, f"TP:{item['class']}{mismatch} {item['conf']:.0%}",
                    (x1, max(y1 - 6, 12)), font, fs, COLOR_TP, thickness)

    # False Positives — solid red
    for item in fp_list:
        x1, y1, x2, y2 = [int(v) for v in item["pred_box"]]
        cv2.rectangle(img, (x1, y1), (x2, y2), COLOR_FP, thickness)
        cv2.putText(img, f"FP:{item['class']} {item['conf']:.0%}",
                    (x1, max(y1 - 6, 12)), font, fs, COLOR_FP, thickness)

    # False Negatives — dashed orange
    for item in fn_list:
        x1, y1, x2, y2 = [int(v) for v in item["box"]]
        dash = 8
        for xi in range(x1, x2, dash * 2):
            cv2.line(img, (xi, y1),         (min(xi + dash, x2), y1),         COLOR_FN, thickness)
            cv2.line(img, (xi, y2),         (min(xi + dash, x2), y2),         COLOR_FN, thickness)
        for yi in range(y1, y2, dash * 2):
            cv2.line(img, (x1, yi),         (x1, min(yi + dash, y2)),         COLOR_FN, thickness)
            cv2.line(img, (x2, yi),         (x2, min(yi + dash, y2)),         COLOR_FN, thickness)
        cv2.putText(img, f"FN:{item['class']} MISSED",
                    (x1, max(y1 - 6, 12)), font, fs, COLOR_FN, thickness)

    # Legend (top-left)
    legend_y = 20
    for color, text in [(COLOR_TP, "True Positive"),
                        (COLOR_FP, "False Positive"),
                        (COLOR_FN, "False Negative (missed)"),
                        (COLOR_GT, "Ground Truth (ref)")]:
        cv2.rectangle(img, (8, legend_y - 10), (20, legend_y + 2), color, -1)
        cv2.putText(img, text, (24, legend_y), font, 0.48, color, 1)
        legend_y += 18

    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def validate_with_ground_truth(image_pil, label_file,
                               conf_threshold=DEFAULT_CONF,
                               iou_thresh=IOU_MATCH_THRESH):
    """
    Compare model predictions against YOLO ground truth annotations.

    Algorithm
    ─────────
    For each predicted box:
      - Find the highest-IoU unmatched GT box
      - If best IoU >= iou_thresh  →  TP  (mark that GT box as matched)
      - Else                       →  FP  (no GT box for this prediction)
    Any GT box not matched by any prediction  →  FN (missed)

    Outputs colour-coded image + Precision / Recall / F1 report.
    """
    if image_pil is None:
        return None, "Upload an X-ray image first."
    if label_file is None:
        return None, "Upload a YOLO-format ground truth label (.txt) file."

    enhanced_pil, _ = preprocess_xray(image_pil)
    img_w, img_h    = enhanced_pil.size
    results         = model(np.array(enhanced_pil), conf=conf_threshold)[0]

    gt_boxes    = parse_yolo_label(label_file.name, img_w, img_h)
    predictions = [{"class":    model.names[int(b.cls)],
                    "conf":     float(b.conf),
                    "pred_box": b.xyxy[0].tolist()}
                   for b in results.boxes]

    # IoU matching
    matched_gt = set()
    tp_list    = []
    fp_list    = []

    for pred in predictions:
        best_iou  = 0.0
        best_gt_i = -1
        for gi, gt in enumerate(gt_boxes):
            if gi in matched_gt: continue
            iou = compute_iou(pred["pred_box"], gt["box"])
            if iou > best_iou:
                best_iou  = iou
                best_gt_i = gi

        if best_iou >= iou_thresh and best_gt_i >= 0:
            matched_gt.add(best_gt_i)
            tp_list.append({**pred, "iou": best_iou,
                            "gt_class": gt_boxes[best_gt_i]["class"]})
        else:
            fp_list.append({**pred, "best_iou": best_iou})

    fn_list = [gt_boxes[i] for i in range(len(gt_boxes)) if i not in matched_gt]

    n_tp      = len(tp_list)
    n_fp      = len(fp_list)
    n_fn      = len(fn_list)
    precision = n_tp / (n_tp + n_fp) if (n_tp + n_fp) > 0 else 0.0
    recall    = n_tp / (n_tp + n_fn) if (n_tp + n_fn) > 0 else 0.0
    f1        = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    log_validation(getattr(label_file, "name", "unknown"),
                   n_tp, n_fp, n_fn, precision, recall, f1)

    annotated = draw_validation_overlay(enhanced_pil, tp_list, fp_list, fn_list, gt_boxes)

    lines = [
        "GROUND TRUTH VALIDATION REPORT", "=" * 50,
        f"  GT Objects in Label  : {len(gt_boxes)}",
        f"  Model Predictions    : {len(predictions)}",
        f"  IoU Match Threshold  : {iou_thresh}", "",
        f"  ✅  True Positives  (TP) : {n_tp}  — correctly detected",
        f"  ❌  False Positives (FP) : {n_fp}  — model hallucinated",
        f"  🔍  False Negatives (FN) : {n_fn}  — model missed",
        "", "─" * 50,
        f"  Precision  : {precision:.3f}   (TP / (TP + FP))",
        f"  Recall     : {recall:.3f}   (TP / (TP + FN))",
        f"  F1 Score   : {f1:.3f}   (harmonic mean P & R)",
        "", "─" * 50,
                                          ]

    if tp_list:
        lines.append("  TRUE POSITIVES:")
        for t in tp_list:
            mismatch = f"  ⚠ GT class was {t['gt_class']}" if t["class"] != t["gt_class"] else ""
            lines.append(f"    {t['class']:12s}  conf={t['conf']:.1%}  IoU={t['iou']:.2f}{mismatch}")

    if fp_list:
        lines += ["", "  FALSE POSITIVES (spurious — no GT match):"]
        for item in fp_list:
            lines.append(f"    {item['class']:12s}  conf={item['conf']:.1%}  "
                         f"best_IoU={item['best_iou']:.2f}")

    if fn_list:
        lines += ["", "  FALSE NEGATIVES (missed GT objects):"]
        for item in fn_list:
            lines.append(f"    {item['class']:12s}  → not detected at conf >= {conf_threshold}")

    lines += [
        "", "─" * 50,
        "TUNING GUIDE:",
        "  Recall is the critical metric for border security.",
        "  A missed Gun (FN) is far more dangerous than a false alarm (FP).",
        "",
        "  To reduce False Negatives (raise Recall)  → LOWER Confidence Threshold",
        "  To reduce False Positives (raise Precision) → RAISE Confidence Threshold",
        "  Adjust the sliders above and re-run to find your operational sweet spot.",
            ]

    return annotated, "\n".join(lines)


# ──────────────────────────────────────────────────────────────────
# GRADIO INTERFACE
# ──────────────────────────────────────────────────────────────────
CSS = """
.risk-box textarea { font-family: 'Courier New', monospace !important; font-size: 12.5px !important; }
.title-md { text-align: center; }
"""

with gr.Blocks(css=CSS, title="Cargo X-Ray Inspector") as app:

    last_detections_state = gr.State("[]")

    gr.Markdown("""
    # CARGO X-RAY INSPECTOR
    ### AI-Powered Prohibited Item Detection — Customs & Border Security
    *YOLOv8s fine-tuned on PIDray · 124,486 X-ray Images · 12 Prohibited Item Categories*
    ---
    """, elem_classes="title-md")

    # ── TAB 1: Threat Analysis ─────────────────────────────────────
    with gr.Tab("Threat Analysis"):
        gr.Markdown("Upload a cargo X-ray. The system preprocesses it, detects threats, "
                    "generates a heatmap, and produces a full officer report.")
        with gr.Row():
            with gr.Column(scale=1):
                inp_img = gr.Image(type="pil", label="Upload X-Ray Image")
                gr.Markdown("#### Detection Settings")
                conf_sl = gr.Slider(0.03, 0.90, DEFAULT_CONF, step=0.05,
                                    label="Confidence Threshold (lower = catches more hidden items)")
                iou_sl  = gr.Slider(0.10, 0.90, DEFAULT_IOU,  step=0.05,
                                    label="IoU Threshold (NMS)")
                gr.Markdown("#### Preprocessing Settings")
                denoise_toggle   = gr.Checkbox(value=DEFAULT_DENOISE,
                                               label="Enable Gaussian Denoising (recommended for noisy scans)")
                denoise_ksize_sl = gr.Slider(3, 7, DEFAULT_DENOISE_KSIZE, step=2,
                                             label="Denoise Kernel Size  (3=mild · 5=moderate · 7=strong)",
                                             visible=DEFAULT_DENOISE)
                denoise_toggle.change(fn=lambda v: gr.update(visible=v),
                                      inputs=[denoise_toggle], outputs=[denoise_ksize_sl])
                run_btn = gr.Button("RUN THREAT ANALYSIS", variant="primary", size="lg")

            with gr.Column(scale=2):
                with gr.Row():
                    pre_out = gr.Image(label="1. Preprocessed Image")
                    det_out = gr.Image(label="2. Bounding Box Detection")
                    hm_out  = gr.Image(label="3. Threat Heatmap")

        with gr.Row():
            pre_txt  = gr.Textbox(label="Preprocessing Steps",                  lines=8, elem_classes="risk-box")
            risk_txt = gr.Textbox(label="Risk Summary",                         lines=8, elem_classes="risk-box")
            rea_txt  = gr.Textbox(label="Inference Reasoning & Recommendation", lines=8, elem_classes="risk-box")

        # ── Officer Feedback Panel [NEW] ───────────────────────────
        with gr.Group(visible=False) as feedback_panel:
            gr.Markdown("---\n### 👮 Officer Feedback — Flag False Positives / Missed Items")
            gr.Markdown(
                "Use this after reviewing the scan physically. "
                "Your feedback builds precision/recall statistics over time."
            )
            fb_info = gr.Textbox(label="Detections This Scan", lines=5,
                                 elem_classes="risk-box", interactive=False)

            with gr.Row():
                # False Positive
                with gr.Column():
                    gr.Markdown("#### ❌ False Positive\n*Model detected something NOT actually there*")
                    fp_class  = gr.Dropdown(choices=list(THREAT_DB.keys()),
                                            label="Wrongly detected class")
                    fp_note   = gr.Textbox(label="Officer note (optional)", lines=1)
                    fp_btn    = gr.Button("Log FALSE POSITIVE", variant="stop")
                    fp_status = gr.Textbox(label="", lines=1, interactive=False)

                # Confirmed TP
                with gr.Column():
                    gr.Markdown("#### ✅ Confirmed True Positive\n*Model correctly detected a real threat*")
                    tp_class  = gr.Dropdown(choices=list(THREAT_DB.keys()),
                                            label="Correctly detected class")
                    tp_note   = gr.Textbox(label="Officer note (optional)", lines=1)
                    tp_btn    = gr.Button("Log CONFIRMED TRUE POSITIVE", variant="primary")
                    tp_status = gr.Textbox(label="", lines=1, interactive=False)

                # False Negative
                with gr.Column():
                    gr.Markdown("#### 🔍 False Negative\n*A real threat the model MISSED entirely*")
                    fn_class  = gr.Dropdown(choices=list(THREAT_DB.keys()),
                                            label="Missed class (not detected)")
                    fn_note   = gr.Textbox(label="Officer note (optional)", lines=1)
                    fn_btn    = gr.Button("Log FALSE NEGATIVE (MISSED)", variant="secondary")
                    fn_status = gr.Textbox(label="", lines=1, interactive=False)

        def _log_fp(cls, note):
            if not cls: return "⚠ Select a class first."
            log_feedback(cls, 0.0, "FALSE_POSITIVE", note)
            return f"✅ Logged: {cls} → FALSE_POSITIVE"

        def _log_tp(cls, note):
            if not cls: return "⚠ Select a class first."
            log_feedback(cls, 0.0, "CONFIRMED_TP", note)
            return f"✅ Logged: {cls} → CONFIRMED_TP"

        def _log_fn(cls, note):
            if not cls: return "⚠ Select a class first."
            log_feedback(cls, 0.0, "FALSE_NEGATIVE", note)
            return f"✅ Logged: {cls} → FALSE_NEGATIVE (missed)"

        fp_btn.click(fn=_log_fp, inputs=[fp_class, fp_note], outputs=[fp_status])
        tp_btn.click(fn=_log_tp, inputs=[tp_class, tp_note], outputs=[tp_status])
        fn_btn.click(fn=_log_fn, inputs=[fn_class, fn_note], outputs=[fn_status])

        run_btn.click(
            fn=analyze_image,
            inputs=[inp_img, conf_sl, iou_sl, denoise_toggle, denoise_ksize_sl],
            outputs=[pre_out, det_out, hm_out, pre_txt, risk_txt, rea_txt,
                     fb_info, last_detections_state],
        )
        run_btn.click(fn=lambda: gr.update(visible=True),
                      inputs=[], outputs=[feedback_panel])

    # ── TAB 2: Ground Truth Validation [NEW] ──────────────────────
    with gr.Tab("🔬 Validation (FP / FN)"):
        gr.Markdown("""
        ### Ground Truth Validation Mode
        Upload an X-ray image **and** its YOLO-format label file (`.txt`).
        The system compares model predictions against ground truth annotations
        and shows exactly which detections are TP, FP, or FN.

        **Label file format** (standard YOLO .txt):
        ```
        class_id  cx_norm  cy_norm  width_norm  height_norm
        0  0.512  0.398  0.085  0.112
        ```
        *All values are normalised 0–1 relative to image width/height.*
        """)
        with gr.Row():
            val_img   = gr.Image(type="pil", label="Upload X-Ray Image")
            val_label = gr.File(label="Upload Ground Truth Label (.txt)", file_types=[".txt"])
        with gr.Row():
            val_conf = gr.Slider(0.03, 0.90, DEFAULT_CONF, step=0.05,
                                 label="Confidence Threshold")
            val_iou  = gr.Slider(0.10, 0.90, IOU_MATCH_THRESH, step=0.05,
                                 label="IoU Match Threshold  (higher = stricter TP matching)")
        val_btn = gr.Button("RUN VALIDATION", variant="primary", size="lg")
        val_img_out = gr.Image(label="Validation Overlay   🟢 TP  |  🔴 FP  |  🟠 FN (dashed)  |  🔵 GT (ref)")
        val_report  = gr.Textbox(label="Validation Report — TP / FP / FN / Precision / Recall / F1",
                                 lines=30, elem_classes="risk-box")

        val_btn.click(fn=validate_with_ground_truth,
                      inputs=[val_img, val_label, val_conf, val_iou],
                      outputs=[val_img_out, val_report])

        gr.Markdown("""
        ---
        #### Colour Legend
        | Colour | Box Style | Meaning |
        |---|---|---|
        | 🟢 Green | Solid | **True Positive** — prediction matched a GT object (IoU ≥ threshold) |
        | 🔴 Red | Solid | **False Positive** — prediction with no matching GT object |
        | 🟠 Orange | Dashed | **False Negative** — GT object with no matching prediction |
        | 🔵 Cyan | Thin | Ground Truth reference box (from your label file) |

        #### Why Recall matters more than Precision in security
        A **False Negative** (missed gun) is a security failure.
        A **False Positive** (false alarm) is just wasted officer time.
        Always tune your Confidence Threshold to maximise Recall first.
        """)

    # ── TAB 3: Cargo Comparison ────────────────────────────────────
    with gr.Tab("Cargo Comparison"):
        gr.Markdown("Compare two X-ray scans to detect manifest tampering, "
                    "item substitution, or undeclared additions.")
        with gr.Row():
            ca = gr.Image(type="pil", label="Scan A — Reference")
            cb = gr.Image(type="pil", label="Scan B — Comparison")
        conf_sl2 = gr.Slider(0.03, 0.90, DEFAULT_CONF, step=0.05, label="Confidence Threshold")
        cmp_btn  = gr.Button("COMPARE SCANS", variant="primary", size="lg")
        with gr.Row():
            ca_out = gr.Image(label="Scan A — Detections")
            cb_out = gr.Image(label="Scan B — Detections")
            df_out = gr.Image(label="Pixel Difference Map")
        cmp_txt = gr.Textbox(label="Comparison Report", lines=14, elem_classes="risk-box")
        cmp_btn.click(fn=compare_images, inputs=[ca, cb, conf_sl2],
                      outputs=[ca_out, cb_out, df_out, cmp_txt])

    # ── TAB 4: Scan Statistics ─────────────────────────────────────
    with gr.Tab("Scan Statistics"):
        gr.Markdown("Live statistics from all scans. Every scan is auto-logged to CSV.")
        refresh_btn    = gr.Button("Refresh Scan Statistics",              variant="secondary")
        stats_out      = gr.Textbox(label="Scan Statistics",              lines=20, elem_classes="risk-box")
        refresh_fb_btn = gr.Button("Refresh Officer Feedback Statistics",  variant="secondary")
        fb_stats_out   = gr.Textbox(label="Officer Feedback FP/FN Stats", lines=20, elem_classes="risk-box")
        gr.Markdown(
            f"Logs: `{SCAN_LOG_PATH}` | `{FEEDBACK_LOG_PATH}` | `{VALIDATION_LOG_PATH}`"
        )
        refresh_btn.click(fn=load_scan_stats,        inputs=[], outputs=[stats_out])
        refresh_fb_btn.click(fn=load_feedback_stats, inputs=[], outputs=[fb_stats_out])

    # ── TAB 5: System Info ─────────────────────────────────────────
    with gr.Tab("System Info"):
        gr.Markdown("""
        ## System Configuration

        | Parameter | Value |
        |---|---|
        | Base Architecture | YOLOv8s |
        | Dataset | PIDray — 124,486 X-ray images |
        | Training Images | 76,913 (train_0 + train_1) |
        | Test Images | 47,573 |
        | Prohibited Categories | 12 |
        | Hardware | NVIDIA RTX 3050 4GB VRAM |
        | Batch Size | 12 |
        | Image Size | 640x640 |

        ## Preprocessing Pipeline

        | Step | Method | Default | Purpose |
        |---|---|---|---|
        | 1 | CLAHE (LAB L-channel) | clip=2.0, grid=8x8 | Local contrast boost in dense cargo |
        | 2 | Gaussian Denoising *(optional)* | kernel=3, σ=1.0 | Noise removal before sharpening |
        | 3 | Unsharp Masking | σ=3, weight=1.5 | Weapon edge sharpening for YOLO |
        | 4 | Gamma Correction (LUT) | γ=1.2 | Dark X-ray background lift |

        ## FP / FN Detection Methods

        | Method | How it works | When to use |
        |---|---|---|
        | **Ground Truth Validation tab** | Upload YOLO .txt label → IoU matching → TP/FP/FN boxes | Labelled test images |
        | **Officer Feedback panel** | Click FP/TP/FN after physical inspection | Live deployment |

        **Metrics computed in both methods:**
        - Precision = TP / (TP + FP) — reliability of positive detections
        - Recall    = TP / (TP + FN) — fraction of real threats caught
        - F1        = harmonic mean of Precision and Recall

        ## Pessimistic Security Scoring

        | Threat Level | Formula | Example |
        |---|---|---|
        | CRITICAL | base × (0.4 + 0.6 × conf) | Gun at 31% conf → score 58.6 → HIGH |
        | HIGH | base × (0.3 + 0.7 × conf) | Knife at 31% conf → score 43.9 → MEDIUM |
        | LOW/MEDIUM | base × conf | Standard |

        Hard floors: Gun ≥ 80, Bullet ≥ 75, Knife ≥ 60, Baton ≥ 55

        ## Detectable Items
        Gun | Bullet | Knife | Baton | HandCuffs | Scissors | Wrench | Pliers | Hammer | Sprayer | Powerbank | Lighter
        """)


# ──────────────────────────────────────────────────────────────────
# LAUNCH
# ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.launch(share=True)