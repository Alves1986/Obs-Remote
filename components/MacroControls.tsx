import React, { useState } from 'react';
import { obsService } from '../services/obsService';
import { Play, Square, AlertTriangle, ShieldCheck, MonitorPlay, Power } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

export const MacroControls: React.FC<Props> = ({ isConnected }) => {
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const handleSafeClick = async (id: string, action: () => Promise<void>) => {
    if (!isConnected || activeButton) return;
    
    setActiveButton(id);
    try {
        await action();
    } catch (e) {
        console.error(e);
    } finally {
        setTimeout(() => setActiveButton(null), 1000); 
    }
  };

  const handlePanic = () => {
    if (!panicConfirm) {
        setPanicConfirm(true);
        setTimeout(() => setPanicConfirm(false), 3000);
        return;
    }
    obsService.panicMode();
    setPanicConfirm(false);
  };

  // Broadcast button base style
  const btnBase = "relative overflow-hidden transition-all duration-100 active:scale-[0.98] active:brightness-90 shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed border-b-4";

  return (
    <div className="flex flex-col gap-4">
        {/* Main Automation Workflow */}
        <div className="grid grid-cols-1 gap-3">
            {/* START / TAKE BUTTON */}
            <button 
                disabled={!isConnected}
                onClick={() => handleSafeClick('start', () => obsService.startService())}
                className={`
                    ${btnBase}
                    h-24 rounded-lg font-black text-xl tracking-widest
                    bg-gradient-to-b from-emerald-500 to-emerald-700
                    border-emerald-900 text-white shadow-emerald-900/50
                    group
                `}
            >
                {/* Gloss effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
                
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                     <span className="flex items-center gap-2 drop-shadow-md">
                        <Play className="w-6 h-6 fill-current" /> AUTO TAKE
                     </span>
                     <span className="text-[10px] font-mono opacity-80 font-normal tracking-normal bg-black/20 px-2 rounded">
                        INICIAR CULTO
                     </span>
                </div>
                
                {/* Active Indicator */}
                {activeButton === 'start' && (
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                )}
            </button>

            {/* END BUTTON */}
            <button 
                disabled={!isConnected}
                onClick={() => handleSafeClick('end', () => obsService.endService())}
                className={`
                    ${btnBase}
                    h-14 flex items-center justify-center gap-2 rounded-lg font-bold text-sm
                    bg-gradient-to-b from-gray-700 to-gray-800
                    border-gray-950 text-gray-300 hover:text-white
                `}
            >
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5"></div>
                <Square className="w-4 h-4 fill-current" />
                <span>ENCERRAR (FADE TO BLACK)</span>
            </button>
        </div>

        {/* Status Toggles (Simulating Illuminated Switches) */}
        <div className="grid grid-cols-2 gap-3">
            <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('stream', () => obsService.toggleStream())}
                className={`
                    ${btnBase} rounded-lg p-3 flex flex-col items-center justify-center gap-2 border-blue-950
                    bg-gradient-to-b from-slate-800 to-slate-900
                    hover:from-blue-900 hover:to-blue-950
                `}
            >
                <div className="w-full h-1 bg-black/50 rounded-full mb-1 overflow-hidden">
                    <div className="w-full h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                </div>
                <MonitorPlay className="w-6 h-6 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-100 tracking-wider">STREAM</span>
            </button>

            <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('logo', async () => { /* Logo toggle logic */ })}
                className={`
                    ${btnBase} rounded-lg p-3 flex flex-col items-center justify-center gap-2 border-purple-950
                    bg-gradient-to-b from-slate-800 to-slate-900
                    hover:from-purple-900 hover:to-purple-950
                `}
            >
                <div className="w-full h-1 bg-black/50 rounded-full mb-1 overflow-hidden">
                     <div className="w-full h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
                </div>
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-100 tracking-wider">DSK / LOGO</span>
            </button>
        </div>

        {/* Panic Button - Safety Cover Style */}
        <div className="pt-2">
            <button 
                disabled={!isConnected}
                onClick={handlePanic}
                className={`
                    ${btnBase} w-full h-16 rounded flex items-center justify-center gap-3
                    border-red-950 text-white
                    ${panicConfirm 
                        ? 'bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#b91c1c_10px,#b91c1c_20px)] animate-pulse' 
                        : 'bg-gradient-to-b from-red-900 to-red-950 hover:brightness-110'}
                `}
            >
                <div className="bg-black/20 p-2 rounded-full border border-white/10">
                    <AlertTriangle className={`w-6 h-6 ${panicConfirm ? 'text-yellow-300' : 'text-red-300'}`} />
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-black tracking-wider text-sm">EMERGÊNCIA</span>
                    <span className="text-[9px] opacity-80 font-mono">{panicConfirm ? 'CLIQUE P/ CONFIRMAR' : 'CUT TO BLACK'}</span>
                </div>
            </button>
        </div>
    </div>
  );
};