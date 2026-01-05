import React from 'react';
import { ObsScene } from '../types';
import { obsService } from '../services/obsService';
import { LayoutTemplate, Mic2, Users, Monitor, Video } from 'lucide-react';

interface Props {
  scenes: ObsScene[];
  currentScene: string;
  previewScene?: string;
  isConnected: boolean;
}

export const SceneGrid: React.FC<Props> = ({ scenes, currentScene, previewScene, isConnected }) => {
  
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('louvor')) return <Mic2 className="w-5 h-5" />;
    if (n.includes('palavra') || n.includes('pregador')) return <Users className="w-5 h-5" />;
    if (n.includes('câmera') || n.includes('camera')) return <Video className="w-5 h-5" />;
    if (n.includes('tela') || n.includes('ppt')) return <Monitor className="w-5 h-5" />;
    return <LayoutTemplate className="w-5 h-5" />;
  };

  return (
    <div className="glass-panel rounded-xl p-1 h-full flex flex-col shadow-2xl bg-[#0f0f13] border border-gray-800 min-h-[300px]">
      {/* Label Strip */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700 flex justify-between items-center mb-1">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]"></div>
                <span className="text-red-400 font-bold text-[10px] tracking-widest uppercase">PGM</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-green-400 font-bold text-[10px] tracking-widest uppercase">PVW</span>
             </div>
         </div>
         <span className="text-[9px] font-mono text-gray-500">{scenes.length} SOURCES</span>
      </div>
      
      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
            <span className="font-mono text-xs uppercase tracking-widest">No Signal</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 p-2 overflow-y-auto custom-scroll content-start h-full">
            {scenes.map((scene) => {
            const isProgram = currentScene === scene.name;
            // If preview isn't distinct (Studio Mode off), don't double highlight unless logic demands
            const isPreview = previewScene === scene.name && previewScene !== currentScene; 

            let borderClass = 'border-gray-950';
            let bgClass = 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-400';
            
            if (isProgram) {
                borderClass = 'border-red-900';
                bgClass = 'bg-gradient-to-b from-red-600 to-red-800 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]';
            } else if (isPreview) {
                borderClass = 'border-green-800';
                bgClass = 'bg-gradient-to-b from-green-700 to-green-900 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]';
            }

            return (
                <button
                key={scene.name}
                onClick={() => obsService.setCurrentScene(scene.name)}
                className={`
                    relative group overflow-hidden rounded text-left transition-all duration-75
                    flex flex-col justify-between min-h-[5rem] md:min-h-[6rem] p-3
                    border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation
                    ${bgClass} ${borderClass}
                    ${!isProgram && !isPreview ? 'hover:from-gray-600 hover:to-gray-700 hover:text-white' : ''}
                `}
                >
                    {/* Top Gloss */}
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    {/* LED Indicator */}
                    <div className="flex justify-between items-start mb-1 relative z-10">
                        <span className={`text-[10px] font-mono font-bold opacity-80 uppercase ${isProgram ? 'text-red-950' : isPreview ? 'text-green-950' : 'text-black'}`}>
                            CAM {scene.index + 1}
                        </span>
                        <div className={`
                            w-3 h-1.5 rounded-sm transition-all duration-300
                            ${isProgram ? 'bg-red-200 shadow-[0_0_8px_#fecaca]' : isPreview ? 'bg-green-300 shadow-[0_0_8px_#86efac]' : 'bg-black/50'}
                        `}></div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative z-10 mt-auto">
                        {getIcon(scene.name)}
                        <span className={`font-bold text-xs md:text-sm leading-none uppercase tracking-tight truncate w-full ${isProgram || isPreview ? 'text-white' : 'group-hover:text-gray-200'}`}>
                            {scene.name}
                        </span>
                    </div>
                </button>
            );
            })}
        </div>
      )}
    </div>
  );
};