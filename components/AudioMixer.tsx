import React, { useEffect, useState } from 'react';
import { AudioSource } from '../types';
import { obsService } from '../services/obsService';
import { Volume2, VolumeX, Sliders, Activity } from 'lucide-react';

interface Props {
  sources: AudioSource[];
  isConnected: boolean;
}

// Simple Horizontal Meter Component
const HorizontalMeter: React.FC<{ volume: number, muted: boolean }> = ({ volume, muted }) => {
    // 30 segments
    const segments = 30;
    const activeSegments = Math.floor(volume * segments);

    return (
        <div className="flex gap-[1px] h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mt-1 opacity-80">
            {Array.from({ length: segments }).map((_, i) => {
                const isActive = !muted && i < activeSegments;
                let color = 'bg-gray-800';
                
                if (isActive) {
                    // Green -> Yellow -> Red gradient logic
                    const percent = i / segments;
                    if (percent > 0.9) color = 'bg-red-500 shadow-[0_0_5px_#ef4444]';
                    else if (percent > 0.7) color = 'bg-yellow-500';
                    else color = 'bg-emerald-500';
                }

                return (
                    <div 
                        key={i} 
                        className={`flex-1 ${color} transition-colors duration-75`} 
                    />
                );
            })}
        </div>
    );
};

export const AudioMixer: React.FC<Props> = ({ sources, isConnected }) => {
  return (
    <div className="glass-panel rounded-xl flex flex-col h-full shadow-xl border border-gray-700 bg-[#161920]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/30">
        <h3 className="text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-500" /> Audio Mixer
        </h3>
        {isConnected && (
            <div className="flex items-center gap-2">
                 <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                 <span className="text-[9px] font-mono text-gray-500 uppercase">{sources.length} CANAIS</span>
            </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2">
        {sources.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                 <VolumeX className="w-8 h-8" />
                 <span className="text-xs uppercase font-bold">Sem fontes de áudio</span>
             </div>
        )}

        {sources.map((source) => (
            <div 
                key={source.name} 
                className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${source.muted 
                        ? 'bg-gray-900/40 border-gray-800 opacity-75' 
                        : 'bg-gray-800/40 border-gray-700 shadow-sm'}
                `}
            >
                {/* Mute Button */}
                <button
                    onClick={() => obsService.setAudioMute(source.name, !source.muted)}
                    className={`
                        w-10 h-10 rounded-md flex items-center justify-center transition-all shrink-0
                        ${source.muted 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                            : 'bg-brand-600 text-white shadow-lg hover:bg-brand-500 active:scale-95'}
                    `}
                    title={source.muted ? "Unmute" : "Mute"}
                >
                    {source.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Controls Container */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-gray-200 truncate pr-2" title={source.name}>
                            {source.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${source.muted ? 'text-red-400' : 'text-brand-400'}`}>
                            {source.muted ? 'MUTED' : `${Math.round(source.volume * 100)}%`}
                        </span>
                    </div>

                    {/* Slider Container */}
                    <div className="relative h-6 flex items-center group">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={source.volume}
                            disabled={!isConnected}
                            onChange={(e) => obsService.setAudioVolume(source.name, parseFloat(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        
                        {/* Custom Track Visual */}
                        <div className="w-full h-2 bg-gray-950 rounded-full border border-gray-800 relative overflow-hidden z-10">
                            {/* Fill */}
                            <div 
                                className={`h-full transition-all duration-75 ease-out ${source.muted ? 'bg-gray-600' : 'bg-gray-200'}`}
                                style={{ width: `${source.volume * 100}%` }}
                            ></div>
                        </div>

                        {/* Thumb Visual (Simulated) */}
                        <div 
                            className="absolute h-4 w-4 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-gray-300 z-10 pointer-events-none transition-all duration-75 ease-out group-active:scale-110"
                            style={{ left: `calc(${source.volume * 100}% - 8px)` }}
                        ></div>
                    </div>

                    {/* Meter */}
                    <HorizontalMeter volume={source.volume} muted={source.muted} />
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};