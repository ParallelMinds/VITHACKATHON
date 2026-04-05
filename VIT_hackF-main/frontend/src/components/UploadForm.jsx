import React, { useState, useRef } from 'react';
import { Upload, Loader2, AlertTriangle, Activity } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function UploadForm({ onResult, analyzing, setAnalyzing }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [conf, setConf] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [localResult, setLocalResult] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const generateAiReport = async (resultData) => {
    try {
      setIsGeneratingSummary(true);
      setGeminiError('');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key not found in environment.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are a Senior Customs and Border Security Analyst. Review this automated X-Ray inference payload and provide a severe, professional 3-sentence executive summary report for command. Do not use markdown. Payload: Risk: ${resultData.risk_summary}. Reasons: ${resultData.reasoning}.`;
      const modelResponse = await model.generateContent(prompt);
      setAiSummary(modelResponse.response.text());
    } catch (e) {
      console.error(e);
      setGeminiError('AI Network Uplink Failed. Manual review required.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      onResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conf', conf);
    formData.append('iou', iou);

    try {
      const token = currentUser ? await currentUser.getIdToken() : '';
      const response = await axios.post('http://localhost:8000/api/analyze', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setLocalResult(response.data);
      onResult(response.data);
      generateAiReport(response.data);
    } catch (err) {
      console.error('Scan Error:', err);
      setError('Neural Link Failure: Ensure YOLO Cluster is operational.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      {/* Parameter Adjustment Sliders */}
      <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#D1D9E0] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Confidence Slider */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[0.6rem] font-bold uppercase tracking-widest text-gov-navy flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gov-accent" />
                Confidence Threshold
              </label>
              <span className="text-[0.65rem] font-bold text-gov-accent bg-white px-2 py-0.5 rounded border border-[#D1D9E0] shadow-sm">
                {Math.round(conf * 100)}%
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={conf} 
              onChange={(e) => setConf(parseFloat(e.target.value))}
              className="premium-slider"
            />
            <p className="text-[0.5rem] text-text-dim font-medium uppercase tracking-wider">Minimum probability for detection</p>
          </div>

          {/* IOU Slider */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[0.6rem] font-bold uppercase tracking-widest text-gov-navy flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gov-saffron" />
                IOU Threshold
              </label>
              <span className="text-[0.65rem] font-bold text-gov-saffron bg-white px-2 py-0.5 rounded border border-[#D1D9E0] shadow-sm">
                {Math.round(iou * 100)}%
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={iou} 
              onChange={(e) => setIou(parseFloat(e.target.value))}
              className="premium-slider"
            />
            <p className="text-[0.5rem] text-text-dim font-medium uppercase tracking-wider">Intersection over Union overlap limit</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Window */}
      <div 
        className="relative flex flex-col items-center justify-center p-8 cursor-pointer bg-[#F9FAFB] aspect-video min-h-[220px] max-h-[340px] overflow-hidden"
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        
        {preview ? (
          <div className="absolute inset-0 group/scan overflow-hidden rounded">
            <img 
              src={preview} 
              alt="Scan Preview" 
              className="w-full h-full object-contain" 
            />
            {/* Scan Line Animation */}
            {analyzing && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div className="w-full h-0.5 bg-gov-accent/50 animate-scan" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gov-navy/25 opacity-0 group-hover/scan:opacity-100 transition-opacity flex items-center justify-center z-30">
               <button 
                 onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                 className="bg-white text-gov-navy px-5 py-2 rounded font-semibold text-xs uppercase tracking-widest shadow-gov-md border border-[#D1D9E0] hover:bg-[#F4F6F8] transition-colors"
               >
                 Replace Source
               </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 border-2 border-dashed border-[#D1D9E0] rounded-full flex items-center justify-center text-text-dim hover:border-gov-accent hover:text-gov-accent transition-colors">
              <Upload size={30} />
            </div>
            <div className="text-center">
              <p className="text-gov-navy font-semibold text-sm uppercase tracking-[0.18em] mb-2">Awaiting Ingestion</p>
              <p className="text-text-dim text-[0.6rem] font-medium uppercase tracking-widest leading-loose">Initialize Tactical Cargo Scan Protocol</p>
            </div>
          </div>
        )}
      </div>

      {/* Viewport Footer */}
      <div className="p-6 bg-white border-t border-[#D1D9E0]">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gov-navy tracking-tight mb-1">X-ray Analysis View</h3>
          <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-[0.18em]">Active Scan Process: Layer 04_Sector_B</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded text-accent-red text-[0.65rem] font-medium flex items-center gap-3">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {file && (
          <button 
            className={`btn-protocol w-full h-12 ${analyzing ? 'bg-[#F4F6F8] text-text-dim border border-[#D1D9E0] opacity-60 cursor-not-allowed' : 'btn-protocol-primary'}`}
            onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Processing Neural Link...
              </>
            ) : (
              'Initiate Tactical Scan'
            )}
          </button>
        )}
      </div>

      {/* Analysis Details - Reasoning & AI Summary Side by Side */}
      {localResult && (
        <div className="p-6 border-t border-[#D1D9E0] bg-[#F8FAFC] animate-slide-up">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Neural Reasoning Module */}
              <div className="secondary-card p-5 bg-white border border-[#D1D9E0] rounded-xl shadow-sm flex flex-col h-[280px]">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <Activity size={13} className="text-gov-accent" />
                  <h4 className="text-[0.6rem] font-black text-gov-navy uppercase tracking-[0.25em]">Neural Reasoning</h4>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <pre className="text-[0.65rem] font-bold leading-relaxed text-[#4A5568] whitespace-pre-wrap font-sans uppercase tracking-tight">
                    {localResult.reasoning || "No analytical data available for this sector."}
                  </pre>
                </div>
              </div>

              {/* AI Executive Summary Module */}
              <div className="secondary-card p-5 bg-white border border-[#D1D9E0] rounded-xl shadow-sm border-l-4 border-l-gov-accent flex flex-col h-[280px]">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isGeneratingSummary ? 'bg-gov-accent animate-ping' : aiSummary ? 'bg-gov-green' : 'bg-accent-red'}`} />
                    <h4 className="text-[0.6rem] font-black text-gov-navy uppercase tracking-[0.25em]">AI Executive Summary</h4>
                  </div>
                  <span className="text-[0.5rem] font-bold text-text-dim uppercase tracking-widest bg-[#F4F6F8] border border-[#D1D9E0] px-2 py-0.5 rounded">
                    Gemini-2.5-Flash
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {isGeneratingSummary ? (
                    <div className="flex flex-col gap-2 opacity-50">
                       <div className="h-1.5 w-full bg-[#D1D9E0] rounded animate-pulse" />
                       <div className="h-1.5 w-[80%] bg-[#D1D9E0] rounded animate-pulse" />
                       <div className="h-1.5 w-[40%] bg-[#D1D9E0] rounded animate-pulse" />
                       <div className="h-1.5 w-[90%] bg-[#D1D9E0] rounded animate-pulse mt-2" />
                       <div className="h-1.5 w-[60%] bg-[#D1D9E0] rounded animate-pulse" />
                    </div>
                  ) : aiSummary ? (
                    <p className="text-[0.65rem] font-bold leading-relaxed text-[#4A5568] italic pl-3 border-l-2 border-gov-accent/35 uppercase tracking-tight">
                      "{aiSummary}"
                    </p>
                  ) : (
                    <p className="text-[0.55rem] font-black text-accent-red uppercase tracking-widest">{geminiError || "Awaiting Generative AI Processing..."}</p>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
