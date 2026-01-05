import React, { useState, useEffect } from 'react';
import { obsService } from '../services/obsService';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Target, Settings, Save, Camera } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

export const PTZPanel: React.FC<Props> = ({ isConnected }) => {
  const [inputs, setInputs] = useState<string[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Load inputs list
    const handleInputs = (list: string[]) => {
        setInputs(list);
        // Auto-select first potential camera if not set
        if (!selectedCam && list.length > 0) {
            const likelyCam = list.find(n => n.toLowerCase().includes('ptz') || n.toLowerCase().includes('cam'));
            if(likelyCam) setSelectedCam(likelyCam);
        }
    };
    
    // Load persisted selection
    const savedCam = localStorage.getItem('ptz_selected_cam');
    if (savedCam) setSelectedCam(savedCam);

    obsService.on('inputs', handleInputs);
    return () => obsService.off('inputs', handleInputs);
  }, []);

  const handleCamSelect = (name: string) => {
      setSelectedCam(name);
      localStorage.setItem('ptz_selected_cam', name);
      setShowConfig(false);
  };

  // Continuous Movement Logic
  const handleMove = (direction: string) => {
      if (!selectedCam) return;
      obsService.ptzAction(selectedCam, direction, 0);
  };

  const handleStop = () => {
      if (!selectedCam) return;
      obsService.ptzAction(selectedCam, 'stop', 0);
  };

  const handleZoom = (val: number) => {
     if (!selectedCam) return;
     obsService.ptzAction(selectedCam, 'zoom', val);
  };

  const handlePreset = (num: number) => {
      if (!selectedCam) return;
      obsService.ptzAction(selectedCam, 'preset', num);
  };

  const presets = [1, 2, 3, 4, 5, 6];
  const padBtnClass = "bg-gray-800 hover:bg-gray-700 active:bg-brand-600 active:scale-95 text-gray-300 rounded-lg shadow-lg border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none";

  if (showConfig) {
      return (
        <div className="glass-panel rounded-xl p-4 border border-gray-700 shadow-xl bg-[#13161b] h-full flex flex-col">
            <h3 className="text-gray-200 font-bold text-xs uppercase mb-4 flex gap-2"><Settings className="w-4 h-4"/> Configuração PTZ</h3>
            <div className="flex-1 space-y-2 overflow-y-auto custom-scroll">
                <p className="text-[10px] text-gray-500 mb-2">Selecione a fonte do OBS que será controlada:</p>
                {inputs.length === 0 && <span className="text-gray-600 text-xs">Nenhuma fonte encontrada. Conecte ao OBS.</span>}
                {inputs.map(input => (
                    <button 
                        key={input} 
                        onClick={() => handleCamSelect(input)}
                        className={`w-full text-left px-3 py-2 rounded text-xs font-bold border ${selectedCam === input ? 'bg-brand-900/50 border-brand-500 text-brand-200' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
                    >
                        {input}
                    </button>
                ))}
            </div>
            <button onClick={() => setShowConfig(false)} className="mt-4 w-full bg-gray-700 text-white py-2 rounded text-xs font-bold">Voltar</button>
        </div>
      )
  }

  return (
    <div className="glass-panel rounded-xl p-3 border border-gray-700 flex flex-col gap-3 h-full shadow-xl bg-[#13161b]">
      {/* Header with Camera Selection */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
        <div className="flex flex-col">
             <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Target className="w-3 h-3 text-brand-500" /> PTZ Controller
            </h3>
            <span className="text-[9px] font-mono text-brand-400 truncate max-w-[120px]">
                {selectedCam || "Select Source ->"}
            </span>
        </div>
        <button 
            onClick={() => setShowConfig(true)} 
            className={`p-1.5 rounded hover:bg-gray-800 transition-colors ${!selectedCam ? 'animate-pulse bg-brand-900/30 text-brand-400' : 'text-gray-600'}`}
        >
            <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 flex-1 min-h-[160px]">
        {/* D-PAD Grid Layout */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 flex-1 aspect-square max-w-[180px] mx-auto bg-black/20 p-2 rounded-xl border border-gray-800/50">
             <div></div>
             <button 
                className={padBtnClass}
                onPointerDown={() => handleMove('up')}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ChevronUp className="w-6 h-6" />
             </button>
             <div></div>

             <button 
                className={padBtnClass}
                onPointerDown={() => handleMove('left')}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ChevronLeft className="w-6 h-6" />
             </button>
             <div className="flex items-center justify-center">
                 <div className="w-3 h-3 bg-brand-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
             </div>
             <button 
                className={padBtnClass}
                onPointerDown={() => handleMove('right')}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ChevronRight className="w-6 h-6" />
             </button>

             <div></div>
             <button 
                className={padBtnClass}
                onPointerDown={() => handleMove('down')}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ChevronDown className="w-6 h-6" />
             </button>
             <div></div>
        </div>

        {/* Zoom Controls (Vertical Strip) */}
        <div className="flex flex-col gap-1 w-12 bg-black/20 p-1 rounded-lg border border-gray-800/50">
             <button 
                className={`${padBtnClass} flex-1 flex-col gap-1`}
                onPointerDown={() => handleZoom(1)}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ZoomIn className="w-4 h-4" />
                 <span className="text-[8px] font-bold">IN</span>
             </button>
             <button 
                className={`${padBtnClass} flex-1 flex-col gap-1`}
                onPointerDown={() => handleZoom(-1)}
                onPointerUp={handleStop}
                onPointerLeave={handleStop}
                disabled={!isConnected || !selectedCam}
             >
                 <ZoomOut className="w-4 h-4" />
                 <span className="text-[8px] font-bold">OUT</span>
             </button>
        </div>
      </div>

      {/* Preset Bank */}
      <div className="mt-auto pt-2 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-2">
            {presets.map(id => (
                <button 
                    key={id}
                    disabled={!isConnected || !selectedCam}
                    onClick={() => handlePreset(id)}
                    className="bg-gray-800 hover:bg-gray-700 active:bg-brand-600 text-gray-400 hover:text-white h-8 rounded border border-gray-900 text-xs font-mono font-bold transition-all shadow"
                >
                    {id}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};