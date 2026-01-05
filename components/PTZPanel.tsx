import React, { useState, useEffect, useRef } from 'react';
import { obsService } from '../services/obsService';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Target, Settings, Save, Move, ArrowLeft } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

interface PTZSettings {
  sourceName: string;
  ip: string;
  port: string;
  speed: number;
}

export const PTZPanel: React.FC<Props> = ({ isConnected }) => {
  const [settings, setSettings] = useState<PTZSettings>({
    sourceName: 'PTZ RGBLINK',
    ip: '192.168.18.77',
    port: '1259',
    speed: 12
  });
  const [showConfig, setShowConfig] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ptz_config_v2');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('ptz_config_v2', JSON.stringify(settings));
    setShowConfig(false);
  };

  // --- Movement Logic ---

  const sendCommand = (action: string, arg: string | number = 0) => {
      if (!settings.sourceName) return;
      obsService.ptzAction(settings.sourceName, action, arg);
  };

  const handlePress = (direction: string) => {
      setActiveBtn(direction);
      sendCommand(direction, settings.speed);
  };

  const handleRelease = () => {
      setActiveBtn(null);
      sendCommand('stop');
  };

  // Touch/Mouse event handlers generator
  const bindEvents = (direction: string) => ({
      onMouseDown: () => handlePress(direction),
      onMouseUp: handleRelease,
      onMouseLeave: handleRelease,
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); handlePress(direction); },
      onTouchEnd: handleRelease
  });

  const presets = [1, 2, 3, 4, 5, 6, 7, 8];

  // --- Renders ---

  if (showConfig) {
      return (
        <div className="glass-panel rounded-xl p-4 border border-gray-700 shadow-xl bg-[#13161b] h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-3">
                <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-gray-800 rounded">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h3 className="text-gray-200 font-bold text-sm uppercase flex items-center gap-2">
                    <Settings className="w-4 h-4 text-brand-500"/> Configuração PTZ
                </h3>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto custom-scroll px-1">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Nome da Fonte (OBS)</label>
                    <input 
                        type="text" 
                        value={settings.sourceName}
                        onChange={(e) => setSettings({...settings, sourceName: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-brand-500 outline-none"
                        placeholder="Ex: PTZ RGBLINK"
                    />
                    <p className="text-[9px] text-gray-500 px-1">Deve ser idêntico ao nome da fonte no OBS.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">IP (VISCA)</label>
                        <input 
                            type="text" 
                            value={settings.ip}
                            onChange={(e) => setSettings({...settings, ip: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-brand-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Porta</label>
                        <input 
                            type="text" 
                            value={settings.port}
                            onChange={(e) => setSettings({...settings, port: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-brand-500 outline-none"
                        />
                    </div>
                </div>

                <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50">
                    <p className="text-[10px] text-blue-200 leading-relaxed">
                        <strong>Nota:</strong> O controle é feito via OBS. Certifique-se que o plugin <em>obs-ptz</em> (ou similar) está configurado na fonte <strong>{settings.sourceName || '...'}</strong> com os dados de conexão acima.
                    </p>
                </div>
            </div>

            <button 
                onClick={saveSettings} 
                className="mt-4 w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" /> Salvar Configuração
            </button>
        </div>
      )
  }

  const dpadBtnClass = `
    relative flex items-center justify-center rounded-lg shadow-lg border-b-4 border-black/50 active:border-b-0 active:translate-y-1 transition-all
    bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-brand-600 active:text-white
    disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none
  `;

  return (
    <div className="glass-panel rounded-xl p-4 border border-gray-700 flex flex-col h-full shadow-2xl bg-[#13161b] relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
             <h3 className="text-gray-200 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-500" /> Camera Control
            </h3>
            <span className="text-[10px] font-mono text-brand-400 truncate max-w-[150px]">
                {settings.sourceName || "Não Configurado"}
            </span>
        </div>
        <button 
            onClick={() => setShowConfig(true)} 
            className="p-2 rounded hover:bg-gray-800 transition-colors text-gray-500 hover:text-white"
        >
            <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-[180px]">
        
        {/* D-Pad Area */}
        <div className="flex-1 relative bg-black/20 rounded-xl border border-gray-800/50 p-2 flex items-center justify-center">
             <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full max-w-[200px] aspect-square">
                 {/* Top Row */}
                 <div className="col-start-2">
                     <button className={`${dpadBtnClass} w-full h-full rounded-b-none`} {...bindEvents('up')}>
                        <ChevronUp className="w-8 h-8" />
                     </button>
                 </div>
                 
                 {/* Middle Row */}
                 <div className="col-start-1 row-start-2">
                     <button className={`${dpadBtnClass} w-full h-full rounded-r-none`} {...bindEvents('left')}>
                        <ChevronLeft className="w-8 h-8" />
                     </button>
                 </div>
                 <div className="col-start-2 row-start-2 flex items-center justify-center bg-gray-900 rounded-full border border-gray-800">
                     <div className={`w-4 h-4 rounded-full transition-all duration-300 ${activeBtn ? 'bg-brand-500 shadow-[0_0_15px_#3b82f6]' : 'bg-gray-700'}`}></div>
                 </div>
                 <div className="col-start-3 row-start-2">
                     <button className={`${dpadBtnClass} w-full h-full rounded-l-none`} {...bindEvents('right')}>
                        <ChevronRight className="w-8 h-8" />
                     </button>
                 </div>

                 {/* Bottom Row */}
                 <div className="col-start-2 row-start-3">
                     <button className={`${dpadBtnClass} w-full h-full rounded-t-none`} {...bindEvents('down')}>
                        <ChevronDown className="w-8 h-8" />
                     </button>
                 </div>
             </div>
        </div>

        {/* Zoom Slider */}
        <div className="w-14 bg-black/20 rounded-xl border border-gray-800/50 p-1 flex flex-col gap-1">
             <button 
                className={`${dpadBtnClass} flex-1 flex-col gap-1 !rounded`} 
                {...bindEvents('zoom_in')}
             >
                 <ZoomIn className="w-5 h-5" />
                 <span className="text-[9px] font-bold">TELE</span>
             </button>
             <button 
                className={`${dpadBtnClass} flex-1 flex-col gap-1 !rounded`} 
                {...bindEvents('zoom_out')}
             >
                 <ZoomOut className="w-5 h-5" />
                 <span className="text-[9px] font-bold">WIDE</span>
             </button>
        </div>
      </div>

      {/* Preset Bank */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2 px-1">
            <Move className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Memory Bank</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
            {presets.map(id => (
                <button 
                    key={id}
                    disabled={!isConnected}
                    onClick={() => sendCommand('preset', id)}
                    className="
                        bg-gray-800 hover:bg-gray-700 active:bg-brand-600 active:text-white
                        text-gray-400 font-mono font-bold text-sm h-10 rounded border-b-2 border-gray-950
                        active:border-b-0 active:translate-y-[2px] transition-all shadow-md
                        disabled:opacity-50
                    "
                >
                    {id}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};