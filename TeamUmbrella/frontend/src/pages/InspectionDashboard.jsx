import React, { useState, useRef } from 'react';
import { inspectCargo, analyzeWithAI } from '../services/inspection';

// Helper to convert any error to a string message - ALWAYS returns a string
const getErrorMessage = (err) => {
  // Handle null/undefined
  if (!err) return '';
  
  // Handle strings directly
  if (typeof err === 'string') return err;
  
  // Handle Error objects
  if (err instanceof Error) {
    // Check if message is "[object Object]" which means the Error was created with an object
    if (err.message === '[object Object]') {
      // Try to extract from the error object itself
      if (err.detail) return String(err.detail);
      if (err.data?.detail) return String(err.data.detail);
      return 'An error occurred';
    }
    return err.message;
  }
  
  // Handle objects - extract message from common error shapes
  if (typeof err === 'object') {
    // Check for common error message properties in priority order
    const props = ['message', 'detail', 'msg', 'error', 'errorMessage', 'reason'];
    for (const prop of props) {
      if (err[prop] !== undefined && err[prop] !== null) {
        const val = err[prop];
        if (typeof val === 'string') {
          // Handle "[object Object]" string
          if (val === '[object Object]') continue;
          return val;
        }
        if (typeof val === 'object' && val.message) {
          if (val.message !== '[object Object]') return val.message;
        }
        return String(val);
      }
    }
    // Check nested data.detail (common in FastAPI errors)
    if (err.data?.detail) {
      return typeof err.data.detail === 'string' 
        ? err.data.detail 
        : JSON.stringify(err.data.detail);
    }
    // Last resort: stringify safely
    try {
      const str = JSON.stringify(err);
      return str === '{}' ? 'An error occurred' : str;
    } catch {
      return 'An error occurred';
    }
  }
  
  // Fallback for any other type
  return String(err);
};

// Upload Panel Component
function UploadPanel({ onUpload, isUploading, manifest, setManifest, error, onClearError }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
        setSelectedFile(file);
        // Clear any existing errors when a new file is selected
        if (onClearError) onClearError();
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Clear any existing errors when a new file is selected
      if (onClearError) onClearError();
    }
  };

  const handleStartInspection = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  // Convert error to string for display
  const errorMessage = getErrorMessage(error);

  return (
    <div className="w-80 bg-bg-panel border-r border-border-primary flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Cargo Upload</h2>
        <p className="text-xs text-text-muted mt-1">Upload X-ray scan for analysis</p>
      </div>

      {/* Upload Zone */}
      <div className="p-4 flex-1">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragActive
              ? 'border-accent-primary bg-accent-primary/10'
              : 'border-border-secondary bg-bg-card hover:border-accent-primary/50'
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

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-white font-medium">{selectedFile.name}</span>
              <span className="text-[10px] text-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-xs text-text-secondary">Drop cargo scan here</p>
                <p className="text-[10px] text-text-muted mt-1">or click to browse</p>
              </div>
            </div>
          )}
        </div>

        {/* Manifest Input */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
            Cargo Manifest
          </label>
          <textarea
            value={manifest}
            onChange={(e) => setManifest(String(e.target.value || ''))}
            placeholder="Enter declared cargo items..."
            className="w-full h-32 px-3 py-2 bg-bg-card border border-border-primary rounded text-xs text-white placeholder-text-muted focus:outline-none focus:border-accent-primary resize-none font-mono"
            disabled={isUploading}
          />
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="mt-3 p-2 bg-risk-danger/20 border border-alert-red/30 rounded">
            <p className="text-xs text-alert-red">{errorMessage}</p>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartInspection}
          disabled={!selectedFile || isUploading}
          className="w-full mt-4 py-3 bg-accent-primary hover:bg-accent-dark text-white text-sm font-medium rounded border border-accent-dark/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Start Inspection</span>
            </>
          )}
        </button>

        {/* Supported Formats */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-text-muted">Supported: PNG, JPG, TIFF — Max 50MB</p>
        </div>
      </div>
    </div>
  );
}

