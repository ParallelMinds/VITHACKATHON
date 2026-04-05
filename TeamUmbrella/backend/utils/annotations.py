"""
RED QUEEN — Annotation Utilities
Drawing detection annotations on images
"""

import cv2
import numpy as np
from typing import List, Dict, Any


# Risk tier colors (RGB format for OpenCV)
TIER_COLORS = {
    "PROHIBITED": (239, 68, 68),    # Red
    "RESTRICTED": (245, 158, 11),   # Amber
    "SUSPICIOUS": (234, 179, 8),    # Yellow
    "NORMAL": (52, 211, 153),       # Green
    "UNKNOWN": (156, 163, 175)      # Gray for unknown items
}


def draw_annotations(image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
    """
    Draw bounding boxes and labels on image for each detection.
    
    Args:
        image: Original RGB numpy image array
        detections: List of detection dicts with class_name, confidence, bbox, risk_tier
        
    Returns:
        Annotated image as numpy array
    """
    # Create a copy to avoid modifying original
    annotated = image.copy()
    
    for detection in detections:
        class_name = detection.get("class_name", "unknown")
        confidence = detection.get("confidence", 0.0)
        bbox = detection.get("bbox", [0, 0, 0, 0])
        risk_tier = detection.get("risk_tier", "UNKNOWN")
        
        # Parse bounding box
        x1, y1, x2, y2 = map(int, bbox)
        
        # Get color based on risk tier
        color = TIER_COLORS.get(risk_tier, TIER_COLORS["UNKNOWN"])
        
        # Draw bounding box rectangle
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # Create label text
        label = f"{class_name} {confidence * 100:.0f}%"
        
        # Calculate label size for background rectangle
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1
        
        (label_width, label_height), baseline = cv2.getTextSize(
            label, font, font_scale, font_thickness
        )
        
        # Draw label background rectangle
        cv2.rectangle(
            annotated,
            (x1, y1 - label_height - 5),
            (x1 + label_width, y1),
            color,
            -1  # Filled rectangle
        )
        
        # Draw label text (white text on colored background)
        cv2.putText(
            annotated,
            label,
            (x1, y1 - 5),
            font,
            font_scale,
            (255, 255, 255),
            font_thickness
        )
    
    return annotated
