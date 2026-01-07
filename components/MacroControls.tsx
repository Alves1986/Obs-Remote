import React, { useState } from 'react';
import { obsService } from '../services/obsService';
import { Play, Square, AlertTriangle, ShieldCheck, MonitorPlay, Disc } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

export const MacroControls: React.FC<Props> = ({ isConnected }) => {
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [dskEnabled, setDskEnabled] = useState(false); // Local state for DSK toggle

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

  const toggleDsk = async () => {
      const newState = !dskEnabled;
      setDskEnabled(newState);
      // Assumes there is a source named "Logo" or "Mosca" in your scene
      await obsService.setSceneItemEnabled("Logo", newState); 
  };

  // Broadcast button base style
  const btnBase = "relative overflow-hidden transition-all duration-100 active:scale-[0.98] active:brightness-90 shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed border-b-4";

  return (
    <div className="flex flex-col gap-3">
        {/* Row 1: Main Transport (Split 3/4 and 1/4) */}
        <div className="grid grid-cols-4 gap-3 h-24">
            {/* START / TAKE BUTTON */}
            <button 
                disabled={!isConnected}
                onClick={() => handleSafeClick('start', () => obsService.startService())}
                className={`
                    col-span-3 ${btnBase}
                    rounded-lg font-black text-xl tracking-widest
                    bg-gradient-to-b from-emerald-500 to-emerald-700
                    border-emerald-900 text-white shadow-emerald-900/50
                    group flex flex-col items-center justify-center gap-1
                `}
            >
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-2 drop-shadow-md">
                    <Play className="w-8 h-8 fill-current" /> 
                    <span>AUTO TAKE</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-normal tracking-normal bg-black/20 px-2 rounded relative z-10">
                    INICIAR CULTO
                </span>
                {activeButton === 'start' && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
            </button>

            {/* END BUTTON (FTB) */}
            <button 
                disabled={!isConnected}
                onClick={() => handleSafeClick('end', () => obsService.endService())}
                className={`
                    col-span-1 ${btnBase}
                    rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-1
                    bg-gradient-to-b from-gray-700 to-gray-800
                    border-gray-950 text-gray-400 hover:text-white hover:from-gray-600 hover:to-gray-700
                `}
            >
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 pointer-events-none"></div>
                <Square className="w-5 h-5 fill-current" />
                <span className="text-center leading-tight">FTB</span>
            </button>
        </div>

        {/* Row 2: Status Toggles (3 Columns) */}
        <div className="grid grid-cols-3 gap-3 h-20">
            {/* STREAM */}
            <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('stream', () => obsService.toggleStream())}
                className={`
                    ${btnBase} rounded-lg p-2 flex flex-col items-center justify-between border-blue-950
                    bg-gradient-to-b from-slate-800 to-slate-900 hover:from-blue-900 hover:to-blue-950
                `}
            >
                <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                </div>
                <MonitorPlay className="w-6 h-6 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-100 tracking-wider">STREAM</span>
            </button>

             {/* REC */}
             <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('rec', () => obsService.toggleRecord())}
                className={`
                    ${btnBase} rounded-lg p-2 flex flex-col items-center justify-between border-amber-950
                    bg-gradient-to-b from-slate-800 to-slate-900 hover:from-amber-900 hover:to-amber-950
                `}
            >
                <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
                </div>
                <Disc className="w-6 h-6 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-100 tracking-wider">REC</span>
            </button>

            {/* DSK / LOGO TOGGLE */}
            <button
                disabled={!isConnected}
                onClick={toggleDsk}
                className={`
                    ${btnBase} rounded-lg p-2 flex flex-col items-center justify-between
                    ${dskEnabled ? 'border-purple-600 bg-purple-900/50' : 'border-purple-950 bg-gradient-to-b from-slate-800 to-slate-900'}
                    hover:from-purple-900 hover:to-purple-950
                `}
            >
                <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                     <div className={`w-full h-full bg-purple-500 shadow-[0_0_10px_#a855f7] ${dskEnabled ? 'opacity-100' : 'opacity-20'}`}></div>
                </div>
                <ShieldCheck className={`w-6 h-6 ${dskEnabled ? 'text-white drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'text-purple-400'}`} />
                <span className={`text-[9px] font-bold tracking-wider ${dskEnabled ? 'text-white' : 'text-purple-100'}`}>LOGO/DSK</span>
            </button>
        </div>

        {/* Row 3: Panic Button */}
        <div>
            <button 
                disabled={!isConnected}
                onClick={handlePanic}
                className={`
                    ${btnBase} w-full h-12 rounded flex items-center justify-center gap-3
                    border-red-950 text-white mt-1
                    ${panicConfirm 
                        ? 'bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#b91c1c_10px,#b91c1c_20px)] animate-pulse' 
                        : 'bg-gradient-to-b from-red-950 to-black hover:brightness-125'}
                `}
            >
                 <AlertTriangle className={`w-4 h-4 ${panicConfirm ? 'text-yellow-300' : 'text-red-700'}`} />
                 <span className="font-bold tracking-widest text-xs text-red-500/80">
                    {panicConfirm ? 'CONFIRMAR EMERGÊNCIA' : 'EMERGÊNCIA'}
                 </span>
            </button>
        </div>
    </div>
  );
};