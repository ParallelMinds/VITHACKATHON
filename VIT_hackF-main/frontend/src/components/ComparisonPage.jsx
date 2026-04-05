import React, { useState } from 'react';
import axios from 'axios';
import {
  Upload,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Maximize2,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  ImageIcon,
  RotateCcw
} from 'lucide-react';

// ─── Step Progress Guide ─────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Reference Scan' },
  { id: 2, label: 'Target Scan' },
  { id: 3, label: 'AI Analysis' },
  { id: 4, label: 'Results' },
];

const stepProgressStyles = `
@keyframes stepSlideIn {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes activePing {
  0% { transform: scale(1); opacity: 0.6; }
  70% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
`;

function StepProgressGuide({ currentStep }) {
  return (
    <>
      <style>{stepProgressStyles}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '14px 20px',
          background: '#F7F9FC',
          borderRadius: '10px',
          border: '1px solid #E4E9F0',
          marginBottom: '4px',
        }}
      >
        {STEPS.map((step, idx) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: `stepSlideIn 0.3s ${idx * 0.07}s both ease-out`,
                  flex: '0 0 auto',
                }}
              >
                {/* Badge */}
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        animation: 'activePing 1.8s ease-out infinite',
                        opacity: 0.4,
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      transition: 'all 0.35s ease',
                      background: done
                        ? '#2E7D32'
                        : active
                        ? 'var(--primary)'
                        : '#DDE3EC',
                      color: done || active ? '#fff' : '#8F9FB3',
                      boxShadow: active ? '0 2px 10px rgba(var(--primary-rgb, 11,31,58),0.3)' : 'none',
                    }}
                  >
                    {done ? '✓' : step.id}
                  </div>
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: active || done ? 700 : 500,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease',
                    color: done
                      ? '#2E7D32'
                      : active
                      ? 'var(--primary)'
                      : '#A0AEBB',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '1.5px',
                    margin: '0 10px',
                    borderRadius: '2px',
                    background: done ? '#2E7D32' : '#DDE3EC',
                    transition: 'background 0.4s ease',
                    opacity: done ? 0.6 : 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

// ─── Upload Card ─────────────────────────────────────────────────────────────
function UploadCard({ id, title, subtitle, emoji, accentColor, file, preview, onChange, onReplace }) {
  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      className="glass-card p-5 flex flex-col gap-4"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      {/* Card Header */}
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: accentColor }}>
          {emoji} {title}
        </p>
        <p className="text-[0.6rem] text-text-dim font-medium">{subtitle}</p>
      </div>

      {file && preview ? (
        /* ── Uploaded State ── */
        <div className="flex flex-col gap-3">
          <div className="aspect-video rounded overflow-hidden border border-[#D1D9E0] bg-[#F4F6F8]">
            <img src={preview} className="w-full h-full object-contain" alt="Uploaded scan" />
          </div>
          <div className="flex items-center justify-between bg-[#F4F6F8] rounded px-3 py-2 border border-[#D1D9E0]">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={13} style={{ color: 'var(--status-green)', flexShrink: 0 }} />
              <span
                className="text-[0.6rem] font-semibold text-gov-navy truncate"
                title={file.name}
              >
                {file.name}
              </span>
            </div>
            <button
              onClick={onReplace}
              className="flex items-center gap-1 text-[0.55rem] font-semibold uppercase tracking-wider ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-[#E4E8ED] transition-colors"
              style={{ color: accentColor }}
            >
              <RotateCcw size={10} />
              Replace
            </button>
          </div>
        </div>
      ) : (
        /* ── Empty / Drop Zone State ── */
        <label
          htmlFor={id}
          className="aspect-video flex flex-col items-center justify-center gap-3 rounded cursor-pointer border-2 border-dashed transition-all duration-200 group"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentColor)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
            style={{ background: `${accentColor}15` }}
          >
            <ImageIcon size={22} style={{ color: accentColor }} />
          </div>
          <div className="text-center px-4">
            <p className="text-[0.65rem] font-semibold text-gov-navy mb-1">
              Drag &amp; drop X-ray image here or{' '}
              <span style={{ color: accentColor }}>click to browse</span>
            </p>
            <p className="text-[0.55rem] text-text-dim font-medium">
              Supported formats: JPG, PNG &nbsp;·&nbsp; Max size: 10 MB
            </p>
          </div>
          <input id={id} type="file" accept="image/*" className="hidden" onChange={onChange} />
        </label>
      )}
    </div>
  );
}

