import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AudioSource } from '../types';
import { obsService } from '../services/obsService';
import { Volume2, VolumeX, Mic, Music } from 'lucide-react';

interface Props {
  sources: AudioSource[];
  isConnected: boolean;
}

// Mini component for the audio meter visualization using D3
const AudioMeter: React.FC<{ volume: number, muted: boolean }> = ({ volume, muted }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 12;
        const height = 100;
        const segments = 15;
        const segmentHeight = height / segments;

        // Draw background segments
        for (let i = 0; i < segments; i++) {
            svg.append('rect')
                .attr('x', 0)
                .attr('y', height - (i + 1) * segmentHeight + 1)
                .attr('width', width)
                .attr('height', segmentHeight - 2)
                .attr('fill', '#374151') // gray-700
                .attr('rx', 2);
        }

        if (!muted) {
            // Calculate filled segments based on volume
            // We simulate some noise if volume > 0 for realism
            const activeSegments = Math.floor(volume * segments);
            
            for (let i = 0; i < activeSegments; i++) {
                let color = '#22c55e'; // green
                if (i > segments * 0.7) color = '#eab308'; // yellow
                if (i > segments * 0.9) color = '#ef4444'; // red

                svg.append('rect')
                    .attr('x', 0)
                    .attr('y', height - (i + 1) * segmentHeight + 1)
                    .attr('width', width)
                    .attr('height', segmentHeight - 2)
                    .attr('fill', color)
                    .attr('rx', 2)
                    .attr('class', 'transition-all duration-75'); // Smooth transition
            }
        }

    }, [volume, muted]);

    return <svg ref={svgRef} width={12} height={100} className="rounded" />;
};

export const AudioMixer: React.FC<Props> = ({ sources, isConnected }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 font-semibold flex items-center gap-2">
            <Volume2 className="w-4 h-4" /> Mixer de Áudio
        </h3>
        <span className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-500 font-mono">AUTO-MIX</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-2">
            {sources.map((source) => (
                <div key={source.name} className="flex flex-col items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 w-24">
                    {/* Meter & Fader */}
                    <div className="flex flex-1 gap-3 h-48 mb-3">
                        <div className="py-2">
                            <AudioMeter volume={source.volume} muted={source.muted} />
                        </div>
                        <div className="relative w-8 bg-gray-800 rounded-full flex justify-center py-2">
                             <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={source.volume}
                                disabled={!isConnected}
                                onChange={(e) => obsService.setAudioVolume(source.name, parseFloat(e.target.value))}
                                className="absolute h-full w-full opacity-0 cursor-pointer z-10"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center center', width: '12rem', height: '2rem', top: '5rem', left: '-5rem' }} 
                            />
                            {/* Visual Slider Thumb Track */}
                            <div className="absolute bottom-0 w-2 bg-gray-700 rounded-full h-full pointer-events-none">
                                <div 
                                    className={`absolute bottom-0 left-[-4px] w-4 h-4 rounded-full border-2 shadow-sm transition-all duration-75
                                        ${source.muted ? 'bg-gray-600 border-gray-500' : 'bg-blue-500 border-white'}
                                    `}
                                    style={{ bottom: `${source.volume * 88}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full text-center space-y-2">
                        <button
                            onClick={() => obsService.setAudioMute(source.name, !source.muted)}
                            className={`
                                w-full py-1 rounded text-xs font-bold transition-colors
                                ${source.muted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}
                            `}
                        >
                            {source.muted ? <VolumeX className="w-4 h-4 mx-auto" /> : <Volume2 className="w-4 h-4 mx-auto" />}
                        </button>
                        <p className="text-xs text-gray-400 font-medium truncate w-full" title={source.name}>
                            {source.name.replace('Blackmagic', 'BM').replace('Mesa de Som', 'Mesa')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Quick Audio Presets */}
      <div className="mt-4 grid grid-cols-3 gap-2">
          {['worship', 'sermon', 'service'].map((p) => (
             <button
                key={p}
                onClick={() => obsService.applyAudioPreset(p as any)}
                className="bg-gray-700 hover:bg-gray-600 text-xs py-2 rounded text-gray-300 border border-gray-600 transition-colors uppercase font-bold"
             >
                 {p === 'worship' ? 'Louvor' : p === 'sermon' ? 'Pregação' : 'Padrão'}
             </button>
          ))}
      </div>
    </div>
  );
};