import React, { useState } from 'react';
import { obsService } from '../services/obsService';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Aperture, Target, Save } from 'lucide-react';

interface Props {
  isConnected: boolean;
}

export const PTZPanel: React.FC<Props> = ({ isConnected }) => {
  const [newPresetName, setNewPresetName] = useState('');
  const btnClass = "bg-gray-700 hover:bg-gray-600 active:bg-blue-600 text-white rounded p-3 flex items-center justify-center transition-colors shadow-md disabled:opacity-30 disabled:cursor-not-allowed";
  
  // Commands for obs-ptz
  const move = (x: number, y: number) => obsService.ptzAction('relative-pt', { x, y });
  const zoom = (z: number) => obsService.ptzAction('relative-zoom', { z });
  
  const presets = [1, 2, 3, 4, 5, 6];

  const handleSavePreset = () => {
      if(!newPresetName) return;
      obsService.savePtzPreset(newPresetName);
      setNewPresetName('');
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-4">
      <h3 className="text-gray-300 font-semibold flex items-center gap-2">
        <Target className="w-4 h-4" /> Controle PTZ
      </h3>

      <div className="flex gap-4">
        {/* D-Pad */}
        <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col items-center gap-2 border border-gray-700/50">
            <button className={btnClass} disabled={!isConnected} onClick={() => move(0, -0.1)}><ChevronUp className="w-6 h-6" /></button>
            <div className="flex gap-2">
                <button className={btnClass} disabled={!isConnected} onClick={() => move(-0.1, 0)}><ChevronLeft className="w-6 h-6" /></button>
                <button className={btnClass} disabled={!isConnected} onClick={() => move(0, 0.1)}><ChevronDown className="w-6 h-6" /></button>
                <button className={btnClass} disabled={!isConnected} onClick={() => move(0.1, 0)}><ChevronRight className="w-6 h-6" /></button>
            </div>
        </div>

        {/* Zoom & Focus */}
        <div className="flex flex-col gap-2 flex-1">
            <div className="grid grid-cols-2 gap-2">
                <button className={`${btnClass} text-xs font-bold gap-1`} disabled={!isConnected} onClick={() => zoom(0.1)}>
                    <ZoomIn className="w-4 h-4" /> Zoom +
                </button>
                <button className={`${btnClass} text-xs font-bold gap-1`} disabled={!isConnected} onClick={() => zoom(-0.1)}>
                    <ZoomOut className="w-4 h-4" /> Zoom -
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
                <button className={`${btnClass} text-xs bg-gray-800 border border-gray-600`} disabled={!isConnected} onClick={() => obsService.ptzAction('auto-focus')}>
                    Focus Auto
                </button>
                <button className={`${btnClass} text-xs bg-gray-800 border border-gray-600`} disabled={!isConnected} onClick={() => obsService.ptzAction('manual-focus')}>
                    Focus Man
                </button>
            </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider">Presets Rápidos</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
            {presets.map(id => (
                <button 
                    key={id}
                    disabled={!isConnected}
                    onClick={() => obsService.recallPtzPreset(`Preset ${id}`)}
                    className="bg-gray-900 border border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 py-2 rounded text-sm font-mono transition-all"
                >
                    P-{id}
                </button>
            ))}
        </div>
        
        {/* Save Preset */}
        <div className="flex gap-2">
            <input 
                type="text" 
                placeholder="Nome do Preset"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm flex-1"
                disabled={!isConnected}
            />
            <button 
                onClick={handleSavePreset}
                disabled={!isConnected || !newPresetName}
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500 disabled:opacity-50"
            >
                <Save className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};