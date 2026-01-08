import React, { useState, useEffect, useRef } from 'react';
import { obsService } from '../services/obsService';
import { Eye, EyeOff, Film, Zap, WifiOff } from 'lucide-react';

interface Props {
  currentScene: string;
  isConnected: boolean;
}

export const ProgramMonitor: React.FC<Props> = ({ currentScene, isConnected }) => {
  const [enabled, setEnabled] = useState(true); // Default ON
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [refreshRate, setRefreshRate] = useState(1000); // Default to Eco (1s) initially
  const [isError, setIsError] = useState(false);

  // Use a ref to track the timeout so we can clear it on unmount
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Flag to prevent state updates if component unmounts
    let isMounted = true;

    const fetchFrame = async () => {
      // Clear any existing timeout to be safe
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Validation
      if (!isConnected || !enabled || !currentScene) {
        if (isMounted) setImageSrc(null);
        return;
      }

      try {
        const base64 = await obsService.getProgramScreenshot(currentScene);
        
        if (isMounted) {
            if (base64) {
                setImageSrc(base64);
                setIsError(false);
            } else {
                setIsError(true);
            }
        }
      } catch (e) {
        if (isMounted) setIsError(true);
      } finally {
        // Schedule next fetch ONLY after this one completes (prevents network stacking)
        if (isMounted && isConnected && enabled) {
            timeoutRef.current = setTimeout(fetchFrame, refreshRate);
        }
      }
    };

    // Start the loop
    fetchFrame();

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isConnected, enabled, currentScene, refreshRate]);

  // Toggle speed between Eco (1000ms) and Turbo (100ms)
  const toggleSpeed = () => {
      setRefreshRate(prev => prev === 1000 ? 100 : 1000);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-lg border border-gray-800 bg-black relative flex flex-col min-h-[180px] md:min-h-[240px]">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-2 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${enabled && isConnected && !isError ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest shadow-black drop-shadow-md">
                     Monitor {enabled ? (refreshRate < 500 ? 'TURBO' : 'ECO') : 'OFF'}
                 </span>
            </div>
            
            <div className="flex gap-1">
                <button 
                    onClick={toggleSpeed}
                    disabled={!enabled}
                    className={`p-1.5 rounded transition-all ${refreshRate < 500 ? 'text-yellow-400 bg-white/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'text-gray-400 hover:text-white'}`}
                    title="Alternar Velocidade (Eco / Turbo)"
                >
                    <Zap className="w-3.5 h-3.5 fill-current" />
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
            {isConnected && enabled && imageSrc && !isError ? (
                <img 
                    src={imageSrc} 
                    alt="Live Monitor" 
                    className="w-full h-full object-contain" 
                    style={{ contentVisibility: 'auto' }} // Performance optimization
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-gray-700">
                    {isError ? <WifiOff className="w-10 h-10 opacity-20 text-red-500" /> : <Film className="w-10 h-10 opacity-20" />}
                    <span className="text-[10px] uppercase font-mono">
                        {!isConnected ? 'Desconectado' : isError ? 'Sinal Fraco' : enabled ? 'Carregando...' : 'Monitor Pausado'}
                    </span>
                </div>
            )}
            
            {/* Scanline Effect */}
            {enabled && isConnected && !isError && (
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
            )}
        </div>
    </div>
  );
};