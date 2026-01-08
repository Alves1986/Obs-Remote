import React, { useEffect, useState } from 'react';
import { obsService } from './services/obsService';
import { StatusStrip } from './components/StatusStrip';
import { ConnectionPanel } from './components/ConnectionPanel';
import { MacroControls } from './components/MacroControls';
import { SceneGrid } from './components/SceneGrid';
import { AudioMixer } from './components/AudioMixer';
import { Logger } from './components/Logger';
import { TransitionPanel } from './components/TransitionPanel';
import { QuickTitler } from './components/QuickTitler';
import { YouTubePanel } from './components/YouTubePanel';
import { ProgramMonitor } from './components/ProgramMonitor'; // New Component
import { ConnectionState, ObsScene, AudioSource, StreamStatus, LogEntry, TransitionState } from './types';
import { LayoutGrid, Sliders, Settings2, Cast, Type, MessageCircle, Loader2, WifiOff, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  // CRITICAL FIX: Initialize ALL fields of StreamStatus to avoid 'undefined' crashes in child components
  const [status, setStatus] = useState<StreamStatus>({
    streaming: false,
    recording: false,
    streamTimecode: '00:00:00',
    recTimecode: '00:00:00',
    cpuUsage: 0,
    memoryUsage: 0,
    bitrate: 0,
    fps: 0,
    outputResolution: '---'
  });
  const [scenes, setScenes] = useState<ObsScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string>('');
  const [previewScene, setPreviewScene] = useState<string>('');
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transition, setTransition] = useState<TransitionState>({ currentTransition: 'Fade', duration: 300, availableTransitions: [] });
  
  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<'scenes' | 'audio' | 'gfx' | 'social' | 'system'>('scenes');

  // --- Wake Lock Logic (Prevent Sleep) ---
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      // Feature detection
      if ('wakeLock' in navigator) {
        try {
          // @ts-ignore - TS might not fully know 'screen' depending on lib version
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock active');
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
             console.warn('Wake Lock request waiting for user gesture.');
          } else if (err.message && (err.message.includes('policy') || err.message.includes('denied'))) {
             console.warn('Wake Lock disallowed by environment. Feature disabled.');
             return; 
          } else {
             console.error('Wake Lock Error:', err);
          }
        }
      }
    };

    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        requestWakeLock();
      }
    };
    const handleInteraction = () => {
        if (!wakeLock) {
            requestWakeLock();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const handleConnection = (s: ConnectionState) => setConnectionState(s);
    const handleStatus = (s: StreamStatus) => setStatus(s);
    const handleScenes = (s: ObsScene[]) => setScenes(s);
    const handleCurrentScene = (s: string) => setCurrentScene(s);
    const handlePreviewScene = (s: string) => setPreviewScene(s);
    const handleAudio = (s: AudioSource[]) => setAudioSources(s);
    const handleLog = (l: LogEntry) => setLogs(prev => [...prev.slice(-49), l]);
    const handleTransition = (t: TransitionState) => setTransition(t);

    obsService.on('connectionState', handleConnection);
    obsService.on('status', handleStatus);
    obsService.on('scenes', handleScenes);
    obsService.on('currentScene', handleCurrentScene);
    obsService.on('previewScene', handlePreviewScene);
    obsService.on('audioSources', handleAudio);
    obsService.on('log', handleLog);
    obsService.on('transition', handleTransition);

    return () => {
      obsService.off('connectionState', handleConnection);
      obsService.off('status', handleStatus);
      obsService.off('scenes', handleScenes);
      obsService.off('currentScene', handleCurrentScene);
      obsService.off('previewScene', handlePreviewScene);
      obsService.off('audioSources', handleAudio);
      obsService.off('log', handleLog);
      obsService.off('transition', handleTransition);
    };
  }, []);

  const MobileTabButton = ({ id, icon: Icon, label }: { id: typeof activeMobileTab, icon: any, label: string }) => (
    <button 
        onClick={() => setActiveMobileTab(id)}
        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeMobileTab === id ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <Icon className={`w-6 h-6 ${activeMobileTab === id ? 'fill-current' : ''}`} />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );

  // Logic: Show Dashboard if CONNECTED or RECONNECTING. Only show Login screen if totally disconnected/error.
  const isDashboardActive = connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.RECONNECTING;

  // --- VIEW 1: TELA DE LOGIN (INITIAL SCREEN) ---
  if (!isDashboardActive && connectionState !== ConnectionState.CONNECTING) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden relative selection:bg-brand-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900/40 via-gray-950 to-gray-950 z-0"></div>
          
          <div className="relative z-10 opacity-50 hover:opacity-100 transition-opacity">
             <StatusStrip status={status} connectionState={connectionState} currentScene={currentScene} />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
              <div className="w-full max-w-md flex flex-col gap-8 animate-[scan_0.5s_ease-out]">
                  <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-900 shadow-[0_0_40px_rgba(37,99,235,0.2)] mb-2 ring-1 ring-white/10">
                          <Cast className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">
                            OBS <span className="text-brand-500">CONTROL</span>
                        </h1>
                        <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em] mt-1">
                            Sistema de Produção Remota
                        </p>
                      </div>
                  </div>

                  <div className="backdrop-blur-xl">
                    <ConnectionPanel connectionState={connectionState} />
                  </div>
                  
                  <div className="text-center text-[10px] text-gray-700 font-mono">
                      v2.1 • Pro Edition • Secure Access
                  </div>
              </div>
          </div>
      </div>
    );
  }
  
  // Also handle initial CONNECTING state with a cleaner full-screen loader
  if (connectionState === ConnectionState.CONNECTING) {
      return (
          <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <span className="text-gray-400 font-mono text-sm uppercase tracking-widest animate-pulse">Conectando ao OBS...</span>
              <button onClick={() => obsService.disconnect()} className="text-xs text-red-500 hover:text-red-400 underline">Cancelar</button>
          </div>
      )
  }

  // --- VIEW 2: DASHBOARD (CONNECTED OR RECONNECTING) ---
  return (
    <div className="flex flex-col h-screen md:h-screen h-[100dvh] text-gray-100 font-sans selection:bg-blue-500/30 bg-gray-950 overflow-hidden relative">
      
      {/* RECONNECTION OVERLAY */}
      {connectionState === ConnectionState.RECONNECTING && (
          <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs text-center animate-in fade-in zoom-in duration-300">
                  <div className="relative">
                      <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                      <div className="bg-gray-800 p-3 rounded-full border border-gray-700 relative z-10">
                        <WifiOff className="w-8 h-8 text-red-500" />
                      </div>
                  </div>
                  <div>
                      <h3 className="text-white font-bold text-lg">Conexão Instável</h3>
                      <p className="text-gray-400 text-xs mt-1">O sistema perdeu a comunicação com o OBS. Tentando restaurar...</p>
                  </div>
                  <Loader2 className="w-6 h-6 text-brand-500 animate-spin mt-2" />
                  <button 
                    onClick={() => obsService.disconnect()} 
                    className="text-xs text-gray-500 hover:text-white underline mt-2"
                  >
                      Cancelar e Sair
                  </button>
              </div>
          </div>
      )}

      {/* 1. Universal Top Status Strip */}
      <div className="flex-none z-50">
          <StatusStrip 
            status={status} 
            connectionState={connectionState} 
            currentScene={currentScene} 
          />
      </div>

      {/* 2. DESKTOP & TABLET LAYOUT */}
      <div className="hidden md:block flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-full max-w-[1920px] mx-auto">
          
          {/* LEFT COLUMN: System (Only visible on Large Screens XL+) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col gap-6 overflow-hidden">
            <ConnectionPanel connectionState={connectionState} />
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 custom-scroll">
                 <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                 <div className="min-h-[300px]">
                    <YouTubePanel />
                 </div>
                 <Logger logs={logs} />
            </div>
          </div>

          {/* CENTER: Visuals */}
          <div className="col-span-12 md:col-span-7 xl:col-span-5 flex flex-col h-full overflow-hidden gap-4">
            
            {/* Live Video Monitor */}
            <div className="flex-none">
                <ProgramMonitor 
                    currentScene={currentScene} 
                    isConnected={connectionState === ConnectionState.CONNECTED} 
                />
            </div>

            <TransitionPanel 
                transition={transition} 
                isConnected={connectionState === ConnectionState.CONNECTED} 
            />
            <SceneGrid 
                scenes={scenes} 
                currentScene={currentScene} 
                previewScene={previewScene}
                isConnected={connectionState === ConnectionState.CONNECTED}
            />
          </div>

          {/* RIGHT: Audio & Graphics */}
          <div className="col-span-12 md:col-span-5 xl:col-span-4 flex flex-col gap-6 h-full overflow-y-auto custom-scroll pr-1">
             
             {/* Fallback for Medium Screens: Items from Left Col are moved here */}
             <div className="block xl:hidden space-y-4">
                <ConnectionPanel connectionState={connectionState} />
                <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                <div className="min-h-[300px]">
                   <YouTubePanel />
                </div>
             </div>

             <div className="h-[220px]">
                <QuickTitler isConnected={connectionState === ConnectionState.CONNECTED} />
             </div>

             <div className="flex-1 min-h-[350px] pb-4">
                <AudioMixer 
                    sources={audioSources} 
                    isConnected={connectionState === ConnectionState.CONNECTED}
                />
            </div>
          </div>
        
        </div>
      </div>

      {/* 3. MOBILE LAYOUT */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden relative bg-[#0b0f19]">
          <div className="flex-1 overflow-y-auto p-4 custom-scroll pb-24">
              {activeMobileTab === 'scenes' && (
                  <div className="flex flex-col gap-4 min-h-min">
                      {/* Live Monitor on Mobile Scenes tab */}
                      <ProgramMonitor 
                        currentScene={currentScene} 
                        isConnected={connectionState === ConnectionState.CONNECTED} 
                      />
                      
                      <TransitionPanel 
                          transition={transition} 
                          isConnected={connectionState === ConnectionState.CONNECTED} 
                      />
                      <div className="flex-1">
                        <SceneGrid 
                            scenes={scenes} 
                            currentScene={currentScene} 
                            previewScene={previewScene}
                            isConnected={connectionState === ConnectionState.CONNECTED}
                        />
                      </div>
                  </div>
              )}

              {activeMobileTab === 'audio' && (
                  <div className="h-full min-h-[400px]">
                      <AudioMixer 
                          sources={audioSources} 
                          isConnected={connectionState === ConnectionState.CONNECTED}
                      />
                  </div>
              )}

              {activeMobileTab === 'gfx' && (
                  <div className="h-full">
                      <QuickTitler isConnected={connectionState === ConnectionState.CONNECTED} />
                  </div>
              )}

              {activeMobileTab === 'social' && (
                  <div className="h-full flex flex-col gap-4">
                      <YouTubePanel />
                  </div>
              )}

              {activeMobileTab === 'system' && (
                  <div className="flex flex-col gap-6 pb-6">
                      <ConnectionPanel connectionState={connectionState} />
                      <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                      <Logger logs={logs} />
                  </div>
              )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#111827] border-t border-gray-800 flex justify-between items-center px-2 pb-safe z-50 shadow-2xl">
              <MobileTabButton id="scenes" icon={LayoutGrid} label="Cenas" />
              <MobileTabButton id="gfx" icon={Type} label="Títulos" />
              <MobileTabButton id="audio" icon={Sliders} label="Audio" />
              <MobileTabButton id="social" icon={Activity} label="Live" />
              <MobileTabButton id="system" icon={Settings2} label="Menu" />
          </div>
      </div>

    </div>
  );
};

export default App;