import React from 'react';
import { StreamStatus, ConnectionState } from '../types';
import { Activity, Radio, Cpu, WifiOff, Wifi, Cast, Monitor, Film } from 'lucide-react';

interface Props {
  status: StreamStatus;
  connectionState: ConnectionState;
  currentScene: string;
}

export const StatusStrip: React.FC<Props> = ({ status, connectionState, currentScene }) => {
  const isLive = status.streaming;
  const isRec = status.recording;

  if (connectionState !== ConnectionState.CONNECTED) {
    return (
      <div className="w-full h-14 bg-red-950/20 border-b border-red-900/30 backdrop-blur flex items-center justify-center select-none">
        <div className="flex items-center gap-2 text-red-400 animate-pulse">
           <WifiOff className="w-5 h-5" />
           <span className="font-bold tracking-widest text-sm">SISTEMA DESCONECTADO</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-14 md:h-16 glass-panel border-b-0 border-b-gray-800 flex flex-row items-center justify-between px-3 md:px-6 gap-2 md:gap-6 z-50 shadow-2xl relative">
      {/* Background Decor */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-50"></div>

      {/* Left: Tally Lights */}
      <div className="flex items-center gap-2 md:gap-3 flex-none md:min-w-[280px]">
        {/* ON AIR TALLY */}
        <div className={`
            relative overflow-hidden flex items-center gap-2 md:gap-3 px-3 md:px-5 py-1.5 md:py-2 rounded border transition-all duration-500
            ${isLive 
                ? 'bg-red-950/40 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                : 'bg-gray-900/50 border-gray-700/50 text-gray-600 grayscale'}
        `}>
            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isLive ? 'bg-red-500 animate-tally' : 'bg-gray-700'}`}></div>
            <div className="flex flex-col leading-none">
                <span className="font-black text-xs md:text-sm tracking-tighter">ON AIR</span>
                <span className="font-mono text-[9px] md:text-[10px] opacity-70 tracking-widest inline-block min-w-[50px]">
                    {isLive ? status.streamTimecode.split('.')[0] : '--:--:--'}
                </span>
            </div>
        </div>

        {/* REC TALLY */}
        <div className={`
            flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded border transition-all duration-300
            ${isRec 
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'bg-gray-900/50 border-gray-700/50 text-gray-700'}
        `}>
            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${isRec ? 'bg-amber-500 animate-pulse' : 'bg-current'}`}></div>
        </div>
      </div>

      {/* Center: Program Monitor Look */}
      <div className="flex-1 flex flex-col items-center justify-center relative group cursor-default min-w-0 px-2">
        <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="text-[8px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-0.5 hidden sm:block">Program Feed</span>
        <h2 className="text-sm md:text-2xl font-black text-white tracking-tight truncate w-full text-center drop-shadow-md">
            {currentScene || "OFFLINE"}
        </h2>
      </div>

      {/* Right: Technical Telemetry (Desktop) & Branding (Mobile) */}
      <div className="flex items-center justify-end flex-none md:min-w-[280px]">
         {/* Mobile Branding */}
         <div className="md:hidden flex items-center gap-1.5 opacity-50">
             <Cast className="w-3 h-3 text-brand-500" />
             <span className="text-[10px] font-black text-gray-400 tracking-tighter">OBS PRO</span>
         </div>

         {/* Desktop Telemetry */}
         <div className="hidden md:flex items-center gap-4 lg:gap-6 text-xs font-mono text-gray-400">
             
             {/* Format Info (Res/FPS) */}
             <div className="flex flex-col items-end group">
                <div className="flex items-center gap-1.5 mb-1">
                    <Film className="w-3 h-3 text-purple-400" />
                    <span className="group-hover:text-white transition-colors">Output</span>
                </div>
                <span className="bg-gray-900 px-2 py-0.5 rounded text-gray-300 border border-gray-800 flex gap-1">
                    <span>{status.outputResolution}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-brand-400">{status.fps.toFixed(0)}fps</span>
                </span>
             </div>

             {/* Network / Bitrate */}
             <div className="flex flex-col items-end group">
                <div className="flex items-center gap-1.5 mb-1">
                    <Wifi className={`w-3 h-3 ${status.bitrate > 3000 ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="group-hover:text-white transition-colors">Bitrate</span>
                </div>
                <span className="bg-gray-900 px-2 py-0.5 rounded text-gray-300 border border-gray-800">
                    {(status.bitrate / 1000).toFixed(1)} <span className="text-gray-600">Mbps</span>
                </span>
             </div>

             {/* CPU */}
             <div className="flex flex-col items-end group">
                <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className={`w-3 h-3 ${status.cpuUsage > 80 ? 'text-red-500' : 'text-blue-500'}`} />
                    <span className="group-hover:text-white transition-colors">Load</span>
                </div>
                 <span className="bg-gray-900 px-2 py-0.5 rounded text-gray-300 border border-gray-800">
                    {status.cpuUsage.toFixed(1)}<span className="text-gray-600">%</span>
                </span>
             </div>
         </div>
      </div>
    </div>
  );
};