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
        setTimeout(() => setActiveButton(null), 1000); // 1s cool down
    }
  };

  const handlePanic = () => {
    if (!panicConfirm) {
        setPanicConfirm(true);
        setTimeout(() => setPanicConfirm(false), 3000); // Reset after 3s
        return;
    }
    obsService.panicMode();
    setPanicConfirm(false);
  };

  return (
    <div className="grid grid-cols-1 gap-3">
        {/* Main Service Controls */}
        <button 
            disabled={!isConnected}
            onClick={() => handleSafeClick('start', () => obsService.startService())}
            className={`
                h-16 flex items-center justify-center gap-3 rounded-lg font-bold text-lg shadow-lg
                transition-all duration-200 transform active:scale-95
                ${activeButton === 'start' ? 'opacity-50 cursor-wait' : ''}
                bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white
                disabled:opacity-30 disabled:cursor-not-allowed
            `}
        >
            <Play className="w-6 h-6 fill-current" />
            INICIAR CULTO
        </button>

        <button 
            disabled={!isConnected}
            onClick={() => handleSafeClick('end', () => obsService.endService())}
            className={`
                h-14 flex items-center justify-center gap-3 rounded-lg font-bold shadow-lg
                transition-all duration-200
                bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600
                disabled:opacity-30 disabled:cursor-not-allowed
            `}
        >
            <Square className="w-5 h-5 fill-current" />
            Encerrar Culto
        </button>

        <div className="grid grid-cols-2 gap-3 mt-2">
            <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('stream', () => obsService.toggleStream())}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 p-3 rounded flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30"
            >
                <MonitorPlay className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold text-gray-300">LIVE ON/OFF</span>
            </button>
            <button
                disabled={!isConnected}
                onClick={() => handleSafeClick('logo', async () => { /* Logo toggle logic */ })}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 p-3 rounded flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30"
            >
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold text-gray-300">LOGO TOGGLE</span>
            </button>
        </div>

        {/* Panic Button */}
        <div className="mt-4 pt-4 border-t border-gray-800">
            <button 
                disabled={!isConnected}
                onClick={handlePanic}
                className={`
                    w-full h-12 flex items-center justify-center gap-2 rounded font-bold transition-all duration-200
                    ${panicConfirm 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-red-900/30 text-red-500 border border-red-900/50 hover:bg-red-900/50'}
                    disabled:opacity-30 disabled:cursor-not-allowed
                `}
            >
                <AlertTriangle className="w-5 h-5" />
                {panicConfirm ? 'CONFIRMAR PÂNICO?' : 'PÂNICO / EMERGÊNCIA'}
            </button>
        </div>
    </div>
  );
};