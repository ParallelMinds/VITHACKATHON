import cv2
import numpy as np

def generate_heatmap(image, cam):

    # Normalize activation map
    cam = cam - np.min(cam)
    cam = cam / np.max(cam)

    cam = np.uint8(255 * cam)

    # Apply smooth color map (weather style)
    heatmap = cv2.applyColorMap(cam, cv2.COLORMAP_TURBO)

    # Resize to match image
    heatmap = cv2.resize(heatmap, (image.shape[1], image.shape[0]))

    # Overlay heatmap on image
    overlay = cv2.addWeighted(image, 0.6, heatmap, 0.4, 0)

    return overlay