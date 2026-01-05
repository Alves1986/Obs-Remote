import React from 'react';
import { obsService } from '../services/obsService';
import { TransitionState } from '../types';
import { Scissors, Activity, Timer } from 'lucide-react';

interface Props {
  transition: TransitionState;
  isConnected: boolean;
}

export const TransitionPanel: React.FC<Props> = ({ transition, isConnected }) => {
  
  const handleTransitionChange = (name: string) => {
      obsService.setTransition(name);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      obsService.setTransitionDuration(parseInt(e.target.value));
  };

  const btnClass = (active: boolean) => `
    flex-1 py-3 px-2 rounded font-bold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all border-b-2
    ${active 
        ? 'bg-brand-600 text-white border-brand-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
        : 'bg-gray-800 text-gray-400 border-gray-900 hover:bg-gray-700 hover:text-gray-200'}
  `;

  return (
    <div className="glass-panel rounded-xl p-3 shadow-lg border border-gray-800 bg-[#13151a]">
        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                 <Activity className="w-3 h-3" /> Transition Style
             </span>
             <span className="text-[10px] font-mono text-brand-400">{transition.duration}ms</span>
        </div>

        <div className="flex gap-2 mb-4">
            <button 
                onClick={() => handleTransitionChange('Cut')}
                disabled={!isConnected}
                className={btnClass(transition.currentTransition === 'Cut')}
            >
                <Scissors className="w-4 h-4" />
                CUT
            </button>
            <button 
                onClick={() => handleTransitionChange('Fade')}
                disabled={!isConnected}
                className={btnClass(transition.currentTransition === 'Fade')}
            >
                <Activity className="w-4 h-4" />
                FADE
            </button>
        </div>

        <div className="px-1">
            <div className="flex justify-between text-[9px] text-gray-500 font-mono mb-1">
                <span>0ms</span>
                <span>DURATION</span>
                <span>2000ms</span>
            </div>
            <input 
                type="range" 
                min="0" 
                max="2000" 
                step="50"
                value={transition.duration}
                onChange={handleDurationChange}
                disabled={!isConnected}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
        </div>
    </div>
  );
};