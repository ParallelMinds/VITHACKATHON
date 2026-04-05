import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Cpu, Layers, Loader2 } from "lucide-react";
import UploadSection from "../components/UploadSection";
import { runYoloInference, runYoloBatchInference, runEfficientNetInference, runEfficientNetBatchInference, runWildlifeInference, runWildlifeBatchInference, runLiquidDetectionInference, runLiquidDetectionBatchInference } from "../services/api";

export default function HomePage() {
  const [image, setImage] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [includeCsv, setIncludeCsv] = useState(true);
  const [rawFiles, setRawFiles] = useState(null); // batch
  const [model, setModel] = useState("yolo");
  const [mode, setMode] = useState("single");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setImage(null);
    setRawFile(null);
    setCsvFile(null);
    setIncludeCsv(true);
    setRawFiles(null);
    setError(null);
  }, [mode]);

  const handleStartAnalysis = async () => {
    if (!image) return;

    // For YOLO + Single: call real backend
    if (model === "yolo" && mode === "single" && rawFile) {
      if (includeCsv && !csvFile) {
        setError("CSV is enabled. Please upload a CSV file or turn off the CSV toggle.");
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await runYoloInference(rawFile, includeCsv ? csvFile : null);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, result, image }
        });
      } catch (err) {
        setError(err.message || "Model inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For YOLO + Batch: call real batch backend
    if (model === "yolo" && mode === "batch" && rawFiles && rawFiles.length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const batchResult = await runYoloBatchInference(rawFiles);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, batchResult, image }
        });
      } catch (err) {
        setError(err.message || "Batch inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For EfficientNet + Single: call EfficientNet backend
    if (model === "efficientnet" && mode === "single" && rawFile) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await runEfficientNetInference(rawFile);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, result, image }
        });
      } catch (err) {
        setError(err.message || "EfficientNet inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For EfficientNet + Batch: call EfficientNet batch backend
    if (model === "efficientnet" && mode === "batch" && rawFiles && rawFiles.length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const batchResult = await runEfficientNetBatchInference(rawFiles);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, batchResult, image }
        });
      } catch (err) {
        setError(err.message || "EfficientNet batch inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For Wildlife + Single: call Wildlife backend
    if (model === "wildlife" && mode === "single" && rawFile) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await runWildlifeInference(rawFile);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, result, image }
        });
      } catch (err) {
        setError(err.message || "Wildlife inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For Wildlife + Batch: call Wildlife batch backend
    if (model === "wildlife" && mode === "batch" && rawFiles && rawFiles.length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const batchResult = await runWildlifeBatchInference(rawFiles);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, batchResult, image }
        });
      } catch (err) {
        setError(err.message || "Wildlife batch inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For Liquid + Single: call Liquid detection backend
    if (model === "liquid" && mode === "single" && rawFile) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await runLiquidDetectionInference(rawFile);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, result, image }
        });
      } catch (err) {
        setError(err.message || "Liquid detection inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For Liquid + Batch: call Liquid detection batch backend
    if (model === "liquid" && mode === "batch" && rawFiles && rawFiles.length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const batchResult = await runLiquidDetectionBatchInference(rawFiles);
        sessionStorage.setItem("selectedModel", model);
        sessionStorage.setItem("inferenceMode", mode);
        navigate("/dashboard", {
          state: { model, mode, batchResult, image }
        });
      } catch (err) {
        setError(err.message || "Liquid detection batch inference failed. Is the backend running?");
        setIsLoading(false);
      }
      return;
    }

    // For all other modes: use existing mock flow (fallback)
    sessionStorage.setItem("uploadedImage", image);
    sessionStorage.setItem("selectedModel", model);
    sessionStorage.setItem("inferenceMode", mode);
    navigate("/dashboard", {
      state: { model, mode }
    });
  };

  const models = [
    { value: "yolo", label: "YOLO Baseline Model" },
    { value: "efficientnet", label: "EfficientNet Model" },
    { value: "wildlife", label: "Wildlife Smuggling Detector" },
    { value: "liquid", label: "Liquid Detection Model" },
  ];

  const modes = [
    { value: "single", label: "Single Inference" },
    { value: "batch", label: "Batch Inference" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-zinc-950">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-5xl sm:text-6xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent tracking-tight leading-[1.14] pb-1 mb-4 drop-shadow-2xl">
            Deep CargoVision
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto font-medium leading-relaxed">
            Premium AI-powered cargo inspection platform. Automated scanning, instant risk assessment.
          </p>
        </motion.div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">
              Start Security Scan
            </h2>
            <p className="text-sm font-medium text-zinc-400">
              Select your scan depth and upload an X-ray image to begin inspection.
            </p>
          </div>

          {/* Model & Mode Selectors */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
          >
            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Scan Depth
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Cpu className="w-4 h-4 text-rose-500" />
                </div>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isLoading}
                  className="w-full appearance-none bg-zinc-900/80 border border-zinc-700 rounded-lg pl-9 pr-9 py-2.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 hover:border-zinc-600 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {models.map((m) => {
                    let displayLabel = m.label;
                    if (m.value === 'yolo') displayLabel = 'Standard Fast Scan';
                    else if (m.value === 'efficientnet') displayLabel = 'Deep Forensic Scan';
                    else if (m.value === 'wildlife') displayLabel = 'Wildlife Smuggling Scan';
                    else if (m.value === 'liquid') displayLabel = 'Liquid Container Detection';
                    return <option key={m.value} value={m.value}>{displayLabel}</option>;
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            </div>

            {/* Inference Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Scan Type
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Layers className="w-4 h-4 text-rose-500" />
                </div>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={isLoading}
                  className="w-full appearance-none bg-zinc-900/80 border border-zinc-700 rounded-lg pl-9 pr-9 py-2.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 hover:border-zinc-600 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modes.map((m) => (
                    <option key={m.value} value={m.value}>{m.value === 'single' ? 'Scan Single Bag' : 'Scan Multiple Bags'}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active Config Indicator */}
          <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <p className="text-xs font-semibold text-zinc-300">
              <span className="font-extrabold text-white">
                {(() => {
                  if (model === 'yolo') return 'Standard Fast Scan';
                  else if (model === 'efficientnet') return 'Deep Forensic Scan';
                  else if (model === 'wildlife') return 'Wildlife Smuggling Scan';
                  else if (model === 'liquid') return 'Liquid Container Detection';
                  return 'Unknown Scan';
                })()}
              </span>
              {" · "}
              <span className="font-extrabold text-white">{modes.find(m => m.value === mode)?.label === 'Single Inference' ? 'Scan Single Bag' : 'Scan Multiple Bags'}</span>
            </p>
          </div>

          {/* Upload Area */}
          <UploadSection
            onImageUpload={setImage}
            onRawFile={setRawFile}
            onRawFiles={setRawFiles}
            onCsvFile={setCsvFile}
            inferenceMode={mode}
            showCsvControls={mode === "single"}
            includeCsv={includeCsv}
            onIncludeCsvChange={setIncludeCsv}
          />

          {/* Preview */}
          <div className={`transition-all duration-300 ease-in-out ${image ? 'opacity-100 max-h-40 mt-6' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 shadow-inner">
              <div className="flex items-center gap-3">
                <img
                  src={image}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded shadow-sm border border-emerald-500/40"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-300">
                    Image ready for scan
                  </p>
                  <p className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mt-0.5">
                    X-ray data loaded and verified
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Error Toast */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <span className="text-red-400 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-400">Scan Failed</p>
                <p className="text-xs text-red-400/70">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Start Analysis Button */}
          <motion.button
            whileHover={image && !isLoading ? { scale: 1.02 } : {}}
            whileTap={image && !isLoading ? { scale: 0.98 } : {}}
            onClick={handleStartAnalysis}
            disabled={!image || isLoading}
            className={`w-full mt-6 py-3.5 px-6 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 ${
              isLoading
                ? "bg-rose-500 text-white cursor-wait"
                : image
                  ? "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "batch" ? "Scanning Multiple Bags..." : "Scanning Bag..."}
              </>
            ) : image ? (
              "Start Scan"
            ) : (
              "Awaiting X-Ray"
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
