import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AudioSource } from '../types';
import { obsService } from '../services/obsService';
import { Volume2, VolumeX, Sliders } from 'lucide-react';

interface Props {
  sources: AudioSource[];
  isConnected: boolean;
}

const AudioMeter: React.FC<{ volume: number, muted: boolean }> = ({ volume, muted }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 8;
        const height = 120;
        const segments = 30;
        const segmentHeight = (height - segments) / segments; // 1px gap

        // Dark background track
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#111827');

        if (!muted) {
            const activeSegments = Math.floor(volume * segments);
            
            for (let i = 0; i < segments; i++) {
                const isActive = i < activeSegments;
                if(!isActive) continue;

                let color = '#10b981'; // green
                if (i > segments * 0.7) color = '#fbbf24'; // yellow
                if (i > segments * 0.9) color = '#ef4444'; // red

                // Draw from bottom
                const y = height - ((i + 1) * (segmentHeight + 1));

                svg.append('rect')
                    .attr('x', 1)
                    .attr('y', y)
                    .attr('width', width - 2)
                    .attr('height', segmentHeight)
                    .attr('fill', color);
            }
        }
    }, [volume, muted]);

    return <svg ref={svgRef} width={8} height={120} className="rounded-sm bg-black border border-gray-800" />;
};

export const AudioMixer: React.FC<Props> = ({ sources, isConnected }) => {
  return (
    <div className="glass-panel rounded-xl p-4 h-full flex flex-col shadow-xl border border-gray-700 bg-[#1a1d24]">
      <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
        <h3 className="text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Sliders className="w-3 h-3 text-brand-500" /> Audio Console
        </h3>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      <div className="flex-1 overflow-x-auto pb-2 custom-scroll">
        <div className="flex gap-2 h-full min-w-max px-1">
            {sources.map((source) => (
                <div key={source.name} className="flex flex-col items-center bg-[#0b0d10] p-1.5 rounded border border-gray-800 w-[70px] relative shadow-inner">
                    
                    {/* Fader Area */}
                    <div className="flex flex-1 gap-2 h-full mb-2 w-full justify-center relative bg-[#15181e] rounded py-2 border border-gray-800/50">
                        <AudioMeter volume={source.volume} muted={source.muted} />

                        {/* Fader Track */}
                        <div className="relative w-6 h-[120px] bg-black rounded-full border border-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,1)] flex justify-center">
                            {/* Center Line */}
                            <div className="absolute top-2 bottom-2 w-[1px] bg-gray-800"></div>

                             <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={source.volume}
                                disabled={!isConnected}
                                onChange={(e) => obsService.setAudioVolume(source.name, parseFloat(e.target.value))}
                                className="absolute h-[120px] w-[120px] opacity-0 cursor-pointer z-20"
                                style={{ 
                                    transform: 'rotate(-90deg) translateY(-48px) translateX(-48px)', 
                                    transformOrigin: '50% 50%' 
                                }} 
                            />
                            
                            {/* Fader Cap - Realistic */}
                            <div 
                                className={`absolute w-8 h-5 rounded shadow-[0_2px_3px_rgba(0,0,0,0.8)] z-10 pointer-events-none transition-all duration-75 ease-out
                                    ${source.muted 
                                        ? 'bg-gray-700 border-t border-gray-600' 
                                        : 'bg-gradient-to-b from-gray-200 to-gray-400 border-t border-white'}
                                `}
                                style={{ 
                                    bottom: `calc(${source.volume * 100}% - 10px)`,
                                    left: '-5px'
                                }}
                            >
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/80"></div>
                            </div>
                        </div>
                    </div>

                    {/* Channel Controls */}
                    <div className="w-full text-center space-y-1 mt-auto">
                        <p className="text-[9px] text-gray-500 font-mono font-bold truncate w-full uppercase" title={source.name}>
                            {source.name.slice(0, 8)}
                        </p>
                        
                        {/* Mute Button - Soft Key Style */}
                        <button
                            onClick={() => obsService.setAudioMute(source.name, !source.muted)}
                            className={`
                                w-full py-2 rounded-[4px] text-[9px] font-black uppercase tracking-wider transition-all border-b-2 active:border-b-0 active:translate-y-[2px] shadow-sm
                                ${source.muted 
                                    ? 'bg-red-600 border-red-900 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                                    : 'bg-gray-700 border-black text-gray-400 hover:bg-gray-600'}
                            `}
                        >
                            ON
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-gray-700">
           {['worship', 'sermon', 'service'].map((p) => (
                <button
                    key={p}
                    onClick={() => obsService.applyAudioPreset(p as any)}
                    className="bg-gray-800 hover:bg-gray-700 text-[8px] py-1.5 rounded border border-gray-600 text-gray-300 uppercase font-bold"
                >
                    {p.substring(0,6)}
                </button>
            ))}
      </div>
    </div>
  );
};