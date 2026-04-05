# AI Cargo Detection System

An advanced AI-powered cargo inspection platform designed for customs and security operations. This system analyzes X-ray imagery of cargo containers, detects threats, and validates contents against shipping manifests using both YOLO and EfficientNet deep learning models.

## Overview

**Deep CargoVision** is a comprehensive security inspection platform built with modern web technologies and enterprise-grade ML inference. It provides:

- **Multi-model inference** - YOLO object detection and EfficientNet classification
- **Risk assessment** - Intelligent threat scoring and anomaly detection
- **Manifest validation** - Cross-reference detected items against cargo manifests
- **Batch processing** - Analyze multiple cargo shipments efficiently
- **Intuitive dashboard** - Security-focused UI optimized for operators
- **Real-time alerts** - Immediate threat notifications and visual indicators
- **Liquid detection** - Identify liquid containers and suspicious beverages

## Features

### Core Capabilities

- 📦 Single image and batch X-ray analysis
- 🔍 Object detection with bounding box visualization
- ⚠️ Threat detection and risk scoring
- 📋 Cargo manifest CSV validation
- 📊 Batch analytics and trend reporting
- 🎯 Multi-model inference support (YOLO + EfficientNet + Wildlife + Liquid Detection)
- 🦎 Wildlife smuggling detection (Reptiles, Birds, Mammals, Organic Mass)
- 💧 Liquid container detection (Cans, Bottles, Sprays, etc.)
- 🔒 Security-focused dark mode dashboard
- 📱 Non-technical operator interface

## Tech Stack

### Frontend
- **React 19** - Modern component architecture
- **Vite** - Lightning-fast build tooling
- **Tailwind CSS v4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router** - Client-side navigation
- **Recharts** - Data visualization

### Backend
- **FastAPI** - High-performance Python framework
- **Ultralytics YOLO** - State-of-the-art object detection
- **PyTorch** - Deep learning inference
- **Python 3.10+** - Core runtime

### Machine Learning
- YOLO v8 for object detection
- EfficientNet for image classification
- Wildlife Smuggling Detector for fauna security
- Liquid Detection model for beverage/container identification
- PyTorch models for inference pipeline

## Project Structure

```
ai-cargo-detection/
├── src/                          # React frontend application
│   ├── components/               # React components
│   │   ├── UploadSection.jsx     # Image/CSV upload UI
│   │   ├── ImageViewer.jsx       # X-ray visualization
│   │   ├── RiskPanel.jsx         # Threat assessment
│   │   ├── BatchAnalytics.jsx    # Batch statistics
│   │   └── ...
│   ├── pages/                    # Application pages
│   │   ├── HomePage.jsx
│   │   └── DashboardPage.jsx
│   ├── services/                 # API communication
│   ├── config/                   # Model configuration
│   └── main.jsx                  # Entry point
├── backend/                      # FastAPI service
│   ├── main.py                   # API endpoints
│   ├── inference_pipeline.py     # Model inference
│   ├── classifier_model.py       # EfficientNet classifier
│   ├── risk_scoring.py           # Threat scoring logic
│   ├── xray_filters.py           # Image preprocessing
│   └── requirements.txt
├── model/                        # Model assets
│   ├── yolo-baseline/            # YOLO baseline detection
│   │   └── best.pt
│   ├── efficent-net/             # EfficientNet classification
│   │   ├── classifier_best.pth
│   │   └── yolo_best.pt
│   ├── wildlife-smuggling/       # Wildlife detection model
│   │   └── best.pt
│   └── liquid-detection/         # Liquid container detection
│       └── best.pt
├── public/                       # Static assets
│   └── cargo_manifest_sample.csv # Sample manifest
├── training-notebooks/           # Model training notebooks
│   ├── efficient-net-v2.ipynb    # EfficientNet v2 model training
│   ├── wildlife-smuggling-v3.ipynb # Wildlife smuggling detection training
│   ├── yolo-baseline-v1.ipynb    # YOLO baseline implementation
│   └── xray_data.yaml            # X-ray dataset configuration
└── README.md                     # This file
```

## Training Notebooks

The `training-notebooks/` directory contains Jupyter notebooks for model development and training:

### 1. **YOLO Baseline** (`yolo-baseline-v1.ipynb`)

**Architecture**: Two-stage cascade pipeline
- **Stage 1**: YOLOv8n object detection → generates initial bounding boxes and threat localizations
- **Stage 2**: ResNet18 classifier → provides classification refinement and confidence validation

**Preprocessing Pipeline**:
- CLAHE (Contrast Limited Adaptive Histogram Equalization) - enhances local contrast in X-ray images
- Gamma correction - normalizes brightness across varying X-ray intensities
- Edge enhancement - highlights object boundaries for improved detection

**Training Details**:
- Dataset: Balanced X-ray contraband dataset (13,728 images, 12 threat classes)
- Transfer learning on specialized X-ray domain
- Learning schedule: Cosine schedule with warmup
- Augmentation: X-ray-aware (brightness variation, mosaic, mixup)
- Label smoothing (0.1) for improved recall
- Early stopping (patience=10)

