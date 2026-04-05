#full_pipeline.py
#
import cv2
import numpy as np

from inference.detect_objects import ObjectDetector
from inference.risk_mapping import compute_risk, get_decision
from preprocessing.image_preprocessing import preprocess_image

from inference.clip_matcher import CLIPMatcher
from utils.text_processing import parse_manifest

from anomaly_detection.feature_extractor import extract_feature
from anomaly_detection.anomaly_detector import AnomalyDetector


class CargoPipeline:

    def __init__(self):

        self.detector = ObjectDetector()
        self.clip_model = CLIPMatcher()

        # load normal feature database
        self.anomaly_detector = AnomalyDetector(
            "anomaly_detection/normal_features.npy"
        )


    def preprocess_and_save(self, image_path):

        processed = preprocess_image(image_path)

        temp_path = "temp_processed.jpg"
        cv2.imwrite(temp_path, processed)

        return temp_path


    def anomaly_score(self, image_path):
        """
        ResNet feature extraction + KNN anomaly detection
        """

        feature = extract_feature(image_path)

        score = self.anomaly_detector.compute_score(feature)

        normalized_score = 1 - np.exp(-score / 5)

        return 1-float(normalized_score)


    def mismatch_score(self, image_path, manifest_file):

        declared_items = parse_manifest(manifest_file)

        if len(declared_items) == 0:
            return 0.0, []

        similarity_scores = self.clip_model.compute_similarity(
            image_path,
            declared_items
        )

        if len(similarity_scores) == 0:
            return 0.0, declared_items

        best_similarity = float(max(similarity_scores))

        mismatch = 1 - best_similarity
        
        print("Declared items:", declared_items)
        print("CLIP similarity scores:", similarity_scores)

        return mismatch, declared_items


    # 🔥 HEATMAP FUNCTION ADDED
    def generate_heatmap(self, image_path, detections):

        image = cv2.imread(image_path)

        h, w = image.shape[:2]

        heatmap = np.zeros((h, w), dtype=np.float32)

        y_grid, x_grid = np.mgrid[0:h, 0:w]

        for det in detections:

            x1, y1, x2, y2 = map(int, det["bbox"])
            confidence = det["confidence"]

            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            box_w = x2 - x1
            box_h = y2 - y1

            sigma = max(box_w, box_h) / 3

            gaussian = np.exp(
                -((x_grid - cx) ** 2 + (y_grid - cy) ** 2) /
                (2 * sigma ** 2)
            )

            mask = np.zeros((h, w), dtype=np.float32)
            mask[y1:y2, x1:x2] = 1

            mask = cv2.GaussianBlur(mask, (51, 51), 0)

            gaussian = gaussian * mask * confidence

            heatmap += gaussian


        heatmap = heatmap - heatmap.min()
        heatmap = heatmap / (heatmap.max() + 1e-8)

        heatmap = np.uint8(255 * heatmap)

        heatmap = cv2.GaussianBlur(heatmap, (41, 41), 0)

        heatmap_color = cv2.applyColorMap(
            heatmap,
            cv2.COLORMAP_TURBO
        )

        overlay = cv2.addWeighted(
            image,
            0.65,
            heatmap_color,
            0.35,
            0
        )

        heatmap_path = "heatmap_full.jpg"

        cv2.imwrite(heatmap_path, overlay)

        return heatmap_path


    def run(self, image_path, manifest_file):

        processed_image = self.preprocess_and_save(image_path)

        detections, detection_score = self.detector.detect(processed_image)

        # 🔥 HEATMAP GENERATION ADDED
        heatmap_path = self.generate_heatmap(processed_image, detections)

        anomaly = self.anomaly_score(processed_image)

        mismatch, declared_items = self.mismatch_score(
            processed_image,
            manifest_file
        )

        risk = compute_risk(detection_score, anomaly, mismatch)

        decision = get_decision(risk)

        return {

            "detections": detections,

            "declared_items": declared_items,

            "scores": {
                "detection": detection_score,
                "anomaly": anomaly,
                "mismatch": mismatch,
                "risk": risk
            },

            "decision": decision,

            # 🔥 HEATMAP RETURNED
            "heatmap": heatmap_path
        }












# import cv2
# import numpy as np

# from inference.detect_objects import ObjectDetector
# from inference.risk_mapping import compute_risk, get_decision
# from preprocessing.image_preprocessing import preprocess_image

# from inference.clip_matcher import CLIPMatcher
# from utils.text_processing import parse_manifest

# from anomaly_detection.feature_extractor import extract_feature
# from anomaly_detection.anomaly_detector import AnomalyDetector


# class CargoPipeline:

#     def __init__(self):

#         self.detector = ObjectDetector()
#         self.clip_model = CLIPMatcher()

#         # load normal feature database
#         self.anomaly_detector = AnomalyDetector(
#             "anomaly_detection/normal_features.npy"
#         )


#     def preprocess_and_save(self, image_path):

#         processed = preprocess_image(image_path)

#         temp_path = "temp_processed.jpg"
#         cv2.imwrite(temp_path, processed)

#         return temp_path


#     def anomaly_score(self, image_path):
#         """
#         ResNet feature extraction + KNN anomaly detection
#         """

#         feature = extract_feature(image_path)

#         score = self.anomaly_detector.compute_score(feature)

#         normalized_score = 1 - np.exp(-score / 5)

#         return 1-float(normalized_score)


#     def mismatch_score(self, image_path, manifest_file):

#         declared_items = parse_manifest(manifest_file)

#         if len(declared_items) == 0:
#             return 0.0, []

#         similarity_scores = self.clip_model.compute_similarity(
#             image_path,
#             declared_items
#         )

#         if len(similarity_scores) == 0:
#             return 0.0, declared_items

#         best_similarity = float(max(similarity_scores))

#         mismatch = 1 - best_similarity
        
#         print("Declared items:", declared_items)
#         print("CLIP similarity scores:", similarity_scores)

#         return mismatch, declared_items


#     def run(self, image_path, manifest_file):

#         processed_image = self.preprocess_and_save(image_path)

#         detections, detection_score = self.detector.detect(processed_image)

#         anomaly = self.anomaly_score(processed_image)

#         mismatch, declared_items = self.mismatch_score(
#             processed_image,
#             manifest_file
#         )

#         risk = compute_risk(detection_score, anomaly, mismatch)

#         decision = get_decision(risk)

#         return {

#             "detections": detections,

#             "declared_items": declared_items,

#             "scores": {
#                 "detection": detection_score,
#                 "anomaly": anomaly,
#                 "mismatch": mismatch,
#                 "risk": risk
#             },

#             "decision": decision
#         }