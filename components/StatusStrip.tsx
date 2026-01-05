import React from 'react';
import { StreamStatus, ConnectionState } from '../types';
import { Activity, Radio, Cpu, WifiOff, Wifi } from 'lucide-react';

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
      <div className="w-full h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 select-none">
        <div className="flex items-center gap-2 text-gray-500">
           <WifiOff className="w-5 h-5" />
           <span className="font-bold tracking-wider">DESCONECTADO - AGUARDANDO OBS</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-auto min-h-[4rem] bg-gray-900 border-b border-gray-800 flex flex-col md:flex-row items-center justify-between px-4 py-2 gap-4 shadow-lg z-50">
      
      {/* Left: Status Badges */}
      <div className="flex items-center gap-4 flex-1">
        <div className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-all duration-300 ${isLive ? 'bg-red-600 text-white animate-pulse-fast shadow-[0_0_15px_rgba(220,38,38,0.7)]' : 'bg-gray-800 text-gray-500'}`}>
          <Radio className="w-5 h-5" />
          <span>{isLive ? 'AO VIVO' : 'OFFLINE'}</span>
          {isLive && <span className="ml-2 font-mono text-sm font-normal opacity-90">{status.streamTimecode}</span>}
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-colors ${isRec ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
          <Activity className="w-5 h-5" />
          <span>{isRec ? 'GRAVANDO' : 'PARADO'}</span>
        </div>
      </div>

      {/* Center: Current Scene */}
      <div className="flex flex-col items-center justify-center flex-1">
        <span className="text-xs text-gray-400 uppercase tracking-widest">Cena Atual</span>
        <h2 className="text-xl md:text-2xl font-black text-blue-400 truncate max-w-[300px]">{currentScene}</h2>
      </div>

      {/* Right: Technical Stats */}
      <div className="flex items-center gap-6 flex-1 justify-end text-sm text-gray-400 font-mono">
         <div className="flex items-center gap-2" title="Bitrate de saída">
            <Wifi className={`w-4 h-4 ${status.bitrate > 4000 ? 'text-green-500' : 'text-yellow-500'}`} />
            <span>{(status.bitrate / 1000).toFixed(1)} Mb/s</span>
         </div>
         <div className="flex items-center gap-2" title="Uso de CPU">
            <Cpu className="w-4 h-4" />
            <span>{status.cpuUsage.toFixed(1)}%</span>
         </div>
      </div>
    </div>
  );
};