import os
import argparse
from glob import glob

import cv2
import matplotlib.pyplot as plt
import numpy as np
import torch


device = "cuda" if torch.cuda.is_available() else "cpu"

SAVE_DIR = "/kaggle/working/preprocessed"
os.makedirs(SAVE_DIR, exist_ok=True)

CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID = (8, 8)
GAMMA = 1.1
EDGE_WEIGHT = 0.15

print(f"Device: {device}")


# ---------------------------
# Core Preprocessing
# ---------------------------

def ensure_gray(image: np.ndarray) -> np.ndarray:
    if image is None:
        raise ValueError("Input image is None")
    if image.ndim == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image


def apply_clahe(image: np.ndarray) -> np.ndarray:
    gray = ensure_gray(image)
    clahe = cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=CLAHE_TILE_GRID
    )
    return clahe.apply(gray)


def apply_gamma_correction(image: np.ndarray) -> np.ndarray:
    gray = ensure_gray(image)
    inv_gamma = 1.0 / max(GAMMA, 1e-6)
    table = np.array(
        [((i / 255.0) ** inv_gamma) * 255 for i in range(256)],
        dtype=np.uint8
    )
    return cv2.LUT(gray, table)


def edge_enhance(image: np.ndarray) -> np.ndarray:
    gray = ensure_gray(image)
    edges = cv2.Canny(gray, 40, 120)
    edges = cv2.GaussianBlur(edges, (3, 3), 0)
    return cv2.addWeighted(gray, 1.0, edges, EDGE_WEIGHT, 0)


def preprocess_xray(image: np.ndarray) -> np.ndarray:
    clahe_img = apply_clahe(image)
    gamma_img = apply_gamma_correction(clahe_img)
    final_img = edge_enhance(gamma_img)
    return final_img


# ---------------------------
# Utilities
# ---------------------------

def is_image_file(path: str) -> bool:
    return path.lower().endswith((
        ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"
    ))


def find_images(root_path: str):
    files = glob(os.path.join(root_path, "**/*.*"), recursive=True)
    return [f for f in files if is_image_file(f)]


# ---------------------------
# Save Helper
# ---------------------------

def preprocess_and_save(image_path: str, save_dir: str = SAVE_DIR) -> str:
    image = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    processed = preprocess_xray(image)

    out_path = os.path.join(save_dir, os.path.basename(image_path))
    cv2.imwrite(out_path, processed)

    return out_path


# ---------------------------
# Smoke Test (FIXED)
# ---------------------------

def smoke_test(root_path: str):
    """
    Now takes dataset path explicitly.
    Works for ANY Kaggle dataset.
    """

    image_candidates = find_images(root_path)

    assert len(image_candidates) > 0, f"No images found under {root_path}"

    sample_path = image_candidates[0]
    raw = cv2.imread(sample_path, cv2.IMREAD_UNCHANGED)

    if raw is None:
        raise ValueError(f"Failed to read image: {sample_path}")

    proc = preprocess_xray(raw)
    saved = preprocess_and_save(sample_path)

    plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
    plt.title("Raw")
    plt.imshow(ensure_gray(raw), cmap="gray")
    plt.axis("off")

    plt.subplot(1, 2, 2)
    plt.title("Processed")
    plt.imshow(proc, cmap="gray")
    plt.axis("off")

    plt.show()

    print("Saved processed image to:", saved)
    return saved


# ---------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Preprocessing smoke test")
    parser.add_argument("--root-path", type=str, required=True, help="Dataset root path to scan for sample images")
    args = parser.parse_args()
    smoke_test(args.root_path)