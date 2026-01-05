import React, { useState } from 'react';
import { ConnectionState } from '../types';
import { obsService } from '../services/obsService';
import { Plug, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  connectionState: ConnectionState;
}

export const ConnectionPanel: React.FC<Props> = ({ connectionState }) => {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');

  const handleConnect = () => {
    obsService.connect(host, port, password);
  };

  const handleDisconnect = () => {
    obsService.disconnect();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 font-semibold flex items-center gap-2">
          <Plug className="w-4 h-4" /> Conexão OBS
        </h3>
        {connectionState === ConnectionState.CONNECTED && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="w-3 h-3" /> Conectado
          </span>
        )}
      </div>

      {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Host</label>
              <input 
                type="text" 
                value={host} 
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Porta</label>
              <input 
                type="text" 
                value={port} 
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
             <label className="text-xs text-gray-500 block mb-1">Senha (Opcional)</label>
             <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
          </div>
          <button 
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors"
          >
            Conectar
          </button>
        </div>
      ) : connectionState === ConnectionState.CONNECTING ? (
        <div className="py-6 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
          <span className="text-sm">Conectando...</span>
        </div>
      ) : (
        <div className="space-y-2">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700 text-xs text-gray-400 font-mono">
                ws://{host}:{port}
            </div>
            <button 
                onClick={handleDisconnect}
                className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 py-2 rounded text-sm transition-colors"
            >
                Desconectar
            </button>
        </div>
      )}
    </div>
  );
};