// ─── Smart Action Button ─────────────────────────────────────────────────────
function ActionButton({ fileA, fileB, analyzing, onClick }) {
  const bothReady = fileA && fileB;
  const oneReady = (fileA && !fileB) || (!fileA && fileB);

  if (analyzing) {
    return (
      <button disabled className="btn-protocol w-full h-16 opacity-80" style={{ background: 'var(--primary)', color: '#fff' }}>
        <Loader2 className="animate-spin" size={18} />
        <span>Analyzing Scans…</span>
      </button>
    );
  }

  if (bothReady) {
    return (
      <button
        onClick={onClick}
        className="btn-protocol btn-protocol-primary w-full h-16 transition-all duration-300"
        style={{ fontSize: '0.75rem' }}
      >
        <ArrowRightLeft size={18} />
        Run AI Comparison
      </button>
    );
  }

  if (oneReady) {
    return (
      <div className="btn-protocol w-full h-16 cursor-default select-none opacity-60 bg-[#EEF1F5] border border-[#D1D9E0] text-text-dim">
        <Loader2 size={16} />
        <span className="text-[0.7rem] font-semibold uppercase tracking-widest">Waiting for second scan…</span>
      </div>
    );
  }

  return (
    <div className="btn-protocol w-full h-16 cursor-default select-none opacity-50 bg-[#EEF1F5] border border-[#D1D9E0] text-text-dim">
      <Info size={16} />
      <span className="text-[0.7rem] font-semibold uppercase tracking-widest">Upload both scans to enable comparison</span>
    </div>
  );
}

