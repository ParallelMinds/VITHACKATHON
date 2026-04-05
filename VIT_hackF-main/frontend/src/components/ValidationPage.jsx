import React, { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, ShieldCheck, Activity, CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function ValidationPage() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [gtFile, setGtFile] = useState(null);
  const [gtFileContent, setGtFileContent] = useState('');
  
  const [confThreshold, setConfThreshold] = useState(0.03);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationImage, setValidationImage] = useState(null);
  const [report, setReport] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setValidationImage(null);
      setReport('');
    }
  };

  const handleGtChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGtFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setGtFileContent(e.target.result);
      reader.readAsText(file);
      setValidationImage(null);
      setReport('');
    }
  };

  const runValidation = async () => {
    if (!imageFile || !gtFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('gt_file', gtFile);
    formData.append('conf', confThreshold);
    formData.append('iou', iouThreshold);

    try {
      const res = await axios.post('http://localhost:8000/api/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setValidationImage(`data:image/jpeg;base64,${res.data.validation_image}`);
      setReport(res.data.report);
    } catch (err) {
      console.error('Validation API Error:', err);
      // Optional: Add some user feedback for error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="glass-card p-6 border-l-4 border-l-accent-cyan">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={22} className="text-accent-cyan" />
          <h2 className="text-lg font-bold text-gov-navy uppercase tracking-widest">Ground Truth Validation Mode</h2>
        </div>
        <p className="text-sm font-medium text-text-dim mb-4">
          Upload an X-ray image <strong className="text-gov-navy">and</strong> its YOLO-format label file (<code className="bg-gray-100 px-1 rounded text-accent-cyan">.txt</code>). 
          The system compares model predictions against ground truth annotations and shows exactly which detections are TP, FP, or FN.
        </p>
        
        <div className="mt-4 bg-[#1E293B] text-[#E2E8F0] p-4 rounded text-xs font-mono border border-[#334155]">
          <p className="text-[#94A3B8] mb-2 font-sans font-semibold tracking-wider uppercase text-[0.65rem]">Label file format (standard YOLO .txt):</p>
          <p>class_id  cx_norm  cy_norm  width_norm  height_norm</p>
          <p>0         0.512    0.398    0.085       0.112</p>
          <p className="text-[#94A3B8] mt-2 italic font-sans text-[0.65rem]">All values are normalised 0-1 relative to image width/height.</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Upload */}
        <div className="glass-card flex flex-col h-96 overflow-hidden border-[#D1D9E0]">
          <div className="px-4 py-2 bg-gray-50 border-b border-[#D1D9E0] flex items-center justify-between">
             <div className="flex items-center gap-2">
               <ImageIcon size={14} className="text-text-dim" />
               <span className="text-[0.65rem] font-bold uppercase tracking-widest text-text-dim">Upload X-Ray Image</span>
             </div>
             {imageFile && <span className="text-[0.65rem] font-medium text-gov-navy truncate max-w-[150px]">{imageFile.name}</span>}
          </div>
          <div className="flex-1 relative bg-white flex items-center justify-center p-2">
            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-[#D1D9E0] rounded cursor-pointer hover:bg-gray-50 hover:border-accent-cyan transition-colors">
                 <Upload size={24} className="text-[#A0AEC0] mb-2" />
                 <span className="text-xs font-medium text-[#718096]">Click to upload Image</span>
                 <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-gray-100 rounded border border-[#E4E8ED] overflow-hidden group">
                <img src={imagePreview} alt="Target" className="max-w-full max-h-full object-contain" />
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-1.5 rounded">Change Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* GT Upload */}
        <div className="glass-card flex flex-col h-96 overflow-hidden border-[#D1D9E0]">
           <div className="px-4 py-2 bg-gray-50 border-b border-[#D1D9E0] flex items-center justify-between">
             <div className="flex items-center gap-2">
               <FileText size={14} className="text-text-dim" />
               <span className="text-[0.65rem] font-bold uppercase tracking-widest text-text-dim">Upload Ground Truth Label (.txt)</span>
             </div>
             {gtFile && <span className="text-[0.65rem] font-medium text-gov-navy truncate max-w-[150px]">{gtFile.name}</span>}
          </div>
          <div className="flex-1 relative bg-white flex items-center justify-center p-2">
            {!gtFile ? (
              <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-[#D1D9E0] rounded cursor-pointer hover:bg-gray-50 hover:border-accent-cyan transition-colors">
                 <FileText size={24} className="text-[#A0AEC0] mb-2" />
                 <span className="text-xs font-medium text-[#718096]">Click to upload .txt Label</span>
                 <input type="file" accept=".txt" className="hidden" onChange={handleGtChange} />
              </label>
            ) : (
              <div className="relative w-full h-full flex flex-col p-4 bg-[#F8FAFC] rounded border border-[#E4E8ED] overflow-hidden group">
                <pre className="text-[0.6rem] font-mono text-[#475569] whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar">
                  {gtFileContent || 'Loading...'}
                </pre>
                <label className="absolute inset-x-0 bottom-0 py-2 bg-white/90 backdrop-blur border-t border-[#E4E8ED] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-accent-cyan text-xs font-bold uppercase tracking-widest">Change Label File</span>
                  <input type="file" accept=".txt" className="hidden" onChange={handleGtChange} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="glass-card p-5 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-50">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-text-dim">Confidence Threshold</span>
            <span className="text-xs font-mono text-gov-navy bg-white border border-[#D1D9E0] px-2 py-0.5 rounded">{confThreshold.toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="0.01" max="0.99" step="0.01" 
            value={confThreshold} 
            onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
            className="premium-slider"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-text-dim">IoU Match Threshold (higher = stricter)</span>
            <span className="text-xs font-mono text-gov-navy bg-white border border-[#D1D9E0] px-2 py-0.5 rounded">{iouThreshold.toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="0.10" max="0.90" step="0.05" 
            value={iouThreshold} 
            onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
            className="premium-slider"
          />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={runValidation}
        disabled={!imageFile || !gtFile || isProcessing}
        className={`w-full py-4 rounded font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all ${
          !imageFile || !gtFile ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
          isProcessing ? 'bg-accent-cyan/80 text-white cursor-wait' :
          'bg-[#F26122] hover:bg-[#D95319] text-white shadow-lg transform hover:-translate-y-0.5'
        }`}
      >
        <Activity size={18} className={isProcessing ? 'animate-pulse' : ''} />
        {isProcessing ? 'Processing Validation...' : 'Run Validation'}
      </button>

      {/* Results Section */}
      {(validationImage || report) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          {/* Overlay Image */}
          <div className="glass-card flex flex-col h-[500px] border-[#D1D9E0]">
            <div className="px-5 py-3 border-b border-[#D1D9E0] bg-gray-50 flex items-center justify-between">
              <span className="stat-label mb-0">Validation Overlay</span>
              <div className="flex gap-4 text-[0.6rem] font-medium text-text-dim">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /> TP</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> FP</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-full" /> FN</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> GT (ref)</span>
              </div>
            </div>
            <div className="flex-1 bg-white flex items-center justify-center p-2 overflow-hidden relative">
              <img src={validationImage} alt="Validation Overlay" className="max-w-full max-h-full object-contain drop-shadow-md rounded" />
            </div>
          </div>

          {/* Validation Report */}
          <div className="glass-card flex flex-col h-[500px] border-[#D1D9E0] bg-[#1E293B]">
             <div className="px-5 py-3 border-b border-[#334155] bg-[#0F172A]">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#94A3B8]">Validation Report</span>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <pre className="text-xs font-mono text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">
                {report}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Legend Block */}
      <div className="glass-card p-6 mt-4 border-l-4 border-l-[#F26122]">
        <h3 className="text-xs font-bold text-gov-navy uppercase tracking-widest mb-4">Colour Legend</h3>
        
        <div className="overflow-x-auto border border-[#E4E8ED] rounded rounded-b-none mb-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-[#E4E8ED] text-[0.65rem] font-bold text-text-dim uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">Colour</th>
                <th className="px-4 py-3">Box Style</th>
                <th className="px-4 py-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8ED] bg-white">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2 font-medium"><div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"/> Green</td>
                <td className="px-4 py-3 text-text-dim font-medium">Solid</td>
                <td className="px-4 py-3 text-gov-navy font-semibold flex items-center gap-2"><CheckCircle size={14} className="text-green-600"/> <span className="font-bold">True Positive</span> — prediction matched a GT object (IoU &ge; threshold)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2 font-medium"><div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"/> Red</td>
                <td className="px-4 py-3 text-text-dim font-medium">Solid</td>
                <td className="px-4 py-3 text-gov-navy font-semibold flex items-center gap-2"><XCircle size={14} className="text-red-600"/> <span className="font-bold">False Positive</span> — prediction with no matching GT object</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2 font-medium"><div className="w-3 h-3 bg-orange-500 rounded-full shadow-sm"/> Orange</td>
                <td className="px-4 py-3 text-text-dim font-medium">Solid (Thin)</td>
                <td className="px-4 py-3 text-gov-navy font-semibold flex items-center gap-2"><AlertTriangle size={14} className="text-orange-500"/> <span className="font-bold">False Negative</span> — GT object with no matching prediction</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2 font-medium"><div className="w-3 h-3 bg-cyan-400 rounded-full shadow-sm"/> Cyan</td>
                <td className="px-4 py-3 text-text-dim font-medium">Thin</td>
                <td className="px-4 py-3 text-gov-navy font-medium"><span className="text-text-dim">Ground Truth</span> reference box (from your label file)</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-orange-50 p-4 rounded border border-orange-100 flex items-start gap-3">
           <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" />
           <div>
             <h4 className="text-sm font-bold text-orange-900 mb-1">Why Recall matters more than Precision in security</h4>
             <p className="text-xs text-orange-800 leading-relaxed font-medium">
               A <strong className="text-red-700">False Negative</strong> (missed gun) is a security failure and catastrophic threat. 
               A <strong className="text-orange-700">False Positive</strong> (false alarm) is just wasted officer time. Always tune your Confidence Threshold to maximise Recall first.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
