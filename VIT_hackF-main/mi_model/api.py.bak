"""
╔══════════════════════════════════════════════════════════════════╗
║         CARGO X-RAY INSPECTOR — FASTAPI BACKEND                 ║
║  Wraps demo.py logic for React frontend connection               ║
║  Place this file in the SAME folder as demo.py                  ║
╚══════════════════════════════════════════════════════════════════╝

Install:
    pip install fastapi uvicorn python-multipart pillow

Run:
    python api.py
    → Runs on http://localhost:8000
    → Swagger docs at http://localhost:8000/docs

React fetch example:
    const res  = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData,          // FormData with key "file"
    });
    const data = await res.json();
"""

# ──────────────────────────────────────────────────────────────────
# IMPORTS
# ──────────────────────────────────────────────────────────────────
import io
import base64
import os
import csv
import json
from PIL import Image

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore

# ── Import all logic from demo.py (same folder) ──────────────────
from demo import (
    analyze_image,
    compare_images,
    load_scan_stats,
    MODEL_PATH,
    model,
)


# ──────────────────────────────────────────────────────────────────
# APP SETUP
# ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cargo X-Ray Inspector API",
    description="YOLOv8s fine-tuned on PIDray — 12 prohibited item categories",
    version="1.0.0",
)

# ── CORS — allow React dev server (adjust origins in production) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # ← change to your React URL in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────
# HELPER — Convert PIL Image → base64 string for JSON transport
# ──────────────────────────────────────────────────────────────────
def pil_to_b64(image: Optional[Image.Image]) -> Optional[str]:
    """Returns a base64-encoded JPEG string, or None if image is None."""
    if image is None:
        return None
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def read_upload(file_bytes: bytes) -> Image.Image:
    """Convert raw uploaded bytes → PIL Image (RGB)."""
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


# ──────────────────────────────────────────────────────────────────
# ENDPOINT 1 — Health Check
# GET /api/health
# ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    """
    Quick sanity check. React can ping this on load to confirm
    the backend and model are ready.
    """
    return {
        "status": "ok",
        "model_loaded": True,
        "model_path": MODEL_PATH,
        "classes": list(model.names.values()),
    }


# ──────────────────────────────────────────────────────────────────
# ENDPOINT 2 — Threat Analysis
# POST /api/analyze
#
# Body (multipart/form-data):
#   file         : image file  (required)
#   conf         : float 0–1   (optional, default 0.25)
#   iou          : float 0–1   (optional, default 0.45)
#
# Returns JSON:
#   preprocessed_image  : base64 JPEG string
#   detected_image      : base64 JPEG string
#   heatmap_image       : base64 JPEG string
#   preprocessing_text  : string
#   risk_summary        : string
#   reasoning           : string
# ──────────────────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    conf: float = 0.25,
    iou:  float = 0.45,
):
    # ── Validate file type ───────────────────────────────────────
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/bmp"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Send JPEG, PNG, WEBP, or BMP.",
        )

    # ── Read + convert ───────────────────────────────────────────
    raw   = await file.read()
    img   = read_upload(raw)

    # ── Run the full pipeline (same function as demo.py Tab 1) ───
    pre_img, det_img, hm_img, pre_txt, risk_txt, reasoning_txt = analyze_image(
        img, conf_threshold=conf, iou_threshold=iou
    )

    return JSONResponse({
        "preprocessed_image": pil_to_b64(pre_img),
        "detected_image":     pil_to_b64(det_img),
        "heatmap_image":      pil_to_b64(hm_img),
        "preprocessing_text": pre_txt,
        "risk_summary":       risk_txt,
        "reasoning":          reasoning_txt,
    })


# ──────────────────────────────────────────────────────────────────
# ENDPOINT 3 — Cargo Comparison (Tampering Detection)
# POST /api/compare
#
# Body (multipart/form-data):
#   file_a  : image file  (required) — Reference scan
#   file_b  : image file  (required) — Comparison scan
#   conf    : float 0–1   (optional, default 0.25)
#
# Returns JSON:
#   scan_a_image    : base64 JPEG string
#   scan_b_image    : base64 JPEG string
#   diff_map_image  : base64 JPEG string
#   report          : string
# ──────────────────────────────────────────────────────────────────
@app.post("/api/compare")
async def compare(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    conf:   float = 0.25,
):
    allowed = ("image/jpeg", "image/png", "image/webp", "image/bmp")
    for f in (file_a, file_b):
        if f.content_type not in allowed:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {f.content_type}",
            )

    img_a = read_upload(await file_a.read())
    img_b = read_upload(await file_b.read())

    ann_a, ann_b, diff_img, report_txt = compare_images(
        img_a, img_b, conf_threshold=conf
    )

    return JSONResponse({
        "scan_a_image":   pil_to_b64(ann_a),
        "scan_b_image":   pil_to_b64(ann_b),
        "diff_map_image": pil_to_b64(diff_img),
        "report":         report_txt,
    })


# ──────────────────────────────────────────────────────────────────
# ENDPOINT 4 — Scan Statistics
# GET /api/stats
#
# Returns JSON:
#   stats : string (formatted statistics from scan_log.csv)
# ──────────────────────────────────────────────────────────────────
@app.get("/api/stats")
def stats():
    """Returns session scan statistics read from scan_log.csv."""
    return {"stats": load_scan_stats()}


# ──────────────────────────────────────────────────────────────────
# LAUNCH
# ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,       # set True during development for auto-reload
    )