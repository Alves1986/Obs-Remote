import React, { useState } from 'react';
import { ConnectionState } from '../types';
import { obsService } from '../services/obsService';
import { Plug, Loader2, Check, X, Server, Lock } from 'lucide-react';

interface Props {
  connectionState: ConnectionState;
}

export const ConnectionPanel: React.FC<Props> = ({ connectionState }) => {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleConnect = () => {
    obsService.connect(host, port, password);
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;

  if (isConnected && !isExpanded) {
      return (
          <div 
            onClick={() => setIsExpanded(true)}
            className="glass-panel p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors group"
          >
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="text-sm font-semibold text-gray-300 group-hover:text-white">Conectado ao OBS</span>
              </div>
              <Plug className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
          </div>
      )
  }

  return (
    <div className="glass-panel rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-gray-200 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-500" /> Configuração
        </h3>
        {isConnected && (
             <button 
                onClick={() => setIsExpanded(false)} 
                className="text-xs text-gray-500 hover:text-white transition-colors"
             >
                 Minimizar
             </button>
        )}
      </div>

      {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block ml-1">IP Address</label>
              <div className="relative">
                  <input 
                    type="text" 
                    value={host} 
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-700"
                    placeholder="localhost"
                  />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block ml-1">Port</label>
              <input 
                type="text" 
                value={port} 
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all text-center"
                placeholder="4455"
              />
            </div>
          </div>
          
          <div>
             <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block ml-1">Password</label>
             <div className="relative">
                 <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-600" />
                 <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-700 text-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-700"
                    placeholder="••••••••"
                  />
             </div>
          </div>

          <button 
            onClick={handleConnect}
            className="w-full bg-gradient-to-r from-brand-600 to-blue-700 hover:from-brand-500 hover:to-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Conectar OBS
            <Plug className="w-4 h-4" />
          </button>
          
          {connectionState === ConnectionState.ERROR && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 p-2 rounded text-center">
                  Falha na conexão. Verifique IP/Porta.
              </div>
          )}
        </div>
      ) : connectionState === ConnectionState.CONNECTING ? (
        <div className="py-8 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-3 text-brand-500" />
          <span className="text-xs font-mono uppercase tracking-widest">Estabelecendo Link...</span>
        </div>
      ) : (
        <div className="space-y-4">
            <div className="bg-green-950/20 border border-green-900/50 p-3 rounded-lg flex items-center gap-3">
                <div className="bg-green-500 p-1 rounded-full">
                    <Check className="w-3 h-3 text-black" />
                </div>
                <div>
                    <div className="text-xs text-green-400 font-bold uppercase">Sistema Online</div>
                    <div className="text-[10px] text-gray-500 font-mono">ws://{host}:{port}</div>
                </div>
            </div>
            
            <button 
                onClick={() => obsService.disconnect()}
                className="w-full bg-gray-800 hover:bg-red-950/50 hover:text-red-400 hover:border-red-900 border border-gray-700 text-gray-400 text-xs py-2 rounded transition-all"
            >
                Encerrar Sessão
            </button>
        </div>
      )}
    </div>
  );
};