**Final Risk Scoring**:
- Weighted ensemble: YOLO confidence (60%) + ResNet verification (40%)
- Enables confidence calibration and reduced false positives

**Metrics**:
- ResNet18 Classification Accuracy: ~92%
- Overall Pipeline Accuracy: 86.4%
- YOLO mAP@50: ~78.5%
- Recall: ~70.6%

- Output: `best.pt` model weights for production inference

### 2. **EfficientNet v2** (`efficient-net-v2.ipynb`)

**Architecture**: Two-stage cascade with classification refinement
- **Stage 1**: YOLOv8 object detection → localizes threat objects
- **Stage 2**: ResNet18 classifier → provides material analysis and classification refinement

**Preprocessing Pipeline**:
- CLAHE histogram equalization - enhances local contrast
- Gamma correction - normalizes brightness variations
- Edge enhancement - highlights object boundaries

**Training Details**:
- Dataset: X-ray contraband crops (12 threat object categories)
- Transfer learning on specialized X-ray domain
- Augmentation: Advanced transforms (geometric, color jitter, rotation)
- Multi-label classification support
- Focus on deep forensic scanning capabilities

**Final Risk Scoring**:
- Weighted ensemble: YOLO confidence (60%) + ResNet verification (40%)
- Optimized for precision and threat identification

**Metrics**:
- ResNet18 Classification Accuracy: ~92%
- Overall Pipeline Accuracy: 86.4%
- Enhanced detection with confidence calibration

- Output: Classifier model for `predict-efficientnet` endpoint

### 3. **Wildlife Smuggling Detection** (`wildlife-smuggling-v3.ipynb`)

**Architecture**: Single-stage detection model
- YOLOv8m fauna detection model optimized for small dataset generalization
- Detects 4 categories: Reptiles, Birds, Mammals, Organic Mass

**Training Details**:
- Dataset: 1,616 augmented training images with 100x augmentation per base image
- Transfer learning with ImageNet backbone for improved generalization
- Focus on small dataset optimization techniques
- Train/Val split (80/20)

**Data Augmentation Strategy**:
- Heavy augmentation pipeline (flips, rotation, CLAHE, noise, etc.) to maximize small dataset utility
- HSV color analysis for automatic bounding box detection
- Augmentation-driven approach for fauna-specific variations

**Preprocessing**:
- CLAHE (Contrast Limited Adaptive Histogram Equalization) for contrast enhancement
- Noise injection to improve robustness
- Rotation and geometric transforms for pose variation

**Metrics**:
- Precision: 99%
- Recall: 92%
- mAP: 96%
- mAP@50-95: 99.5%
- Optimized for minimal false positives in wildlife detection

- Output: `best.pt` model for `predict-wildlife` endpoint

### 4. **Liquid Detection** (`liquid-detection/best.pt`)

**Architecture**: YOLO-based detection for liquid containers
- Detects 7 categories: Cans, Carton Drinks, Glass Bottles, Plastic Bottles, Spray Cans, Tins, Vacuum Cups

**Purpose**:
- Identifies suspicious liquid containers in cargo
- Flags prohibited beverages and hazardous liquids
- Supports customs regulations for liquid transport restrictions

**Metrics**:
- Optimized for container shape and material detection
- High recall for safety-critical liquid identification

- Output: `best.pt` model for `predict-liquid` endpoint

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Git

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

The frontend runs on `http://localhost:5173`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend runs on `http://localhost:8000`

## Configuration

### Frontend Configuration

Model configuration is located in `src/config/modelConfig.js` - adjust model inference parameters as needed.

### Backend Model Files

The backend requires the following model files:

- **YOLO Baseline Model**: `model/yolo-baseline/best.pt` - Required
- **EfficientNet Pipeline**:
  - `model/efficent-net/classifier_best.pth`
  - `model/efficent-net/yolo_best.pt`
- **Wildlife Smuggling Model**: `model/wildlife-smuggling/best.pt` 
- **Liquid Detection Model**: `model/liquid-detection/best.pt`

YOLO baseline is required. EfficientNet, Wildlife, and Liquid Detection models are optional but enhance detection capabilities.

## API Endpoints

### YOLO Baseline Detection

**POST** `/predict`
- Single image threat detection with YOLO baseline
- Optionally validates against cargo manifest CSV
- Returns: Detections, bounding boxes, threat scores

**POST** `/predict-batch`
- Batch threat detection for multiple images
- Returns: Per-image and aggregate statistics

### EfficientNet Two-Stage Pipeline

**POST** `/predict-efficientnet`
- Single image deep forensic scan with EfficientNet classification
- Returns: Enhanced detection with material analysis

**POST** `/predict-batch-efficientnet`
- Batch deep forensic analysis
- Returns: Classification results and confidence metrics

### Wildlife Smuggling Detection

**POST** `/predict-wildlife`
- Single image wildlife detection (Reptile, Bird, Mammal, Organic Mass)
- Returns: Wildlife detections with bounding boxes