// Cargo Viewer Component
function CargoViewer({ image, detections, isAnalyzing, analysisStep }) {
  const getBoxColor = (riskTier) => {
    const tier = (riskTier || 'NORMAL').toUpperCase();
    switch (tier) {
      case 'PROHIBITED':
      case 'HIGH':
        return '#EF4444';
      case 'RESTRICTED':
      case 'MEDIUM':
        return '#F59E0B';
      case 'NORMAL':
      case 'LOW':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="flex-1 bg-bg-secondary flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-bg-panel/90 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Cargo Scan Viewer</h2>
            <p className="text-xs text-text-muted mt-0.5">AI-powered detection overlay</p>
          </div>
          {detections && detections.length > 0 && (
            <div className="px-3 py-1.5 bg-bg-card/80 border border-border-primary rounded">
              <span className="text-xs text-text-secondary font-mono">{detections.length} objects detected</span>
            </div>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        {image ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={image}
              alt="Cargo scan"
              className="max-w-full max-h-[70vh] object-contain rounded border border-border-primary"
            />

            {/* Bounding Boxes - Backend returns coords for 640x640 image */}
            {detections && detections.map((detection, idx) => {
              const bbox = detection.bbox || [0, 0, 0, 0];
              const [x1, y1, x2, y2] = bbox;
              const width = x2 - x1;
              const height = y2 - y1;
              const color = getBoxColor(detection.risk_tier || detection.risk_level);
              
              // Get object class name (handle both field names)
              const className = detection.class_name || detection.class || 'Unknown';
              const confidence = typeof detection.confidence === 'number' ? detection.confidence : 0;

              // Backend returns bbox for 640x640, convert to percentage of displayed image
              // Since both backend and display maintain aspect ratio, we can directly use percentages
              const leftPercent = (x1 / 640) * 100;
              const topPercent = (y1 / 640) * 100;
              const widthPercent = (width / 640) * 100;
              const heightPercent = (height / 640) * 100;

              return (
                <div
                  key={idx}
                  className="absolute border-2 bbox-enter"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    borderColor: color,
                  }}
                >
                  <div
                    className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded"
                    style={{
                      backgroundColor: color,
                      color: '#000000',
                    }}
                  >
                    {className} {(confidence * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}

            {/* Scanning Animation */}
            {isAnalyzing && (
              <>
                <div className="scanner-line"></div>
                <div className="absolute inset-0 bg-accent-primary/5 pointer-events-none"></div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-text-muted">Upload a cargo scan to begin analysis</p>
          </div>
        )}
      </div>

      {/* Analysis Status Bar */}
      {isAnalyzing && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg-panel/90 border-t border-border-primary">
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="flex-1">
              <div className="text-sm text-white">{analysisStep}</div>
              <div className="w-full h-1 bg-bg-card rounded mt-2 overflow-hidden">
                <div className="h-full bg-accent-primary animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AI Intelligence Panel Component
function IntelligencePanel({ result, isAnalyzing, onReset, error }) {
  // Helper to get AI analysis text from result
  const getAIAnalysisText = (result) => {
    if (!result) return '';

    // Check for inspection_report first (primary field from backend)
    if (result.inspection_report && typeof result.inspection_report === 'string') {
      return result.inspection_report;
    }

    // Check for judge analysis (highest priority fallback)
    if (result.judge_analysis) {
      if (typeof result.judge_analysis === 'string') return result.judge_analysis;
      if (result.judge_analysis.analysis) return result.judge_analysis.analysis;
      if (result.judge_analysis.text) return result.judge_analysis.text;
      if (result.judge_analysis.reasoning) return result.judge_analysis.reasoning;
      if (typeof result.judge_analysis === 'object') {
        return JSON.stringify(result.judge_analysis, null, 2);
      }
    }

    // Check if ai_analysis is a string (backward compatibility)
    if (typeof result.ai_analysis === 'string') return result.ai_analysis;
    // Check if it's an object with analysis field (from /api/ai/analyze)
    if (result.ai_analysis?.analysis) return result.ai_analysis.analysis;
    // Check if result has analysis field directly
    if (result.analysis) return result.analysis;
    // Fallback: stringify if it's an object
    if (typeof result.ai_analysis === 'object') {
      return JSON.stringify(result.ai_analysis, null, 2);
    }
    return 'No AI analysis available';
  };

  // Convert error to string for display
  const errorMessage = getErrorMessage(error);

  if (!result && !isAnalyzing && !error) {
    return (
      <div className="w-96 bg-bg-panel border-l border-border-primary flex flex-col h-full">
        <div className="p-4 border-b border-border-primary">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Intelligence</h2>
          <p className="text-xs text-text-muted mt-1">Analysis results will appear here</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <svg className="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-xs text-text-muted">Complete inspection to view AI analysis</p>
          </div>
        </div>
      </div>
    );
  }

  const getRiskBadgeClass = (level) => {
    const normalizedLevel = level?.toUpperCase();
    switch (normalizedLevel) {
      case 'RED':
      case 'HIGH':
        return 'risk-high text-alert-red';
      case 'AMBER':
      case 'MEDIUM':
        return 'risk-medium text-alert-amber';
      case 'GREEN':
      case 'LOW':
        return 'risk-low text-alert-green';
      default:
        return 'border border-border-primary text-text-muted';
    }
  };

  return (
    <div className="w-96 bg-bg-panel border-l border-border-primary flex flex-col h-full slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Intelligence</h2>
          {isAnalyzing && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse"></div>
              <span className="text-xs text-accent-primary">Analyzing</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {errorMessage ? (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="w-12 h-12 text-alert-red mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-alert-red text-center">{errorMessage}</p>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-text-secondary">Running AI analysis...</p>
          </div>
        ) : result ? (
          <>
            {/* Risk Level */}
            <div className="bg-bg-card border border-border-primary rounded-lg p-4">
              <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Overall Risk Assessment</div>
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-wider ${getRiskBadgeClass(result.risk_level)}`}>
                  {result.risk_level || 'LOW'}
                </span>
                <span className="text-3xl font-bold text-white">{result.risk_score?.toFixed(1) || '0.0'}</span>
              </div>
            </div>

            {/* Detected Objects */}
            <div>
              <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Detected Objects</div>
              <div className="space-y-2">
                {result.detections && result.detections.length > 0 ? (
                  result.detections.map((detection, idx) => {
                    const tier = (detection.risk_tier || detection.risk_level || 'NORMAL').toUpperCase();
                    const borderClass = tier === 'PROHIBITED' || tier === 'HIGH'
                      ? 'border-l-red-600'
                      : tier === 'RESTRICTED' || tier === 'MEDIUM'
                      ? 'border-l-amber-500'
                      : 'border-l-green-500';

                    return (
                      <div key={idx} className={`${borderClass} border-l-2 bg-bg-card/50 p-3 rounded`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white">{detection.class_name || detection.class || 'Unknown'}</span>
                          <span className="text-xs text-text-muted">{(detection.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-text-muted mt-1">{tier}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-text-muted">No objects detected</div>
                )}
              </div>
            </div>

            {/* Manifest Mismatch */}
            {result.manifest_mismatch?.detected && (
              <div className="bg-[#2d1515] border border-red-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-alert-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-alert-red">Manifest Mismatch</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Declared: {result.manifest_mismatch.declared_categories?.join(', ') || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Detected: {result.manifest_mismatch.detected_categories?.join(', ') || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div>
              <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">
                {result.inspection_report ? 'Inspection Report' : 'AI Analysis'}
              </div>
              <div className="bg-bg-card border border-border-primary rounded-lg p-4">
                {/* Judge Analysis - if available */}
                {result.judge_analysis && (
                  <div className="mb-3 pb-3 border-b border-border-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 14l-3-9m-3 9l3-1m-3 1l-3-9a5.002 5.002 0 006.001 0" />
                      </svg>
                      <span className="text-xs font-semibold text-accent-primary uppercase">Judge Analysis</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {typeof result.judge_analysis === 'string'
                        ? result.judge_analysis
                        : result.judge_analysis.analysis || result.judge_analysis.text || result.judge_analysis.reasoning || JSON.stringify(result.judge_analysis, null, 2)}
                    </p>
                  </div>
                )}
                {/* Standard AI Analysis */}
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{getAIAnalysisText(result)}</p>
              </div>
            </div>

            {/* Case ID */}
            {result.case_id && (
              <div className="bg-bg-card border border-border-primary rounded-lg p-3">
                <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">Case ID</div>
                <div className="text-sm font-mono text-white">{result.case_id}</div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Actions */}
      {result && (
        <div className="p-4 border-t border-border-primary">
          <button
            onClick={onReset}
            className="w-full py-2.5 bg-bg-cardAlt hover:bg-[#1a1a1a] text-text-secondary text-sm font-medium rounded border border-border-primary transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            New Inspection
          </button>
        </div>
      )}
    </div>
  );
}

export default function InspectionDashboard() {
  const [manifest, setManifest] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [detections, setDetections] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [inspectionResult, setInspectionResult] = useState(null);
  const [error, setError] = useState(null);

  // Wrapper to ensure error is ALWAYS stored as a string
  const setErrorSafe = (err) => {
    if (!err) {
      setError(null);
      return;
    }
    // Use getErrorMessage to convert any error type to string
    const errorMsg = getErrorMessage(err);
    setError(errorMsg);
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setIsAnalyzing(true);
    setErrorSafe(null);
    setAnalysisStep('Preparing upload...');

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    try {
      // Step 1: Upload and get detections
      setAnalysisStep('Uploading cargo scan...');
      const inspectionData = await inspectCargo(file, manifest);
      setDetections(inspectionData.detections || []);

      // Step 2: Run AI analysis
      setAnalysisStep('Analyzing with AI...');
      const analysisResult = await analyzeWithAI(
        inspectionData.detections || [],
        manifest
      );

      // Combine results - ensure ai_analysis and judge_analysis are properly extracted
      const fullResult = {
        ...inspectionData,
        // The /api/ai/analyze endpoint returns {analysis: string}
        ai_analysis: analysisResult.analysis || analysisResult.ai_analysis || inspectionData.ai_analysis || '',
        // Judge analysis from backend (if available)
        judge_analysis: analysisResult.judge_analysis || inspectionData.judge_analysis || null,
      };

      setInspectionResult(fullResult);
    } catch (err) {
      // Pass the error directly to setErrorSafe which will extract the message
      setErrorSafe(err);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setDetections(null);
    setInspectionResult(null);
    setManifest('');
    setIsUploading(false);
    setIsAnalyzing(false);
    setErrorSafe(null);
    setAnalysisStep('');
  };

  const handleClearError = () => {
    setErrorSafe(null);
  };

  return (
    <div className="flex h-full">
      <UploadPanel
        onUpload={handleUpload}
        isUploading={isUploading}
        manifest={manifest}
        setManifest={setManifest}
        error={error && !inspectionResult ? error : null}
        onClearError={handleClearError}
      />
      <CargoViewer
        image={imagePreview}
        detections={detections}
        isAnalyzing={isAnalyzing}
        analysisStep={analysisStep}
      />
      <IntelligencePanel
        result={inspectionResult}
        isAnalyzing={isAnalyzing}
        onReset={handleReset}
        error={error}
      />
    </div>
  );
}
