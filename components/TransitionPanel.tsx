import React from 'react';
import { obsService } from '../services/obsService';
import { TransitionState } from '../types';
import { Scissors, Activity, Layers, Play, Columns, Square } from 'lucide-react';

interface Props {
  transition: TransitionState;
  studioMode: boolean; // Received from App
  isConnected: boolean;
}

export const TransitionPanel: React.FC<Props> = ({ transition, studioMode, isConnected }) => {
  
  const handleTransitionChange = (name: string) => {
      obsService.setTransition(name);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      obsService.setTransitionDuration(parseInt(e.target.value));
  };

  const btnClass = (active: boolean) => `
    flex-1 py-3 px-2 rounded font-bold text-[10px] uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all border-b-2 whitespace-nowrap overflow-hidden
    ${active 
        ? 'bg-brand-600 text-white border-brand-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
        : 'bg-gray-800 text-gray-400 border-gray-900 hover:bg-gray-700 hover:text-gray-200'}
  `;

  // Get first 2 transitions or defaults
  const transitionsToShow = transition.availableTransitions.length > 0 
      ? transition.availableTransitions.slice(0, 3) 
      : ['Cut', 'Fade'];

  return (
    <div className="glass-panel rounded-xl p-3 shadow-lg border border-gray-800 bg-[#13151a]">
        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                 <Activity className="w-3 h-3" /> Mix Engine
             </span>
             {/* Studio Mode Toggle */}
             <div className="flex items-center gap-2">
                 <span className="text-[9px] font-mono text-gray-500 uppercase">Studio Mode</span>
                 <button 
                    onClick={() => obsService.setStudioMode(!studioMode)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${studioMode ? 'bg-brand-500' : 'bg-gray-700'}`}
                 >
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${studioMode ? 'left-5' : 'left-0.5'}`}></div>
                 </button>
             </div>
        </div>

        <div className="flex gap-2 mb-3">
            {transitionsToShow.map(tName => (
                <button 
                    key={tName}
                    onClick={() => handleTransitionChange(tName)}
                    disabled={!isConnected}
                    className={btnClass(transition.currentTransition === tName)}
                    title={tName}
                >
                    {tName.includes('Cut') || tName.includes('Corte') ? <Scissors className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                    {tName.slice(0, 8)}
                </button>
            ))}
        </div>
        
        {/* Trigger Bar (Changes behavior based on Studio Mode) */}
        <button 
            onClick={() => studioMode ? obsService.triggerTransition() : null}
            disabled={!studioMode}
            className={`w-full font-bold uppercase text-xs py-2 rounded mb-3 flex items-center justify-center gap-2 border-b-4 transition-all
                ${studioMode 
                    ? 'bg-gray-700 hover:bg-gray-600 active:bg-white text-gray-200 active:text-black border-gray-900 active:border-b-0 active:translate-y-1' 
                    : 'bg-gray-800 text-gray-600 border-gray-950 cursor-not-allowed opacity-50'}
            `}
        >
            {studioMode ? (
                <>
                    <Play className="w-3 h-3 fill-current" />
                    TRANSITION (AUTO)
                </>
            ) : (
                <>
                    <Scissors className="w-3 h-3" />
                    DIRECT CUT MODE (CLICK SCENE)
                </>
            )}
        </button>

        <div className="px-1 flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500 min-w-[30px]">{transition.duration}ms</span>
            <input 
                type="range" 
                min="0" 
                max="2000" 
                step="50"
                value={transition.duration}
                onChange={handleDurationChange}
                disabled={!isConnected}
                className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
        </div>
    </div>
  );
};