**POST** `/predict-batch-wildlife`
- Batch wildlife detection across multiple images
- Returns: Per-image wildlife threats and aggregate statistics

### Liquid Detection

**POST** `/predict-liquid`
- Single image liquid container detection (Cans, Bottles, Sprays, etc.)
- Returns: Container detections with bounding boxes

**POST** `/predict-batch-liquid`
- Batch liquid detection across multiple images
- Returns: Per-image liquid threats and aggregate statistics

### Health & Status

**GET** `/health`
- System health check
- Returns: Model availability, configuration, endpoints

## Data Flow

### YOLO Baseline Detection
```
1. User uploads X-ray image(s) and optional manifest CSV
2. Frontend sends data to FastAPI backend
3. YOLO baseline model detects threats and generates bounding boxes
4. Risk scoring assigns threat levels
5. (Optional) Manifest validation checks for discrepancies
6. Results displayed with visual annotations
```

### EfficientNet Enhanced Detection
```
1. User uploads X-ray image(s)
2. YOLO specializes detection against EfficientNet classifier
3. Two-stage pipeline: YOLO → ResNet18 → Risk Scoring
4. Enhanced threat assessment with material analysis
5. Results include confidence metrics and classifications
```

### Wildlife Smuggling Detection
```
1. User uploads X-ray image(s)
2. Wildlife detection model analyzes for fauna (Reptile, Bird, Mammal, Organic Mass)
3. Generates bounding boxes with species/category detections
4. Threat levels assigned based on detection confidence
5. Results visualized on dashboard with annotations
```

### Liquid Detection
```
1. User uploads X-ray image(s)
2. Liquid detection model analyzes for containers (Cans, Bottles, Sprays, etc.)
3. Generates bounding boxes with container type detections
4. Threat levels assigned based on container type and quantity
5. Results visualized on dashboard with annotations
```

## Using the Application

### Selecting a Scan Model

1. Navigate to the Home page
2. Choose scan depth from the **Scan Depth** dropdown:
   - **Standard Fast Scan** - YOLO baseline threat detection
   - **Deep Forensic Scan** - EfficientNet two-stage analysis
   - **Wildlife Smuggling Scan** - Fauna detection (Reptiles, Birds, Mammals)
   - **Liquid Detection Scan** - Container and liquid identification
3. Select scan type: **Single Inference** or **Batch Inference**

### Single Image Analysis

1. Select **Single Inference** mode
2. Upload an X-ray image
3. (For YOLO only) Optionally upload cargo manifest CSV
4. Review results on Dashboard with visual detections

### Batch Analysis

1. Select **Batch Inference** mode
2. Upload multiple X-ray images (up to 50)
3. View:
   - Per-image threat assessment
   - Aggregate statistics and trends
   - Class frequency distribution
   - Confidence metrics

### Sample Files

- **Manifest Template**: `public/cargo_manifest_sample.csv`
- Use this to understand the expected CSV format for YOLO manifest validation

## Configuration Files

### Frontend
- `vite.config.js` - Vite build configuration
- `eslint.config.js` - Code linting rules
- `package.json` - Dependencies and scripts

### Backend
- `backend/requirements.txt` - Python dependencies

## Environment

### Frontend
- Port: `5173` (development)
- Mode: Dark theme optimized for security operations

### Backend
- Port: `8000`
- Environment: Development (use `--reload`) or Production

## Troubleshooting

### Backend Won't Start

**Error**: "Model file not found"
- Ensure `model/yolo-baseline/best.pt` exists
- Verify `model/efficent-net/classifier_best.pth` exists
- Check file permissions

**Error**: Port 8000 already in use
```bash
# Use different port
uvicorn main:app --port 8001
```

### Frontend Won't Start

**Error**: Module not found
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
```

**Error**: Port 5173 in use
```bash
# Vite will automatically use next available port
npm run dev
```

### Model Loading Issues

- Verify PyTorch and Ultralytics installations: `pip list | grep torch`
- Ensure model files are not corrupted
- Check Python version compatibility (3.10+)

### CORS Issues

If frontend can't reach backend:
- Verify backend is running on `http://localhost:8000`
- Check network connectivity between frontend and backend
- Review backend CORS configuration in `main.py`

## Performance Considerations

- **Image Preprocessing**: Applied in `xray_filters.py`
- **Model Inference**: Optimized for CPU and GPU environments
- **Batch Processing**: Processes multiple images sequentially
- **Result Caching**: Implemented at API level

## Security Notes

- The system is designed for authorized customs and security personnel only
- All uploads are processed locally
- No data is stored between sessions by default
- Use HTTPS in production deployments

## Deployment

For production deployment information, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

For implementation status, see [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

For rapid onboarding, see [QUICKSTART.md](QUICKSTART.md)

## Contributing

When contributing to this project:
1. Follow the existing code structure
2. Maintain component-based architecture
3. Test model changes with sample data
4. Update documentation for new features

## License

No license has been specified for this project.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review component documentation in source files
3. Verify all dependencies are correctly installed
4. Check status in [STATUS.txt](STATUS.txt)
