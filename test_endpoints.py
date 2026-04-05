#!/usr/bin/env python3
"""
API Testing Script for EfficientNet Pipeline
Test all endpoints after server is running.

Usage:
  python test_endpoints.py <image_path>
  python test_endpoints.py --help
"""

import argparse
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests module not found. Install with: pip install requests")
    sys.exit(1)

BASE_URL = "http://localhost:8000"

def test_health():
    """Test GET /health endpoint."""
    print("\n--- Testing GET /health ---")
    try:
        response = requests.get(f"{BASE_URL}/health")
        response.raise_for_status()
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Status: {data.get('status')}")
        print(f"✅ Models: {list(data.get('models', {}).keys())}")
        print(f"✅ Endpoints available: {list(data.get('endpoints', {}).keys())}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_predict_yolo(image_path: Path):
    """Test POST /predict (YOLO-baseline)."""
    print("\n--- Testing POST /predict (YOLO-baseline) ---")
    try:
        with open(image_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{BASE_URL}/predict", files=files)
        response.raise_for_status()
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Model: {data.get('model')}")
        print(f"✅ Detections: {data.get('total_detections')}")
        if data.get('detections'):
            print(f"   First detection: {data['detections'][0]}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_predict_efficientnet(image_path: Path):
    """Test POST /predict-efficientnet (EfficientNet pipeline)."""
    print("\n--- Testing POST /predict-efficientnet (EfficientNet pipeline) ---")
    try:
        with open(image_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{BASE_URL}/predict-efficientnet", files=files)
        response.raise_for_status()
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Model: {data.get('model')}")
        print(f"✅ Detections: {data.get('total_detections')}")
        if data.get('detections'):
            det = data['detections'][0]
            print(f"   First detection:")
            print(f"     - Label: {det.get('label')}")
            print(f"     - Super Class: {det.get('super_class')}")
            print(f"     - Confidence: {det.get('confidence')}")
            print(f"     - Classifier Prob: {det.get('cls_prob')}")
            print(f"     - Risk Score: {det.get('risk_score')}")
            print(f"     - Risk Level: {det.get('risk_level')}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_server_running():
    """Check if server is running."""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Test EfficientNet Pipeline API endpoints"
    )
    parser.add_argument(
        "image",
        nargs="?",
        type=Path,
        help="Path to test image file"
    )
    parser.add_argument(
        "--health-only",
        action="store_true",
        help="Only test health endpoint"
    )
    parser.add_argument(
        "--url",
        default=BASE_URL,
        help=f"API base URL (default: {BASE_URL})"
    )

    args = parser.parse_args()

    global BASE_URL
    BASE_URL = args.url

    print("=" * 60)
    print("EfficientNet Pipeline — API Test Script")
    print("=" * 60)

    # Check if server is running
    print(f"\nChecking if server is running at {BASE_URL}...")
    if not check_server_running():
        print(f"❌ Server not responding. Start it with:")
        print(f"   cd backend/")
        print(f"   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return 1

    print("✅ Server is responding!")

    # Test health
    if not test_health():
        print("\n⚠️  But health check failed. See errors above.")
        return 1

    if args.health_only:
        print("\n✅ Health check passed!")
        return 0

    # Test with image if provided
    if args.image:
        if not args.image.exists():
            print(f"❌ Image file not found: {args.image}")
            return 1

        print(f"\nUsing test image: {args.image}")

        # Test both endpoints
        yolo_ok = test_predict_yolo(args.image)
        efficient_ok = test_predict_efficientnet(args.image)

        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Health Check: ✅")
        print(f"YOLO-baseline: {'✅' if yolo_ok else '❌'}")
        print(f"EfficientNet Pipeline: {'✅' if efficient_ok else '❌'}")

        if yolo_ok and efficient_ok:
            print("\n✅ All tests passed!")
            return 0
        else:
            print("\n❌ Some tests failed. See errors above.")
            return 1
    else:
        print("\n✅ Server is healthy and responding.")
        print("\nTo test inference endpoints, provide a test image:")
        print("  python test_endpoints.py path/to/image.jpg")
        return 0

if __name__ == "__main__":
    sys.exit(main())
