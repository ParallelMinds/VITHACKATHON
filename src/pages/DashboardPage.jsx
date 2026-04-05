import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UploadSection from "../components/UploadSection";
import ImageViewer from "../components/ImageViewer";
import RiskPanel from "../components/RiskPanel";
import ExplanationPanel from "../components/ExplanationPanel";
import ModuleStatusPanel from "../components/ModuleStatusPanel";
import MaterialAnalysis from "../components/MaterialAnalysis";
import BatchAnalytics from "../components/BatchAnalytics";
import { getModelConfig } from "../config/modelConfig";
import { analysisResults as mockAnalysisResults, explanations as mockExplanations, moduleStatuses } from "../data/mockData";

export default function DashboardPage() {
  const location = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const [image, setImage] = useState(null);
  const [analysisActive, setAnalysisActive] = useState(false);
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  const [audioObj, setAudioObj] = useState(null);

  // ─── Resolve model + mode from route state → sessionStorage fallback ──
  const model = location.state?.model || sessionStorage.getItem("selectedModel") || "yolo";
  const mode = location.state?.mode || sessionStorage.getItem("inferenceMode") || "single";
  const config = getModelConfig(model, mode);
  
  const isYoloBatch = model === "yolo" && mode === "batch";

  // ─── Real inference results (passed from HomePage for YOLO+Single) ────
  const realResult = location.state?.result || null;
  const hasRealData = realResult && realResult.detections;

  // ─── Batch results (passed from HomePage for YOLO+Batch) ─────────────
  const batchResult = location.state?.batchResult || null;

  // ─── Build analysis data from real results or fall back to mock ────────
  const analysisData = useMemo(() => {
    if (!hasRealData) return mockAnalysisResults;

    const detections = realResult.detections;
    const avgConf = detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      : 0;
    
    const riskLevel = detections.length > 0 ? "HIGH" : "LOW";

    return {
      ...mockAnalysisResults,
      boxes: detections, // Already in {x, y, width, height, label, confidence} format
      detection_confidence: avgConf,
      risk_score: avgConf,
      risk_level: riskLevel,
      anomaly_score: 0,
      mismatch_score: 0,
      image_width: realResult.image_width,
      image_height: realResult.image_height,
    };
  }, [hasRealData, realResult]);

  // ─── Build explanations from real detections or fall back to mock ──────
  const realExplanations = useMemo(() => {
    if (!hasRealData) return null;

    const detections = realResult.detections;
    const manifestMismatch = realResult?.manifest_processed && realResult?.manifest_match === false;
    const manifestExplanation = manifestMismatch
      ? [{
          id: 999,
          icon: "🚨",
          text: "Manifest mismatch detected",
          detail: "Manifest and detected items do not match. The person must be interrogated.",
          severity: "high",
          type: "manifest",
        }]
      : [];

    if (detections.length === 0) {
      return [...manifestExplanation, {
        id: 100,
        icon: "✅",
        text: "No threat detected",
        detail: "YOLO model found no contraband items in the scan",
        severity: "info",
        type: "object_detection",
      }];
    }

    const detectionExplanations = detections.map((d, i) => ({
      id: 100 + i,
      icon: d.confidence > 0.7 ? "⚠️" : "🔍",
      text: `${d.label} detected`,
      detail: `confidence: ${(d.confidence * 100).toFixed(1)}%`,
      severity: d.confidence > 0.7 ? "high" : "medium",
      type: "object_detection",
    }));

    return [...manifestExplanation, ...detectionExplanations];
  }, [hasRealData, realResult]);

  // ─── Filtered data based on config ────────────────────────────────────
  const sourceExplanations = realExplanations || mockExplanations;

  const filteredExplanations = useMemo(() => {
    if (realExplanations) return realExplanations; // Real data is already filtered
    if (!config) return sourceExplanations;
    if (config.allowedExplanationIds) return sourceExplanations.filter(e => config.allowedExplanationIds.includes(e.id));
    if (config.allowedExplanationTypes) return sourceExplanations.filter(e => config.allowedExplanationTypes.includes(e.type));
    return sourceExplanations;
  }, [config, realExplanations, sourceExplanations]);

  const filteredBoxes = useMemo(() => {
    if (hasRealData) return analysisData.boxes; // Real boxes are already the right set
    if (!config || !config.allowedBoxLabels) return analysisData.boxes;
    return analysisData.boxes.filter(box => config.allowedBoxLabels.includes(box.label));
  }, [config, hasRealData, analysisData]);

  const filteredModules = useMemo(() => {
    if (!config || !config.allowedModuleIds) return moduleStatuses;
    return moduleStatuses.filter(m => config.allowedModuleIds.includes(m.id));
  }, [config]);

  // ─── Derived state ────────────────────────────────────────────────────
  const showMaterialAnalysis = config ? config.showMaterialAnalysis : true;
  const showExplanations = config ? config.showExplanations : true;
  const showSubsystemDiagnostics = config ? config.showSubsystemDiagnostics : true;

  const isHighRisk = analysisData.risk_level === "HIGH";
  const isWetCargo = showMaterialAnalysis && analysisData.material_analysis?.overall === "WET";
  const isManifestProcessed = hasRealData && realResult?.manifest_processed;
  const isManifestMatched = isManifestProcessed && realResult?.manifest_match === true;
  const isManifestMismatch = hasRealData && realResult?.manifest_processed && realResult?.manifest_match === false;
  const isAlertActive = analysisActive && (isHighRisk || isWetCargo || isManifestMismatch) && !alertAcknowledged;

  useEffect(() => {
    // If real data was passed via route state, use the image from state
    if (location.state?.image) {
      setImage(location.state.image);
      setAnalysisActive(true);
      return;
    }
    // Otherwise fall back to sessionStorage (existing mock flow)
    const stored = sessionStorage.getItem("uploadedImage");
    if (stored) {
      setImage(stored);
      setAnalysisActive(true);
      sessionStorage.removeItem("uploadedImage");
    }
  }, []);

  useEffect(() => {
    if (isAlertActive) {
      const audio = new Audio("/alert.wav");
      let playCount = 0;
      
      const playSequence = () => {
        if (!alertAcknowledged && playCount < 3) {
            audio.play().catch(e => console.log("Audio play blocked", e));
        }
      };
      
      audio.addEventListener('ended', () => {
          playCount++;
          if (playCount < 3 && !alertAcknowledged) {
              setTimeout(playSequence, 1000);
          }
      });

      setAudioObj(audio);
      playSequence();
      
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [isAlertActive, alertAcknowledged]);

  const handleImageUpload = (src) => {
    setImage(src);
    setAnalysisActive(true);
    setAlertAcknowledged(false);
  };

  const handleAcknowledge = () => {
    setAlertAcknowledged(true);
    if (audioObj) {
        audioObj.pause();
        audioObj.currentTime = 0;
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-zinc-950 w-full px-4 sm:px-6 lg:px-8 py-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Critical Alert Banner (TERRIFYING RED) ──────────────────────── */}
      <AnimatePresence>
        {isAlertActive && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0, x: [0, -4, 4, -4, 4, 0] }}
            transition={{ 
              y: { type: "spring", stiffness: 300, damping: 20 },
              x: { duration: 0.4, delay: 0.2 },
              opacity: { duration: 0.3 }
            }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            className="mb-6 bg-red-950/80 backdrop-blur-md text-red-400 px-6 py-4 rounded-xl shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500"></span>
              </span>
              <div>
                <p className="font-extrabold tracking-wide text-xl text-red-400">
                  {isManifestMismatch
                    ? '🚨 MANIFEST MISMATCH DETECTED'
                    : isWetCargo
                      ? '🚨 LIQUID CONTAINER DETECTED'
                      : '🚨 CRITICAL THREAT DETECTED'}
                </p>
                <p className="text-red-400/80 text-sm font-bold mt-1">
                  {isManifestMismatch
                    ? 'Manifest and X-ray detections do NOT match. The person MUST be interrogated.'
                    : isWetCargo
                      ? 'Liquid container detected. Immediate manual inspection required.'
                      : 'Immediate action required per security protocol.'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleAcknowledge}
              className="bg-red-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-red-600 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] whitespace-nowrap"
            >
              ACKNOWLEDGE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Manifest Status Banner (Independent from threat alert) ─────── */}
      {isManifestProcessed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 px-5 py-3 rounded-xl border shadow-sm flex items-center gap-3 ${
            isManifestMatched
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isManifestMatched ? "bg-emerald-500" : "bg-red-500"}`} />
          <p className="text-sm font-bold tracking-wide">
            {isManifestMatched
              ? "✓ MANIFEST MATCHED: Categories and quantities align with X-ray detections."
              : "✗ MANIFEST MISMATCH: Categories/quantities do not align with X-ray detections."}
          </p>
        </motion.div>
      )}

      {/* ─── Manifest Status Banner (Independent from threat alert) ─────── */}
      {isManifestProcessed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 px-5 py-3 rounded-xl border shadow-sm flex items-center gap-3 ${
            isManifestMatched
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isManifestMatched ? "bg-green-500" : "bg-red-500"}`} />
          <p className="text-sm font-bold tracking-wide">
            {isManifestMatched
              ? "MANIFEST MATCHED: Category and quantity align with X-ray detections."
              : "MANIFEST MISMATCH: Category and quantity do not align with X-ray detections."}
          </p>
        </motion.div>
      )}

      {/* ─── Page Header ───────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scan Analysis</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time threat assessment and risk evaluation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Real data badge */}
          {hasRealData && (
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Live Detection
              </span>
            </div>
          )}
          {/* Model Config Badge */}
          {config && (
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                {config.label}
              </span>
            </div>
          )}
          {analysisActive && config?.showActiveSensorFeed !== false && (
            <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 px-4 py-2 rounded-lg shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Scan Active
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {isYoloBatch ? (
        <BatchAnalytics batchResult={batchResult} />
      ) : (
        <>
          {/* ─── Top Row: Upload | Image Viewer | Risk Panel ───────────────── */}
          <div className="grid grid-cols-12 gap-5 mb-5">
            {/* Upload Section */}
            <motion.div variants={itemVariants} className="col-span-12 lg:col-span-2">
              <UploadSection onImageUpload={handleImageUpload} compact />
            </motion.div>

            {/* Image Viewer — expands when Material Analysis is hidden */}
            <motion.div variants={itemVariants} className={`col-span-12 ${showMaterialAnalysis ? 'lg:col-span-7' : 'lg:col-span-7'}`}>
              <ImageViewer imageSrc={image} boxes={filteredBoxes} />
            </motion.div>

            {/* Risk Panel */}
            <motion.div variants={itemVariants} className="col-span-12 lg:col-span-3">
              <RiskPanel 
                data={analysisData} 
                isAlertActive={isAlertActive}
                onAcknowledge={handleAcknowledge}
                allowedMetrics={config?.allowedMetrics}
              />
            </motion.div>
          </div>

          {/* ─── Material Analysis (hidden for YOLO) ───────────────────────── */}
          {showMaterialAnalysis && (
            <motion.div variants={itemVariants} className="mb-5">
              <MaterialAnalysis data={analysisData.material_analysis} />
            </motion.div>
          )}

          {/* ─── Explanation Panel (filtered by config) ────────────────────── */}
          {showExplanations && filteredExplanations.length > 0 && (
            <motion.div variants={itemVariants} className="mb-5">
              <ExplanationPanel explanations={filteredExplanations} />
            </motion.div>
          )}

          {/* ─── Subsystem Diagnostics (filtered by config) ────────────────── */}
          {showSubsystemDiagnostics && filteredModules.length > 0 && (
            <motion.div variants={itemVariants} className="mb-8">
              <ModuleStatusPanel modules={filteredModules} />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
