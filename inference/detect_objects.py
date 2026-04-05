# detect_objects.py
from ultralytics import YOLO
import cv2

class ObjectDetector:
    def __init__(self, model_path="models/best.pt"):
        self.model = YOLO(model_path)

    def detect(self, image_path):
        results = self.model(image_path)[0]
        detections = []

        for box in results.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            detections.append({
                "class": results.names[cls],
                "confidence": conf,
                "bbox": box.xyxy[0].tolist()
            })

        detection_score = max([d["confidence"] for d in detections], default=0)

        return detections, detection_score