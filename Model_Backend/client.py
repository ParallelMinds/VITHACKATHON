import requests
import sys
import os

url = "https://anthropographic-similarly-darleen.ngrok-free.dev/"

# Get image path from command-line argument or prompt the user
if len(sys.argv) > 1:
    image_path = sys.argv[1]
else:
    image_path = input("Enter the path to the image file: ").strip()

if not os.path.exists(image_path):
    print(f"Error: File not found — {image_path}")
    sys.exit(1)

with open(image_path, "rb") as f:
    files = {"file": f}
    res = requests.post(url, files=files)

print(res.json())