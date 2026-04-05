import { useState, useRef, useEffect } from "react";
import { Layers, BoxSelect, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageViewer({ imageSrc, boxes }) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [hoveredBox, setHoveredBox] = useState(null);
  
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const heatmapRef = useRef(null);
  
  const [imgLayout, setImgLayout] = useState({ w: 0, h: 0, scaleX: 1, scaleY: 1 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imageSrc) {
      setLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      updateLayout();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const updateLayout = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const maxW = container.clientWidth;
    const maxH = container.clientHeight - 8;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    
    setImgLayout({ w, h, scaleX: w / img.width, scaleY: h / img.height, scale });
  };

  useEffect(() => {
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    if (loaded && showHeatmap) {
      drawHeatmap();
    }
  }, [loaded, showHeatmap, imgLayout]);

  const drawHeatmap = () => {
    const canvas = heatmapRef.current;
    if (!canvas) return;
    const { w, h } = imgLayout;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createRadialGradient(
      w * 0.35, h * 0.45, 10,
      w * 0.35, h * 0.45, w * 0.35
    );
    gradient.addColorStop(0, "rgba(220, 38, 38, 0.45)");
    gradient.addColorStop(0.4, "rgba(234, 179, 8, 0.25)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const gradient2 = ctx.createRadialGradient(
      w * 0.65, h * 0.6, 8,
      w * 0.65, h * 0.6, w * 0.2
    );
    gradient2.addColorStop(0, "rgba(234, 179, 8, 0.35)");
    gradient2.addColorStop(1, "rgba(59, 130, 246, 0.0)");
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, w, h);
  };

  if (!imageSrc) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-sm flex items-center justify-center h-full min-h-[400px]"
      >
        <div className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Awaiting Scan</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-md hover:shadow-xl overflow-hidden flex flex-col h-full transition-all duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700 bg-zinc-800/80">
        <h3 className="text-sm font-bold text-white tracking-tight">X-Ray Viewer</h3>
        <div className="flex items-center gap-3">
          <ToggleButton
            label="Bounding Boxes"
            active={showBoxes}
            icon={<BoxSelect className="w-4 h-4" />}
            onClick={() => setShowBoxes(!showBoxes)}
          />
          <ToggleButton
            label="Heatmap"
            active={showHeatmap}
            icon={<Layers className="w-4 h-4" />}
            onClick={() => setShowHeatmap(!showHeatmap)}
          />
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 bg-black min-h-[400px] relative overflow-hidden group"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative transition-transform duration-700 ease-in-out group-hover:scale-[1.02]"
          style={{ width: imgLayout.w, height: imgLayout.h }}
        >
          {/* Main Image */}
          {loaded && (
            <img 
              src={imageSrc} 
              alt="Cargo Scan" 
              className="absolute inset-0 w-full h-full object-contain rounded-md shadow-sm pointer-events-none" 
            />
          )}

          {/* Heatmap Overlay */}
          <canvas
            ref={heatmapRef}
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${showHeatmap ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Bounding Boxes */}
          <AnimatePresence>
            {showBoxes && loaded && boxes && boxes.map((box, i) => {
              const bx = box.x * imgLayout.scaleX;
              const by = box.y * imgLayout.scaleY;
              const bw = box.width * imgLayout.scaleX;
              const bh = box.height * imgLayout.scaleY;
              
              const isClassification = box.type === 'classification';
              const isHighRisk = box.confidence > 0.7 && !isClassification;
              const isHovered = hoveredBox === i;

              const getBoxClasses = (hover) => {
                if (isClassification) return hover ? 'bg-emerald-500/20 border-emerald-400 scale-105 z-20 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-emerald-500/10 border-emerald-400/50 border-dashed';
                if (isHighRisk) return hover ? 'bg-red-500/20 border-red-400 scale-105 z-20 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-red-500/10 border-red-400/50 border-dashed';
                return hover ? 'bg-rose-500/20 border-rose-400 scale-105 z-20 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-rose-500/10 border-rose-400/50 border-dashed';
              };

              const tooltipBg = isClassification ? 'bg-emerald-900 border border-emerald-700' : (isHighRisk ? 'bg-red-900 border border-red-700' : 'bg-zinc-800 border border-zinc-700');
              const labelBg = isClassification ? 'bg-emerald-600/90' : (isHighRisk ? 'bg-red-600/90' : 'bg-rose-600/90');

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onMouseEnter={() => setHoveredBox(i)}
                  onMouseLeave={() => setHoveredBox(null)}
                  style={{ left: bx, top: by, width: bw, height: bh }}
                  className={`absolute cursor-pointer border-2 transition-all duration-200 z-10 ${getBoxClasses(isHovered)}`}
                >
                  {/* Tooltip or Label */}
                  <AnimatePresence>
                    {isHovered ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 rounded-lg shadow-xl text-white font-bold whitespace-nowrap z-30 ${tooltipBg}`}
                      >
                        <div className="text-sm border-b border-white/20 pb-0.5 mb-0.5">{box.label}</div>
                        <div className="text-xs font-medium text-white/90">Confidence: {(box.confidence * 100).toFixed(1)}%</div>
                        {/* Only show material badge if not a simple classification, to keep UI clean, or show it anyway */}
                        {!isClassification && box.material && (
                          <div className={`text-xs font-bold mt-1 px-1.5 py-0.5 rounded inline-block ${box.material === 'WET' ? 'bg-red-500/80 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-emerald-500/80 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}>
                            {box.material === 'WET' ? '💧 WET' : '✅ DRY'}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${labelBg}`}
                      >
                        {box.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border shadow-sm ${
        active
          ? "bg-zinc-800 text-white border-zinc-700 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      {icon}
      {label}
      <div className={`ml-1 w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${active ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'bg-zinc-700'}`}>
         <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${active ? 'translate-x-3' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}
