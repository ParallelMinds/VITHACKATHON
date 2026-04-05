# image_preprocessing.py
import cv2

def preprocess_image(image_path, save_path=None):
    """
    Preprocess a single image (same as training pipeline)
    Steps:
    - Grayscale
    - CLAHE
    - Gaussian Blur
    - Convert back to 3-channel
    """

    img = cv2.imread(image_path)

    if img is None:
        raise ValueError(f"Image not found: {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Noise reduction
    denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)

    # Convert back to 3-channel
    final = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)

    # Save if path provided
    if save_path:
        cv2.imwrite(save_path, final)

    return final