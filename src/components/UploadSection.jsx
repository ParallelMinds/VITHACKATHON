import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2 } from "lucide-react";

export default function UploadSection({
  onImageUpload,
  onRawFile,
  onRawFiles,
  onCsvFile,
  compact = false,
  inferenceMode = "single",
  showCsvControls = false,
  includeCsv = true,
  onIncludeCsvChange,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [csvFileName, setCsvFileName] = useState(null);
  const [batchCount, setBatchCount] = useState(0);
  const inputRef = useRef(null);
  const csvInputRef = useRef(null);

  const isBatch = inferenceMode === "batch";

  // Reset inputs when mode shifts
  useEffect(() => {
    setFileName(null);
    setCsvFileName(null);
    setBatchCount(0);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
    if (onCsvFile) onCsvFile(null);
  }, [inferenceMode]);

  useEffect(() => {
    if (!includeCsv) {
      setCsvFileName(null);
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
      if (onCsvFile) onCsvFile(null);
    }
  }, [includeCsv, onCsvFile]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files) => {
    if (!files || files.length === 0) return;
    
    // Expose raw File to parent for API uploads
    if (onRawFile) onRawFile(files[0]);

    if (isBatch) {
      setBatchCount(files.length);
      
      // Expose all files for batch API
      if (onRawFiles) onRawFiles(Array.from(files));

      // If folder or multiple files
      if (files.length > 1) {
          let folderName = "Multiple files";
          if (files[0].webkitRelativePath) {
              folderName = files[0].webkitRelativePath.split('/')[0];
          }
          setFileName(folderName);
      } else {
          setFileName(files[0].name);
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        onImageUpload(ev.target.result);
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFileName(files[0].name);
      setBatchCount(1);
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(e.target.result);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleCsvChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setCsvFileName(null);
      if (onCsvFile) onCsvFile(null);
      return;
    }
    setCsvFileName(selected.name);
    if (onCsvFile) onCsvFile(selected);
  };

  const handleToggleCsv = () => {
    if (onIncludeCsvChange) {
      onIncludeCsvChange(!includeCsv);
    }
  };

  if (compact) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-md hover:shadow-xl transition-all duration-300 p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white tracking-tight">Image Feed</h3>
          {fileName && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider truncate max-w-[100px] shadow-sm border border-emerald-500/30">
              {fileName}
            </span>
          )}
        </div>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex-1 flex flex-col justify-center items-center border-[2.5px] border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ease-out ${
            dragActive
              ? "border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              : fileName 
                ? "bg-emerald-500/10 border-emerald-500/30 border-solid text-emerald-400" 
                : "border-zinc-700 hover:border-rose-500 hover:bg-zinc-800/50 bg-zinc-900/30"
          }`}
        >
          {isBatch ? (
             <input
               ref={inputRef}
               type="file"
               multiple
               webkitdirectory=""
               directory=""
               onChange={handleChange}
               className="hidden"
             />
          ) : (
             <input
               ref={inputRef}
               type="file"
               accept="image/*"
               onChange={handleChange}
               className="hidden"
             />
          )}

          <motion.div 
            animate={{ y: dragActive ? -5 : 0 }} 
            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 shadow-sm transition-colors ${dragActive || fileName ? (fileName ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]') : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
          >
            {fileName ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
               <UploadCloud className="w-6 h-6" />
            )}
          </motion.div>
          <p className="text-xs text-zinc-400 font-medium">
            Drag payload or <span className="text-rose-400 font-bold hover:underline">browse</span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {showCsvControls && !isBatch && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/50 backdrop-blur-md px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Include cargo manifest (CSV)</p>
            <p className="text-xs text-zinc-400">Enabled by default. Turn off to analyze image only.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleCsv}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
              includeCsv ? "bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30" : "bg-zinc-800 border border-zinc-700"
            }`}
            aria-pressed={includeCsv}
            aria-label="Toggle CSV input"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                includeCsv ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}

      <motion.div
        whileTap={{ scale: 0.99 }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-[2.5px] border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ease-out group ${
          dragActive
            ? "border-rose-500 bg-rose-500/10 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
            : fileName
              ? "bg-emerald-500/10 border-emerald-500/30 border-solid"
              : "border-zinc-700 hover:border-rose-500 hover:bg-zinc-800/50 bg-zinc-900/30"
        }`}
      >
        {isBatch ? (
           <input
             ref={inputRef}
             type="file"
             multiple
             webkitdirectory=""
             directory=""
             onChange={handleChange}
             className="hidden"
           />
        ) : (
           <input
             ref={inputRef}
             type="file"
             accept="image/*"
             onChange={handleChange}
             className="hidden"
           />
        )}
        <motion.div 
          animate={{ y: dragActive ? -8 : 0 }}
          className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${dragActive || fileName ? (fileName ? 'bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] transform scale-110') : 'bg-zinc-800 border text-zinc-400 border-zinc-700 group-hover:shadow-md group-hover:text-rose-400'}`}
        >
           {fileName ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
           ) : (
              <UploadCloud className="w-10 h-10" />
           )}
        </motion.div>
        
        <AnimatePresence mode="wait">
          {fileName ? (
            <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <p className="text-emerald-400 font-extrabold text-lg tracking-tight">
                {isBatch && batchCount > 1 ? `✔ ${batchCount} files loaded successfully` : `✔ ${fileName} uploaded`}
              </p>
              <p className="text-sm font-medium text-emerald-400/70 mt-1.5 flex items-center justify-center gap-2">
                Click here to re-upload or override.
              </p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <p className="text-white font-bold text-lg tracking-tight mb-2">
                {isBatch
                  ? "Batch Scan Mode — Upload multiple files or folder"
                  : "Single Scan Mode — Upload one image"}
              </p>
              <p className="text-sm font-medium text-zinc-400 mt-1">
                Drag and drop your payload here, or <span className="text-rose-400 font-extrabold hover:underline group-hover:text-rose-300">browse</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showCsvControls && !isBatch && includeCsv && (
        <div className="mt-4">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
              csvFileName
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-rose-500/50 hover:bg-zinc-800/80"
            }`}
          >
            <p className="text-sm font-semibold">
              {csvFileName ? `Manifest loaded: ${csvFileName}` : "Upload manifest CSV"}
            </p>
            <p className="text-xs mt-1 opacity-80">
              {csvFileName ? "Click to replace the manifest file." : "Select a .csv file to verify against X-ray contents."}
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
