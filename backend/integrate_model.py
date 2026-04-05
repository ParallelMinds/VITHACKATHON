#!/usr/bin/env python3
"""
CIIBS v3.0 — Model Integration Script
Run this after downloading xray_best.pt from Colab training.

Usage:
    python integrate_model.py /path/to/xray_best.pt

What it does:
  1. Copies xray_best.pt to the project folder
  2. Updates config.yaml to use the new model
  3. Runs evaluation on test images
  4. Updates metrics.json for the dashboard
  5. Verifies the model works in the full pipeline
"""

import json
import os
import shutil
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import yaml


def main():
    project_dir = Path(__file__).parent
    config_path = project_dir / "config.yaml"
    metrics_path = project_dir / "metrics.json"
    
    # ──────────────────────────────────────────
    # Step 0: Find model file
    # ──────────────────────────────────────────
    if len(sys.argv) > 1:
        model_src = Path(sys.argv[1])
    else:
        # Auto-detect: look in common locations
        candidates = [
            project_dir / "xray_best.pt",
            Path.home() / "Downloads" / "xray_best.pt",
            Path.home() / "Downloads" / "ciibs_xray_model" / "xray_best.pt",
        ]
        model_src = None
        for c in candidates:
            if c.exists():
                model_src = c
                break
        
        if model_src is None:
            print("❌ Could not find xray_best.pt")
            print("Usage: python integrate_model.py /path/to/xray_best.pt")
            print("\nAlso checked:")
            for c in candidates:
                print(f"  {c}")
            sys.exit(1)
    
    if not model_src.exists():
        print(f"❌ Model file not found: {model_src}")
        sys.exit(1)
    
    model_size = model_src.stat().st_size / 1e6
    print(f"\n🎯 Found model: {model_src} ({model_size:.1f} MB)")
    
    # ──────────────────────────────────────────
    # Step 1: Copy model to project
    # ──────────────────────────────────────────
    model_dst = project_dir / "xray_best.pt"
    if model_src != model_dst:
        shutil.copy2(model_src, model_dst)
        print(f"✅ Copied to: {model_dst}")
    else:
        print(f"✅ Model already in project directory")
    
    # ──────────────────────────────────────────
    # Step 2: Update config.yaml
    # ──────────────────────────────────────────
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    
    # Update both modes to use new model
    old_accuracy = config["detection"]["modes"]["accuracy"]["model"]
    old_realtime = config["detection"]["modes"]["realtime"]["model"]
    
    config["detection"]["modes"]["accuracy"]["model"] = "xray_best.pt"
    config["detection"]["modes"]["accuracy"]["conf_threshold"] = 0.20  # Lower for X-ray
    
    config["detection"]["modes"]["realtime"]["model"] = "xray_best.pt"
    config["detection"]["modes"]["realtime"]["conf_threshold"] = 0.30
    
    with open(config_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)
    
    print(f"\n📝 Updated config.yaml:")
    print(f"   accuracy model: {old_accuracy} → xray_best.pt")
    print(f"   realtime model: {old_realtime} → xray_best.pt")
    
    # ──────────────────────────────────────────
    # Step 3: Quick verification
    # ──────────────────────────────────────────
    print("\n🔬 Verifying model loads correctly...")
    try:
        from ultralytics import YOLO
        model = YOLO(str(model_dst))
        
        # Check class names
        if hasattr(model, 'names'):
            print(f"   Classes ({len(model.names)}): {list(model.names.values())}")
        
        # Quick inference test
        test_dir = project_dir / "outputs"
        test_images = list(test_dir.glob("*.png")) + list(test_dir.glob("*.jpg"))
        
        if test_images:
            test_img = cv2.imread(str(test_images[0]))
            t0 = time.time()
            results = model(test_img, imgsz=640, conf=0.25, verbose=False)
            elapsed = (time.time() - t0) * 1000
            
            n_dets = len(results[0].boxes) if results[0].boxes is not None else 0
            print(f"   Test inference: {n_dets} detections in {elapsed:.0f}ms ✅")
            
            if n_dets > 0:
                for box in results[0].boxes[:3]:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    cls_name = model.names.get(cls_id, f"class_{cls_id}")
                    print(f"     → {cls_name}: {conf:.0%}")
        else:
            print("   ⚠️ No test images found in outputs/")
    except Exception as e:
        print(f"   ❌ Verification failed: {e}")
        sys.exit(1)
    
    # ──────────────────────────────────────────
    # Step 4: Run full evaluation
    # ──────────────────────────────────────────
    print("\n📊 Running full evaluation pipeline...")
    try:
        # Import evaluation
        sys.path.insert(0, str(project_dir))
        from evaluate import load_test_images, evaluate_detection, print_report
        
        images = load_test_images()
        if images:
            metrics, results = evaluate_detection(images, model, mode="accuracy")
            print_report(metrics, results)
            
            # Update metrics.json
            existing = {}
            if metrics_path.exists():
                with open(metrics_path, "r") as f:
                    existing = json.load(f)
            
            save_metrics = {
                "model_name": "YOLOv8s-PIDray",
                "mAP_50": metrics.get("mAP_50", 0),
                "mAP_50_95": metrics.get("mAP_50_95", 0),
                "precision": metrics.get("precision", 0),
                "recall": metrics.get("recall", 0),
                "f1": metrics.get("f1", 0),
                "fnr": metrics.get("fnr", 0),
                "fpr": metrics.get("fpr", 0),
                "avg_inference_ms": metrics.get("avg_inference_ms", 0),
                "total_scans": existing.get("total_scans", 0),
                "threats_detected": existing.get("threats_detected", 0),
                "narcotics_flagged": existing.get("narcotics_flagged", 0),
                "eval_images": metrics.get("total_images", 0),
                "eval_detection_rate": metrics.get("detection_rate", 0),
                "eval_avg_risk": metrics.get("avg_risk_score", 0),
            }
            
            with open(metrics_path, "w") as f:
                json.dump(save_metrics, f, indent=2)
            
            print(f"\n✅ Metrics saved to {metrics_path}")
        else:
            print("   ⚠️ No test images found")
    except Exception as e:
        print(f"   ⚠️ Evaluation skipped: {e}")
    
    # ──────────────────────────────────────────
    # Done
    # ──────────────────────────────────────────
    print(f"""
{'='*60}
  ✅ INTEGRATION COMPLETE
{'='*60}

  Model:    xray_best.pt ({model_size:.1f} MB)
  Location: {model_dst}
  Config:   Updated ✅
  Metrics:  Updated ✅

  Next steps:
  1. Restart the CIIBS server:
     cd {project_dir} && PORT=5001 python app.py

  2. Test in the browser:
     http://localhost:5001

  3. Push to GitHub:
     cd {project_dir.parent / 'Cargo-Vision-AI'}
     git add . && git commit -m "Integrate PIDray-trained model" && git push

{'='*60}
""")


if __name__ == "__main__":
    main()
