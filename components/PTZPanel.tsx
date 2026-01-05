import React, { useState } from 'react';
import { obsService } from '../services/obsService';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Target, Save, Crosshair, Focus } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

export const PTZPanel: React.FC<Props> = ({ isConnected }) => {
  const [newPresetName, setNewPresetName] = useState('');
  
  const move = (x: number, y: number) => obsService.ptzAction('relative-pt', { x, y });
  const zoom = (z: number) => obsService.ptzAction('relative-zoom', { z });
  
  const presets = [1, 2, 3, 4, 5, 6];

  const handleSavePreset = () => {
      if(!newPresetName) return;
      obsService.savePtzPreset(newPresetName);
      setNewPresetName('');
  };

  const padBtn = "bg-gray-800 hover:bg-gray-700 active:bg-brand-600 text-gray-300 rounded shadow-sm border-b-2 border-black active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50";

  return (
    <div className="glass-panel rounded-xl p-4 border border-gray-700 flex flex-col gap-4 h-full shadow-xl bg-[#13161b]">
      <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
        <Target className="w-3 h-3 text-brand-500" /> Camera Control
      </h3>

      <div className="flex gap-4 items-start">
        {/* Joystick Simulation */}
        <div className="relative w-28 h-28 bg-[#0a0c10] rounded-full border-4 border-gray-800 shadow-[inset_0_4px_10px_rgba(0,0,0,1)] flex items-center justify-center shrink-0">
             
             {/* Crosshair/Stick */}
             <div className="w-12 h-12 bg-gray-700 rounded-full shadow-[0_4px_5px_rgba(0,0,0,0.5)] border-t border-gray-600 flex items-center justify-center relative z-10">
                 <div className="w-4 h-4 rounded-full bg-black/50 inset-shadow"></div>
             </div>

             {/* Hidden Hit Areas for Click */}
             <button className="absolute top-0 w-full h-1/2 z-0 cursor-n-resize opacity-0 hover:opacity-10 bg-white/10" disabled={!isConnected} onClick={() => move(0, -0.1)} />
             <button className="absolute bottom-0 w-full h-1/2 z-0 cursor-s-resize opacity-0 hover:opacity-10 bg-white/10" disabled={!isConnected} onClick={() => move(0, 0.1)} />
             <button className="absolute left-0 h-full w-1/2 z-0 cursor-w-resize opacity-0 hover:opacity-10 bg-white/10" disabled={!isConnected} onClick={() => move(-0.1, 0)} />
             <button className="absolute right-0 h-full w-1/2 z-0 cursor-e-resize opacity-0 hover:opacity-10 bg-white/10" disabled={!isConnected} onClick={() => move(0.1, 0)} />
             
             {/* Visual Arrows */}
             <ChevronUp className="absolute top-2 text-gray-600 pointer-events-none w-4 h-4" />
             <ChevronDown className="absolute bottom-2 text-gray-600 pointer-events-none w-4 h-4" />
             <ChevronLeft className="absolute left-2 text-gray-600 pointer-events-none w-4 h-4" />
             <ChevronRight className="absolute right-2 text-gray-600 pointer-events-none w-4 h-4" />
        </div>

        {/* Zoom Rocker */}
        <div className="flex flex-col gap-2 flex-1 h-28">
            <div className="flex-1 bg-gray-900 rounded border border-gray-700 p-1 flex flex-col gap-1">
                <button 
                    className="flex-1 bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold text-gray-400 hover:text-white transition-colors active:bg-brand-600 shadow-sm"
                    disabled={!isConnected} onClick={() => zoom(0.1)}
                >
                    TELE
                </button>
                <button 
                    className="flex-1 bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold text-gray-400 hover:text-white transition-colors active:bg-brand-600 shadow-sm"
                    disabled={!isConnected} onClick={() => zoom(-0.1)}
                >
                    WIDE
                </button>
            </div>
        </div>
      </div>

      {/* Preset Bank - Number Pad Style */}
      <div className="mt-auto bg-[#0a0c10] p-3 rounded border border-gray-800 shadow-inner">
        <label className="text-[9px] text-gray-600 mb-2 block uppercase tracking-wider font-bold">Memory Bank</label>
        <div className="grid grid-cols-3 gap-2">
            {presets.map(id => (
                <button 
                    key={id}
                    disabled={!isConnected}
                    onClick={() => obsService.recallPtzPreset(`Preset ${id}`)}
                    className={`${padBtn} h-8 text-sm font-mono font-bold`}
                >
                    {id}
                </button>
            ))}
        </div>
        
        {/* Save Controls */}
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-800">
            <input 
                type="text" 
                placeholder="Name..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="bg-gray-900 text-gray-300 text-[10px] px-2 py-1 flex-1 rounded border border-gray-700 focus:border-brand-500 outline-none"
                disabled={!isConnected}
            />
            <button 
                onClick={handleSavePreset}
                disabled={!isConnected || !newPresetName}
                className="bg-red-900/50 text-red-400 px-2 rounded hover:bg-red-800 hover:text-white transition-colors text-[10px] uppercase font-bold border border-red-900"
            >
                Store
            </button>
        </div>
      </div>
    </div>
  );
};