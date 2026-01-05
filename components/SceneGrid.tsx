import React from 'react';
import { ObsScene } from '../types';
import { obsService } from '../services/obsService';
import { LayoutTemplate, Mic2, Users, Monitor, Video, Radio } from 'lucide-react';

interface Props {
  scenes: ObsScene[];
  currentScene: string;
  isConnected: boolean;
}

export const SceneGrid: React.FC<Props> = ({ scenes, currentScene, isConnected }) => {
  
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('louvor')) return <Mic2 className="w-5 h-5" />;
    if (n.includes('palavra') || n.includes('pregador')) return <Users className="w-5 h-5" />;
    if (n.includes('câmera') || n.includes('camera')) return <Video className="w-5 h-5" />;
    if (n.includes('tela') || n.includes('ppt')) return <Monitor className="w-5 h-5" />;
    return <LayoutTemplate className="w-5 h-5" />;
  };

  return (
    <div className="glass-panel rounded-xl p-1 h-full flex flex-col shadow-2xl bg-[#0f0f13] border border-gray-800">
      {/* Label Strip */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700 flex justify-between items-center mb-1">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]"></div>
            <span className="text-gray-300 font-bold text-xs tracking-widest uppercase">Program Bus</span>
         </div>
         <span className="text-[9px] font-mono text-gray-500">{scenes.length} SOURCES</span>
      </div>
      
      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
            <span className="font-mono text-xs uppercase tracking-widest">No Signal</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2 overflow-y-auto custom-scroll content-start h-full">
            {scenes.map((scene) => {
            const isActive = currentScene === scene.name;
            return (
                <button
                key={scene.name}
                onClick={() => obsService.setCurrentScene(scene.name)}
                className={`
                    relative group overflow-hidden rounded text-left transition-all duration-75
                    flex flex-col justify-between min-h-[5rem] p-3
                    border-b-4 active:border-b-0 active:translate-y-1
                    ${isActive 
                        ? 'bg-gradient-to-b from-red-600 to-red-700 border-red-900 shadow-[0_0_25px_rgba(220,38,38,0.4)] z-10' 
                        : 'bg-gradient-to-b from-gray-700 to-gray-800 border-gray-950 hover:from-gray-600 hover:to-gray-700 hover:text-white text-gray-400'}
                `}
                >
                    {/* Top Gloss */}
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    {/* LED Indicator (Simulated) */}
                    <div className="flex justify-between items-start mb-1 relative z-10">
                        <span className={`text-[10px] font-mono font-bold opacity-60 uppercase ${isActive ? 'text-red-950' : 'text-black'}`}>
                            CAM {scene.index + 1}
                        </span>
                        <div className={`
                            w-3 h-1.5 rounded-sm transition-all duration-300
                            ${isActive ? 'bg-red-200 shadow-[0_0_8px_#fecaca]' : 'bg-black/50'}
                        `}></div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative z-10 mt-auto">
                        {getIcon(scene.name)}
                        <span className={`font-bold text-xs leading-none uppercase tracking-tight ${isActive ? 'text-white' : 'group-hover:text-gray-200'}`}>
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