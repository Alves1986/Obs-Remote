import React, { useState, useEffect, useRef } from 'react';
import { youtubeService, ChatMessage } from '../services/youtubeService';
import { obsService } from '../services/obsService'; // Import OBS Service
import { StreamStatus } from '../types'; // Import Types
import { Youtube, ThumbsUp, MessageSquare, Settings, RefreshCw, Eye, Activity, Clock, Monitor } from 'lucide-react';

export const YouTubePanel: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [videoId, setVideoId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  
  const [stats, setStats] = useState({ viewers: 0, likes: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // OBS Status for Tech Header
  const [obsStatus, setObsStatus] = useState<StreamStatus | null>(null);
  
  // Internals for polling
  const [chatId, setChatId] = useState<string | null>(null);
  const nextPageTokenRef = useRef<string>('');
  const intervalRef = useRef<any>(null);

  // Load Config
  useEffect(() => {
    const savedKey = localStorage.getItem('yt_api_key');
    const savedVideo = localStorage.getItem('yt_video_id');
    if (savedKey) setApiKey(savedKey);
    if (savedVideo) setVideoId(savedVideo);
    if (!savedKey || !savedVideo) setShowConfig(true);

    // Subscribe to OBS Status for tech info
    const handleStatus = (s: StreamStatus) => setObsStatus(s);
    obsService.on('status', handleStatus);
    return () => obsService.off('status', handleStatus);
  }, []);

  const saveConfig = () => {
    localStorage.setItem('yt_api_key', apiKey);
    localStorage.setItem('yt_video_id', videoId);
    setShowConfig(false);
    startPolling();
  };

  const startPolling = async () => {
    if (!apiKey || !videoId) return;
    setIsConnected(true);

    // Initial Fetch to get Chat ID
    const details = await youtubeService.getVideoDetails(videoId, apiKey);
    if (details) {
      setStats({ viewers: details.viewers, likes: details.likes });
      if (details.chatId) setChatId(details.chatId);
    }

    // Set Interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      // 1. Update Stats
      const updatedDetails = await youtubeService.getVideoDetails(videoId, apiKey);
      if (updatedDetails) {
        setStats({ viewers: updatedDetails.viewers, likes: updatedDetails.likes });
      }

      // 2. Update Chat (if we have ID)
      if (chatId || updatedDetails?.chatId) {
        const cid = chatId || updatedDetails!.chatId!;
        if (!chatId) setChatId(cid);

        const chatData = await youtubeService.getChatMessages(cid, apiKey, nextPageTokenRef.current);
        if (chatData.messages.length > 0) {
          setMessages(prev => [...prev.slice(-40), ...chatData.messages]);
          nextPageTokenRef.current = chatData.nextPageToken;
        }
      }
    }, 10000); // Poll every 10s to be safe with quota
  };

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsConnected(false);
  };

  if (showConfig) {
    return (
      <div className="glass-panel rounded-xl p-4 shadow-lg border border-gray-800 bg-[#13151a] flex flex-col h-[300px]">
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
           <h3 className="text-gray-200 font-bold text-xs uppercase flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" /> Configuração YouTube
           </h3>
           <button onClick={() => setShowConfig(false)} className="text-xs text-gray-500 hover:text-white">Voltar</button>
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">YouTube Data API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-red-500 outline-none"
              placeholder="AIzaSy..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Video ID (da URL)</label>
            <input 
              type="text" 
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-red-500 outline-none"
              placeholder="Ex: dQw4w9WgXcQ"
            />
          </div>
          <div className="bg-red-950/20 p-2 rounded border border-red-900/30 text-[9px] text-gray-400 leading-tight">
             Necessário criar um projeto no Google Cloud Console e ativar a "YouTube Data API v3".
          </div>
        </div>
        <button onClick={saveConfig} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs">
          Salvar & Conectar
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl flex flex-col h-[300px] shadow-lg border border-gray-800 bg-[#13151a] overflow-hidden">
      {/* 1. Header with YouTube Controls */}
      <div className="bg-gray-900/50 px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Live Stats</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={isConnected ? stopPolling : startPolling}
                className={`p-1 rounded transition-colors ${isConnected ? 'text-green-500 hover:text-red-400' : 'text-gray-600 hover:text-white'}`}
                title={isConnected ? "Parar Monitoramento" : "Iniciar"}
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isConnected ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </button>
            <button onClick={() => setShowConfig(true)} className="p-1 text-gray-600 hover:text-white">
                <Settings className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      {/* 2. Stream Health & Info (Tech Layer) */}
      <div className="bg-black/30 px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" title="Tempo de Live (OBS)">
                  <Clock className={`w-3 h-3 ${obsStatus?.streaming ? 'text-red-500' : 'text-gray-600'}`} />
                  <span className={obsStatus?.streaming ? 'text-red-100 font-bold' : ''}>
                      {obsStatus?.streamTimecode?.split('.')[0] || '00:00:00'}
                  </span>
              </div>
              <div className="flex items-center gap-1.5 hidden md:flex" title="Resolução de Saída">
                  <Monitor className="w-3 h-3 text-brand-500" />
                  <span>{obsStatus?.outputResolution || '---x---'}</span>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5" title="Taxa de Bits de Upload">
                  <Activity className={`w-3 h-3 ${obsStatus && obsStatus.bitrate > 0 ? 'text-green-500' : 'text-gray-600'}`} />
                  <span>{obsStatus ? ((obsStatus.bitrate || 0) / 1000).toFixed(0) : '0'} kbps</span>
              </div>
              <div className="bg-gray-800 px-1.5 rounded text-gray-300 font-bold" title="FPS Atual">
                  {(obsStatus?.fps || 0).toFixed(0)} FPS
              </div>
          </div>
      </div>

      {/* 3. YouTube Stats Row */}
      <div className="grid grid-cols-2 gap-px bg-gray-800 border-b border-gray-800">
          <div className="bg-[#0b0f19] p-2 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                  <Eye className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Ao Vivo</span>
              </div>
              <span className="text-lg font-black text-white leading-none">{stats.viewers}</span>
          </div>
          <div className="bg-[#0b0f19] p-2 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                  <ThumbsUp className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Likes</span>
              </div>
              <span className="text-lg font-black text-white leading-none">{stats.likes}</span>
          </div>
      </div>

      {/* 4. Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#0f1115]">
          <div className="px-2 py-1 bg-gray-900/80 border-b border-gray-800 text-[9px] uppercase font-bold text-gray-500 flex items-center gap-1">
             <MessageSquare className="w-3 h-3" /> Últimas Mensagens
          </div>
          <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2 flex flex-col-reverse">
             {messages.length === 0 && (
                 <div className="text-center text-gray-600 text-[10px] italic py-4">Aguardando chat...</div>
             )}
             {/* Show latest at bottom logic is handled by flex-col-reverse on container, but map order is normal */}
             {[...messages].reverse().map(msg => (
                 <div key={msg.id} className="text-xs break-words">
                     <span className="font-bold text-gray-400 mr-1.5">{msg.author}:</span>
                     <span className="text-gray-200">{msg.message}</span>
                 </div>
             ))}
          </div>
      </div>
    </div>
  );
};