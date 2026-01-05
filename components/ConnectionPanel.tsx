import React, { useState, useEffect } from 'react';
import { ConnectionState, ConnectionPreset } from '../types';
import { obsService } from '../services/obsService';
import { supabase } from '../services/supabaseClient';
import { Plug, Loader2, Check, X, Server, Lock, Save, Trash2, History, Cloud, QrCode, AlertTriangle } from 'lucide-react';
import { QRScanner } from './QRScanner';

interface Props {
  connectionState: ConnectionState;
}

export const ConnectionPanel: React.FC<Props> = ({ connectionState }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [presetName, setPresetName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [presets, setPresets] = useState<ConnectionPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Load Presets & Realtime Subscription
  useEffect(() => {
    const load = async () => {
      setIsLoadingPresets(true);
      const data = await obsService.fetchPresets();
      setPresets(data);
      setIsLoadingPresets(false);
    };
    load();

    const channel = supabase
      .channel('presets_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connection_presets' },
        (payload) => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConnect = () => {
    // Basic validation
    let cleanHost = host.trim();
    if (!cleanHost) {
        alert("Por favor, insira o endereço IP.");
        return;
    }
    // If user types 192.168.1.5:4455 in host field, handle it
    if (cleanHost.includes(':') && !cleanHost.includes('http')) {
        const parts = cleanHost.split(':');
        cleanHost = parts[0];
        setHost(cleanHost);
        setPort(parts[1]);
        obsService.connect(cleanHost, parts[1], password);
    } else {
        obsService.connect(cleanHost, port, password);
    }
  };

  const handleSavePreset = async () => {
      if(!presetName) return;
      const newPreset = { name: presetName, host, port, password };
      setIsLoadingPresets(true);
      await obsService.addPreset(newPreset);
      setPresetName('');
      setIsLoadingPresets(false);
  };

  const handleLoadPreset = (p: ConnectionPreset) => {
      setHost(p.host);
      setPort(p.port);
      if(p.password) setPassword(p.password);
      setShowPresets(false);
  };

  const handleDeletePreset = async (e: React.MouseEvent, id?: number) => {
      e.stopPropagation();
      if (!id) return;
      await obsService.removePreset(id);
  };

  // Improved QR Parsing Logic
  const handleScanData = (data: string) => {
    console.log('Dados crus do QR:', data);
    
    let parsedHost = '';
    let parsedPort = '4455';
    let parsedPass = '';
    let success = false;

    try {
        // 1. Try standard JSON (obs-websocket-v5 format)
        if (data.trim().startsWith('{')) {
            const json = JSON.parse(data);
            // Support various naming conventions found in different generators
            parsedHost = json.host || json.address || json.ip || '';
            parsedPort = String(json.port || '4455');
            parsedPass = json.password || json.pass || '';
            
            if (parsedHost) success = true;
        } 
        
        // 2. Try URL format (obs:// or ws://)
        if (!success && (data.includes('://') || data.includes('@'))) {
            // Remove protocol
            let clean = data.replace('obs://', '').replace('ws://', '').replace('wss://', '');
            
            // Format: password@host:port
            if (clean.includes('@')) {
                const parts = clean.split('@');
                parsedPass = parts[0];
                clean = parts[1]; // remainder is host:port
            }
            
            // Format: host:port
            if (clean.includes(':')) {
                const parts = clean.split(':');
                parsedHost = parts[0];
                parsedPort = parts[1].split('/')[0]; // remove trailing slash
            } else {
                parsedHost = clean.split('/')[0];
            }
            
            if (parsedHost) success = true;
        }

        // 3. Try Raw format (IP:PORT or just IP)
        if (!success) {
            const clean = data.trim();
            // Regex for IP address (basic)
            if (clean.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
                if (clean.includes(':')) {
                    const parts = clean.split(':');
                    parsedHost = parts[0];
                    parsedPort = parts[1];
                } else {
                    parsedHost = clean;
                }
                success = true;
            }
        }

        if (success) {
            // Remove "localhost" if scanned on mobile, force user to verify
            if (parsedHost.includes('localhost') || parsedHost.includes('127.0.0.1')) {
                alert("Atenção: QR Code contém 'localhost'. No celular, você precisa do IP da rede (ex: 192.168...).");
            }
            
            setHost(parsedHost);
            setPort(parsedPort);
            setPassword(parsedPass);
            setShowScanner(false);
            
            // Auto connect attempt
            // setTimeout(() => obsService.connect(parsedHost, parsedPort, parsedPass), 500);
        } else {
            alert(`Formato inválido: ${data.substring(0, 20)}...`);
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao processar dados do QR Code.");
    }
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
    <>
      {showScanner && (
        <QRScanner 
            onScan={handleScanData} 
            onClose={() => setShowScanner(false)} 
        />
      )}
      
      <div className="glass-panel rounded-xl p-5 shadow-lg relative overflow-hidden transition-all">
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
            
            {/* Mobile IP Warning */}
            <div className="md:hidden bg-blue-900/20 border border-blue-800/50 p-2 rounded flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-200 leading-tight">
                    No celular, não use <b>localhost</b>. Use o IP do PC (ex: <b>192.168.0.x</b>).
                </p>
            </div>

            {/* Preset Toggle */}
            <button 
              onClick={() => setShowPresets(!showPresets)}
              className="w-full text-xs flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded border border-gray-700 text-gray-300 transition-colors"
            >
                <span className="flex items-center gap-2">
                  <Cloud className={`w-3 h-3 ${isLoadingPresets ? 'animate-pulse text-brand-500' : ''}`} /> 
                  Conexões Salvas
                </span>
                <span>{showPresets ? '▲' : '▼'}</span>
            </button>

            {showPresets && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg max-h-32 overflow-y-auto custom-scroll relative">
                    {isLoadingPresets && presets.length === 0 && (
                        <div className="text-center py-2 text-xs text-gray-500">Carregando...</div>
                    )}
                    {presets.map(p => (
                        <div key={p.id || p.name} onClick={() => handleLoadPreset(p)} className="px-3 py-2 hover:bg-gray-800 cursor-pointer flex justify-between items-center group border-b border-gray-800 last:border-0">
                            <span className="text-xs font-bold text-gray-300">{p.name}</span>
                            {p.id && (
                                <button onClick={(e) => handleDeletePreset(e, p.id)} className="text-gray-600 hover:text-red-400">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {!isLoadingPresets && presets.length === 0 && (
                        <div className="text-center py-2 text-xs text-gray-500">Nenhum preset salvo</div>
                    )}
                </div>
            )}

            {/* Scan QR Button */}
            <button 
                onClick={() => setShowScanner(true)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors group"
            >
                <QrCode className="w-4 h-4 text-brand-500 group-hover:text-brand-400" />
                Ler QR Code
            </button>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block ml-1">IP Address</label>
                <div className="relative">
                    <input 
                      type="text" 
                      value={host} 
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full bg-gray-900/80 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-600"
                      placeholder="Ex: 192.168.0.10"
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
                      className="w-full bg-gray-900/80 border border-gray-700 text-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-600"
                      placeholder="Senha do Websocket"
                    />
              </div>
            </div>

            {/* Quick Save */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Nome (ex: Igreja)..."
                    className="bg-gray-900/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 flex-1 focus:border-brand-500 outline-none"
                />
                <button onClick={handleSavePreset} disabled={!presetName || isLoadingPresets} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 rounded border border-gray-700 disabled:opacity-50">
                    {isLoadingPresets ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                </button>
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
                    Falha na conexão. <br/>
                    1. Verifique se o OBS e Websocket 5.x estão ativos.<br/>
                    2. Se estiver no celular, verifique se o IP está correto (não use localhost).
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
    </>
  );
};