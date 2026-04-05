"""
RED QUEEN — Image Utilities
Image preprocessing and encoding functions
"""

import base64
import io
import numpy as np
from PIL import Image
import cv2

from config import IMAGE_SIZE


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Preprocess image for YOLO detection.
    
    Args:
        image_bytes: Raw image bytes from upload
        
    Returns:
        Preprocessed numpy array (640x640 RGB with CLAHE enhancement)
    """
    # Read image from bytes using PIL
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to numpy array
    img_array = np.array(image)
    
    # If grayscale, convert to RGB
    if len(img_array.shape) == 2:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
    elif img_array.shape[2] == 4:  # RGBA
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
    
    # Apply CLAHE contrast enhancement
    # Convert to LAB color space
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    
    # Apply CLAHE to L channel only
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    
    # Convert back to RGB
    img_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    
    # Resize to 640x640
    img_array = cv2.resize(img_array, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_LINEAR)
    
    return img_array


def encode_image_base64(image: np.ndarray) -> str:
    """
    Encode numpy image array to base64 string.
    
    Args:
        image: Numpy array image (RGB format)
        
    Returns:
        Base64 encoded string with data URI prefix
    """
    # Convert RGB to BGR for OpenCV encoding
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    # Encode to JPEG
    _, buffer = cv2.imencode('.jpg', image_bgr)
    
    # Convert to base64 string
    base64_str = base64.b64encode(buffer.tobytes()).decode('utf-8')
    
    return f"data:image/jpeg;base64,{base64_str}"
