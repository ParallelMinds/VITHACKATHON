import React, { useState, useRef } from 'react';
import RiskPanel from './RiskPanel';
import { uploadCargoImage } from '../services/api';

function UploadZone({ onUpload, isUploading, error }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-accent-primary bg-[#1a1f3a]'
            : 'border-[#2a3050] bg-[#0f1219] hover:border-accent-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <div className="flex flex-col items-center gap-4">
          <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-lg text-gray-300 mb-1">
              {dragActive ? 'Drop image here' : 'Drop X-ray image or click to upload'}
            </p>
            <p className="text-sm text-gray-500">
              Supports: PNG, JPG, TIFF — Max 50MB
            </p>
          </div>
          {error && (
            <div className="mt-4 px-4 py-2 bg-red-900/30 border border-red-800 rounded text-sm text-red-400">
              {error}
            </div>
          )}
          <button
            disabled={isUploading}
            className="mt-4 px-6 py-2 bg-accent-primary text-white rounded text-sm font-medium hover:bg-[#2d6bd4] transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Select Image'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanResult({ result, imagePreview, isUploading }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  const getBoxColor = (riskTier) => {
    switch (riskTier) {
      case 'PROHIBITED':
      case 'HIGH':
        return '#ef4444';
      case 'RESTRICTED':
      case 'MEDIUM':
        return '#f59e0b';
      case 'NORMAL':
      case 'LOW':
        return '#34d399';
      default:
        return '#6b7280';
    }
  };

  // Display annotated image from backend if available
  const displayImage = result?.annotated_image
    ? `data:image/png;base64,${result.annotated_image}`
    : imagePreview;

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* Scan Area */}
      <div className="flex-1 relative bg-[#0f1219] rounded-lg border border-border-primary overflow-hidden min-h-0">
        {displayImage ? (
          <div className="relative w-full h-full">
            <img
              src={displayImage}
              alt="X-ray scan"
              className="w-full h-full object-contain"
            />

            {/* Bounding Boxes - only show if no annotated image from backend */}
            {!result?.annotated_image && result?.detections?.map((detection, idx) => {
              const [x1, y1, x2, y2] = detection.bbox || [0, 0, 0, 0];
              const width = x2 - x1;
              const height = y2 - y1;
              const color = getBoxColor(detection.risk_tier || detection.risk_level);

              return (
                <div
                  key={idx}
                  className="absolute border-2 pointer-events-none"
                  style={{
                    left: `${(x1 / 800) * 100}%`,
                    top: `${(y1 / 600) * 100}%`,
                    width: `${(width / 800) * 100}%`,
                    height: `${(height / 600) * 100}%`,
                    borderColor: color,
                  }}
                >
                  <div
                    className="absolute -top-5 left-0 px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                    style={{
                      backgroundColor: color,
                      color: '#000',
                    }}
                  >
                    {detection.class} {(detection.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}

            {/* Heatmap Overlay */}
            {showHeatmap && result?.detections && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-tr from-red-900/30 via-amber-900/20 to-transparent"></div>
                {result.detections
                  .filter(d => (d.risk_tier || d.risk_level) === 'PROHIBITED' || (d.risk_tier || d.risk_level) === 'HIGH')
                  .map((detection, idx) => {
                    const [x1, y1, x2, y2] = detection.bbox || [0, 0, 0, 0];
                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;
                    return (
                      <div
                        key={`heatmap-${idx}`}
                        className="absolute rounded-full bg-red-500/40 blur-xl"
                        style={{
                          left: `${(cx / 800) * 100}%`,
                          top: `${(cy / 600) * 100}%`,
                          width: '15%',
                          height: '15%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    );
                  })}
              </div>
            )}

            {/* Heatmap Toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`absolute bottom-4 right-4 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                showHeatmap
                  ? 'bg-red-900/50 border-red-700 text-red-300'
                  : 'bg-bg-card/80 border-border-primary text-gray-400 hover:text-gray-200'
              }`}
            >
              {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
            </button>

            {/* Case ID Badge */}
            {result?.case_id && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-bg-card/80 border border-border-primary rounded text-xs text-gray-400 font-mono">
                {result.case_id}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-500">Loading scan...</div>
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-400 text-sm">Analyzing cargo scan...</div>
            </div>
          </div>
        )}
      </div>

      {/* Manifest Mismatch Alert */}
      {result?.manifest_mismatch?.detected && (
        <div className="bg-[#1f0a0a] border border-red-900 rounded-lg p-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-alert-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-red-400">Manifest Mismatch Detected</div>
            <div className="text-xs text-gray-500 mt-1">
              Declared: {result.manifest_mismatch.declared_categories?.join(', ') || 'N/A'} |
              Detected: {result.manifest_mismatch.detected_categories?.join(', ') || 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function XRayMode({ inspectionResult, setInspectionResult, onAddToHistory }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    if (!file) {
      setError('No file selected');
      return;
    }

    setIsUploading(true);
    setError(null);

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Send to backend API
    try {
      const result = await uploadCargoImage(file);
      setInspectionResult(result);
      
      // Add to inspection history
      if (onAddToHistory) {
        onAddToHistory({
          case_id: result.case_id,
          timestamp: result.timestamp,
          risk_level: result.risk_level,
          objects: result.detections?.map(d => d.class) || [],
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Failed to process image. Please try again.');
      setInspectionResult(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setInspectionResult(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {!inspectionResult && !imagePreview ? (
        <UploadZone onUpload={handleUpload} isUploading={isUploading} error={error} />
      ) : (
        <ScanResult
          result={inspectionResult}
          imagePreview={imagePreview}
          isUploading={isUploading}
        />
      )}
      <RiskPanel
        result={inspectionResult}
        onReset={handleReset}
      />
    </div>
  );
}
