# preprocess_dataset.py
import os
import cv2
from preprocessing.image_preprocessing import preprocess_image


def preprocess_folder(input_folder, output_folder):
    os.makedirs(output_folder, exist_ok=True)

    for file in os.listdir(input_folder):
        input_path = os.path.join(input_folder, file)
        output_path = os.path.join(output_folder, file)

        try:
            processed = preprocess_image(input_path)
            cv2.imwrite(output_path, processed)
        except:
            print(f"Skipping file: {file}")


if __name__ == "__main__":

    dataset_paths = [
        ("dataset/train/images", "processed_dataset/train/images"),
        ("dataset/test/images", "processed_dataset/test/images"),
        ("dataset/valid/images", "processed_dataset/valid/images"),
    ]

    for inp, out in dataset_paths:
        preprocess_folder(inp, out)

    print("✅ Preprocessing complete")