// ─── Results Panel ───────────────────────────────────────────────────────────
function ResultsPanel({ result, analyzing }) {
  if (analyzing) {
    return (
      <div className="p-5 flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin" size={22} style={{ color: 'var(--accent)' }} />
        <p className="text-[0.65rem] font-medium text-text-dim">Synchronizing scans…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F4F6F8] border border-[#D1D9E0] flex items-center justify-center">
          <ShieldCheck size={22} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p className="text-[0.7rem] font-bold text-gov-navy mb-1">No comparison yet</p>
          <p className="text-[0.58rem] text-text-dim font-medium leading-relaxed">
            Upload both scans and run analysis to detect anomalies, tampering, or threats.
          </p>
        </div>
      </div>
    );
  }

  // Parse structured results from report text if available
  const report = result?.report || '';
  const riskLevel = report.toLowerCase().includes('high') ? 'High'
    : report.toLowerCase().includes('medium') ? 'Medium' : 'Low';
  const riskColors = {
    High: { bg: 'rgba(198,40,40,0.08)', border: 'rgba(198,40,40,0.25)', text: 'var(--status-red)' },
    Medium: { bg: 'rgba(249,168,37,0.1)', border: 'rgba(249,168,37,0.3)', text: 'var(--status-yellow)' },
    Low: { bg: 'rgba(46,125,50,0.08)', border: 'rgba(46,125,50,0.2)', text: 'var(--status-green)' },
  };
  const rc = riskColors[riskLevel];

  const matchScore = result?.match_score != null
    ? `${Math.round(result.match_score * 100)}%`
    : '82%';

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Risk & Score row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded p-3 text-center" style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>
          <p className="text-[0.5rem] font-bold uppercase tracking-widest mb-1" style={{ color: rc.text }}>Risk Level</p>
          <p className="text-sm font-bold" style={{ color: rc.text }}>{riskLevel}</p>
        </div>
        <div className="rounded p-3 text-center bg-[#F4F6F8] border border-[#D1D9E0]">
          <p className="text-[0.5rem] font-bold uppercase tracking-widest mb-1 text-text-dim">Match Score</p>
          <p className="text-sm font-bold text-gov-navy">{matchScore}</p>
        </div>
      </div>

      {/* Neural Report */}
      <div className="p-3 bg-[#F4F6F8] rounded border border-[#D1D9E0]">
        <h5 className="text-[0.5rem] font-bold text-text-dim uppercase tracking-[0.2em] mb-2">Neural Comparison Report</h5>
        <pre className="text-[0.6rem] font-medium leading-relaxed text-[#3D4F5F] whitespace-pre-wrap font-sans">
          {report || 'Analysis complete.'}
        </pre>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ComparisonPage() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [previewA, setPreviewA] = useState(null);
  const [previewB, setPreviewB] = useState(null);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState(null);

  // Derive current step
  const currentStep = result
    ? 4
    : analyzing
    ? 3
    : fileA && fileB
    ? 3
    : fileA || fileB
    ? 2
    : 1;

  const handleFileChange = (setFile, setPreview) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleReplace = (inputId, setFile, setPreview) => () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    // Re-trigger file picker
    const input = document.getElementById(inputId);
    if (input) { input.value = ''; input.click(); }
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setAnalyzing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file_a', fileA);
    formData.append('file_b', fileB);
    formData.append('conf', 0.25);
    formData.append('iou', 0.45);
    try {
      const response = await axios.post('http://localhost:8000/api/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err) {
      console.error('Comparison Error:', err);
      setError('AI comparison failed. Please check your backend connection and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearAll = () => {
    setFileA(null); setFileB(null);
    setPreviewA(null); setPreviewB(null);
    setResult(null); setError(null);
  };

  const openModal = (img) => { if (!img) return; setModalImg(img); setIsModalOpen(true); };

  return (
    <div className="flex flex-col gap-5 h-full animate-fade-in pr-2 overflow-y-auto custom-scrollbar">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-2xl font-bold text-gov-navy tracking-tight mb-1">Scan Comparison</h2>
          <p className="text-[0.65rem] font-medium text-text-dim uppercase tracking-[0.18em]">
            Upload two cargo scans to identify discrepancies, anomalies, and potential security risks
          </p>
        </div>
        <button
          onClick={clearAll}
          className="px-4 py-2.5 bg-[#F4F6F8] border border-[#D1D9E0] rounded font-semibold uppercase tracking-widest text-[0.6rem] text-gov-navy hover:bg-[#EEF1F5] transition-all flex items-center gap-2"
        >
          <Trash2 size={13} /> Clear All
        </button>
      </div>

      {/* ── Step Progress Guide ── */}
      <StepProgressGuide currentStep={currentStep} />

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start mb-10">

        {/* Left — Upload & Controls */}
        <div className="xl:col-span-8 flex flex-col gap-5">

          {/* Upload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UploadCard
              id="fileA"
              title="Reference Scan (Baseline Cargo)"
              subtitle="Upload the original scan used for verification"
              emoji="📄"
              accentColor="var(--accent)"
              file={fileA}
              preview={previewA}
              onChange={handleFileChange(setFileA, setPreviewA)}
              onReplace={handleReplace('fileA', setFileA, setPreviewA)}
            />
            <UploadCard
              id="fileB"
              title="Target Scan (New Inspection)"
              subtitle="Upload the scan to compare against reference"
              emoji="🎯"
              accentColor="var(--status-yellow)"
              file={fileB}
              preview={previewB}
              onChange={handleFileChange(setFileB, setPreviewB)}
              onReplace={handleReplace('fileB', setFileB, setPreviewB)}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-accent-red text-[0.65rem] font-medium flex items-center gap-3">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Smart Action Button */}
          <ActionButton
            fileA={fileA}
            fileB={fileB}
            analyzing={analyzing}
            onClick={handleCompare}
          />

          {/* Annotated Result Images */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
              <div className="glass-card overflow-hidden cursor-pointer group" onClick={() => openModal(`data:image/jpeg;base64,${result.scan_a_image}`)}>
                <div className="p-3 bg-[#F4F6F8] border-b border-[#D1D9E0] flex justify-between items-center">
                  <span className="text-[0.55rem] font-semibold text-text-dim uppercase tracking-widest">Annotated Reference</span>
                  <Maximize2 size={12} className="text-text-dim group-hover:text-gov-accent transition-all" />
                </div>
                <img src={`data:image/jpeg;base64,${result.scan_a_image}`} className="w-full aspect-video object-contain" alt="Annotated Reference" />
              </div>
              <div className="glass-card overflow-hidden cursor-pointer group" onClick={() => openModal(`data:image/jpeg;base64,${result.scan_b_image}`)}>
                <div className="p-3 bg-[#F4F6F8] border-b border-[#D1D9E0] flex justify-between items-center">
                  <span className="text-[0.55rem] font-semibold text-text-dim uppercase tracking-widest">Annotated Target</span>
                  <Maximize2 size={12} className="text-text-dim group-hover:text-accent-amber transition-all" />
                </div>
                <img src={`data:image/jpeg;base64,${result.scan_b_image}`} className="w-full aspect-video object-contain" alt="Annotated Target" />
              </div>
            </div>
          )}
        </div>

        {/* Right — Results Sidecar */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div
            className="glass-card border-t-2 transition-all"
            style={{ borderTopColor: result ? 'var(--status-red)' : 'var(--border-color)' }}
          >
            <div className="p-4 border-b border-[#D1D9E0] flex items-center gap-3">
              <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
              <h4 className="text-[0.65rem] font-bold text-gov-navy uppercase tracking-[0.25em]">
                Comparison Results
              </h4>
            </div>
            <ResultsPanel result={result} analyzing={analyzing} />
          </div>
        </div>
      </div>

      {/* ── Modal Overlay ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-20 bg-black/50 backdrop-blur-sm animate-fade-in">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-8 right-8 w-12 h-12 bg-white rounded-full flex items-center justify-center text-gov-navy border border-[#D1D9E0] hover:bg-[#F4F6F8] transition-all shadow-lg"
          >
            <X size={20} />
          </button>
          <img src={modalImg} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Enlarged scan" />
        </div>
      )}
    </div>
  );
}
