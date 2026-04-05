# dataset_utils.py
import os

def count_images(folder):
    return len([f for f in os.listdir(folder) if f.endswith(('.jpg', '.png'))])