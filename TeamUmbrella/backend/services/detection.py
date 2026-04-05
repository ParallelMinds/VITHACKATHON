"""
RED QUEEN — Detection Service
YOLO-based object detection for cargo scanning
"""

import numpy as np
from typing import List, Dict, Any
import os

from config import MODEL_PATH, CONFIDENCE_THRESHOLD, WEAPON_CLASSES, WEAPON_CONFIDENCE_THRESHOLD, STANDARD_CONFIDENCE_THRESHOLD, WEAPON_CATEGORY_MAP


class DetectionService:
    """Service for running object detection on cargo images."""

    def __init__(self):
        """Initialize the detection service and load YOLO model."""
        self.model = None
        self.mock_mode = False

        # Try to load YOLO model
        print(f"[DetectionService] Loading YOLO model from backend/models/best.pt")
        if os.path.exists(MODEL_PATH):
            try:
                from ultralytics import YOLO
                self.model = YOLO(MODEL_PATH)
                print("[DetectionService] Model loaded successfully")
            except Exception as e:
                print(f"[DetectionService] Failed to load model: {e}")
                self.mock_mode = True
        else:
            print(f"[DetectionService] Model not found at {MODEL_PATH}, running in mock mode")
            self.mock_mode = True

        if self.mock_mode:
            print("[DetectionService] Running in MOCK mode - using simulated detections")
        else:
            print("[DetectionService] Running in REAL mode - using YOLO model")

    def detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run object detection on the input image.

        Args:
            image: Preprocessed numpy image array (640x640 RGB)

        Returns:
            List of detection dicts with class_name, confidence, bbox
        """
        if self.mock_mode:
            return self._mock_detect(image)
        else:
            return self._real_detect(image)

    def _mock_detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Return mock detections for testing without model."""
        return [
            {"class_name": "gun", "confidence": 0.94, "bbox": [290, 120, 350, 155]},
            {"class_name": "knife", "confidence": 0.81, "bbox": [110, 95, 175, 115]},
            {"class_name": "powerbank", "confidence": 0.72, "bbox": [350, 60, 420, 145]}
        ]

    def _real_detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Run real YOLO detection on image with weapon-aware confidence thresholds."""
        try:
            # Use lower confidence threshold for initial detection to catch potential weapons
            results = self.model(image, conf=WEAPON_CONFIDENCE_THRESHOLD)
            detections = []

            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        box = boxes[i]
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        class_name = self.model.names[class_id]

                        # Apply weapon-aware threshold filtering
                        threshold = self._get_threshold(class_name)
                        if confidence >= threshold:
                            # Normalize weapon class names
                            normalized_class = self._normalize_class(class_name)
                            
                            print(f"[RED QUEEN] Detection: {class_name} (confidence {confidence:.2f})")
                            if normalized_class != class_name:
                                print(f"[RED QUEEN] Normalized category: {normalized_class}")
                            print(f"[RED QUEEN] Weapon threshold applied: {threshold}")

                            detections.append({
                                "class_name": normalized_class,
                                "original_class": class_name,
                                "confidence": confidence,
                                "bbox": [x1, y1, x2, y2],
                                "is_weapon": normalized_class.lower() in WEAPON_CLASSES or class_name.lower() in WEAPON_CLASSES
                            })

            return detections

        except Exception as e:
            print(f"[DetectionService] Detection error: {e}")
            return []

    def _get_threshold(self, class_name: str) -> float:
        """Get appropriate confidence threshold based on class name."""
        class_lower = class_name.lower()
        if class_lower in WEAPON_CLASSES:
            return WEAPON_CONFIDENCE_THRESHOLD
        return STANDARD_CONFIDENCE_THRESHOLD

    def _normalize_class(self, class_name: str) -> str:
        """Normalize weapon class names to standard categories."""
        class_lower = class_name.lower()
        return WEAPON_CATEGORY_MAP.get(class_lower, class_name)
