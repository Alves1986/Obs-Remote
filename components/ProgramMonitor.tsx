import React, { useState, useEffect, useRef } from 'react';
import { obsService } from '../services/obsService';
import { Eye, EyeOff, Film, Zap } from 'lucide-react';

interface Props {
  currentScene: string;
  isConnected: boolean;
}

export const ProgramMonitor: React.FC<Props> = ({ currentScene, isConnected }) => {
  const [enabled, setEnabled] = useState(true); // Default ON
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<any>(null);
  const [refreshRate, setRefreshRate] = useState(1000); // 1 FPS by default

  useEffect(() => {
    if (!isConnected || !enabled || !currentScene) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setImageSrc(null);
        return;
    }

    const fetchFrame = async () => {
        // Don't fetch if already waiting for a frame (prevents stacking)
        if (loading) return; 
        
        // We use currentScene to capture what is effectively "Program"
        // Note: OBS Websocket 'GetSourceScreenshot' works on Scene names
        const base64 = await obsService.getProgramScreenshot(currentScene);
        if (base64) {
            setImageSrc(base64);
        }
        setLoading(false);
    };

    // Initial fetch
    fetchFrame();

    intervalRef.current = setInterval(fetchFrame, refreshRate);

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, enabled, currentScene, refreshRate]);

  // Toggle speed between Slow (1s) and Fast (200ms)
  const toggleSpeed = () => {
      setRefreshRate(prev => prev === 1000 ? 300 : 1000);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-lg border border-gray-800 bg-black relative flex flex-col min-h-[180px] md:min-h-[240px]">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-2 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${enabled && isConnected ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest shadow-black drop-shadow-md">
                     Monitor {enabled ? (refreshRate < 500 ? 'HQ' : 'Eco') : 'OFF'}
                 </span>
            </div>
            
            <div className="flex gap-1">
                <button 
                    onClick={toggleSpeed}
                    disabled={!enabled}
                    className={`p-1.5 rounded transition-all ${refreshRate < 500 ? 'text-yellow-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}
                    title="Alternar Velocidade (Eco / Rápido)"
                >
                    <Zap className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => setEnabled(!enabled)}
                    className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title={enabled ? "Desligar Monitor" : "Ligar Monitor"}
                >
                    {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex items-center justify-center bg-[#050505] relative overflow-hidden group">
            {isConnected && enabled && imageSrc ? (
                <img 
                    src={imageSrc} 
                    alt="Live Monitor" 
                    className="w-full h-full object-contain" 
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-gray-700">
                    <Film className="w-10 h-10 opacity-20" />
                    <span className="text-[10px] uppercase font-mono">
                        {!isConnected ? 'Desconectado' : enabled ? 'Carregando...' : 'Monitor Pausado'}
                    </span>
                </div>
            )}
            
            {/* Scanline Effect */}
            {enabled && isConnected && (
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
            )}
        </div>
    </div>
  );
};