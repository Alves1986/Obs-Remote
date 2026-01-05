import React, { useEffect, useState } from 'react';
import { obsService } from './services/obsService';
import { StatusStrip } from './components/StatusStrip';
import { ConnectionPanel } from './components/ConnectionPanel';
import { MacroControls } from './components/MacroControls';
import { SceneGrid } from './components/SceneGrid';
import { AudioMixer } from './components/AudioMixer';
import { PTZPanel } from './components/PTZPanel';
import { Logger } from './components/Logger';
import { TransitionPanel } from './components/TransitionPanel';
import { ConnectionState, ObsScene, AudioSource, StreamStatus, LogEntry, TransitionState } from './types';
import { LayoutGrid, Sliders, Gamepad2, Settings2, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [status, setStatus] = useState<StreamStatus>({
    streaming: false,
    recording: false,
    streamTimecode: '00:00:00',
    recTimecode: '00:00:00',
    cpuUsage: 0,
    memoryUsage: 0,
    bitrate: 0
  });
  const [scenes, setScenes] = useState<ObsScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string>('');
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transition, setTransition] = useState<TransitionState>({ currentTransition: 'Fade', duration: 300 });
  
  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<'scenes' | 'audio' | 'ptz' | 'system'>('scenes');

  useEffect(() => {
    // Subscribe to service events
    const handleConnection = (s: ConnectionState) => setConnectionState(s);
    const handleStatus = (s: StreamStatus) => setStatus(s);
    const handleScenes = (s: ObsScene[]) => setScenes(s);
    const handleCurrentScene = (s: string) => setCurrentScene(s);
    const handleAudio = (s: AudioSource[]) => setAudioSources(s);
    const handleLog = (l: LogEntry) => setLogs(prev => [...prev.slice(-49), l]);
    const handleTransition = (t: TransitionState) => setTransition(t);

    obsService.on('connectionState', handleConnection);
    obsService.on('status', handleStatus);
    obsService.on('scenes', handleScenes);
    obsService.on('currentScene', handleCurrentScene);
    obsService.on('audioSources', handleAudio);
    obsService.on('log', handleLog);
    obsService.on('transition', handleTransition);

    return () => {
      // Cleanup
      obsService.off('connectionState', handleConnection);
      obsService.off('status', handleStatus);
      obsService.off('scenes', handleScenes);
      obsService.off('currentScene', handleCurrentScene);
      obsService.off('audioSources', handleAudio);
      obsService.off('log', handleLog);
      obsService.off('transition', handleTransition);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (connectionState !== ConnectionState.CONNECTED) return;
          if ((e.target as HTMLElement).tagName === 'INPUT') return;

          if (e.key >= '1' && e.key <= '9') {
              const index = parseInt(e.key) - 1;
              if (scenes[index]) {
                  obsService.setCurrentScene(scenes[index].name);
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scenes, connectionState]);

  // Mobile Tab Button Component
  const MobileTabButton = ({ id, icon: Icon, label }: { id: typeof activeMobileTab, icon: any, label: string }) => (
    <button 
        onClick={() => setActiveMobileTab(id)}
        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeMobileTab === id ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <Icon className={`w-6 h-6 ${activeMobileTab === id ? 'fill-current' : ''}`} />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen text-gray-100 font-sans selection:bg-blue-500/30 bg-gray-950">
      
      {/* 1. Universal Top Status Strip */}
      <div className="flex-none z-50">
          <StatusStrip 
            status={status} 
            connectionState={connectionState} 
            currentScene={currentScene} 
          />
      </div>

      {/* 2. DESKTOP & TABLET LAYOUT (Hidden on Mobile) */}
      <div className="hidden md:block flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-full max-w-[1920px] mx-auto">
          
          {/* 
             TABLET STRATEGY (md): 2 Columns
             Col 1 (Left 7/12): Visuals (Scenes + Transitions)
             Col 2 (Right 5/12): Tech (Audio + Controls + PTZ)
             
             DESKTOP STRATEGY (xl): 3 Columns
             Col 1: System
             Col 2: Visuals
             Col 3: Audio/PTZ
          */}

          {/* LEFT COLUMN (System on Desktop, Part of Right Col on Tablet) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col gap-6 overflow-hidden">
            <ConnectionPanel connectionState={connectionState} />
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 custom-scroll">
                 <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                 <div className="mt-auto">
                    <Logger logs={logs} />
                 </div>
            </div>
          </div>

          {/* CENTER/MAIN COLUMN (Visuals) */}
          <div className="col-span-12 md:col-span-7 xl:col-span-5 flex flex-col h-full overflow-hidden gap-4">
            <TransitionPanel 
                transition={transition} 
                isConnected={connectionState === ConnectionState.CONNECTED} 
            />
            <SceneGrid 
                scenes={scenes} 
                currentScene={currentScene} 
                isConnected={connectionState === ConnectionState.CONNECTED}
            />
          </div>

          {/* RIGHT COLUMN (Audio/PTZ + System on Tablet) */}
          <div className="col-span-12 md:col-span-5 xl:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
             
             {/* Tablet Only: Show System Controls here */}
             <div className="block xl:hidden space-y-4">
                <ConnectionPanel connectionState={connectionState} />
                <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
             </div>

             <div className="flex-1 min-h-[40%] overflow-hidden">
                <AudioMixer 
                    sources={audioSources} 
                    isConnected={connectionState === ConnectionState.CONNECTED}
                />
            </div>
            <div className="h-[40%] min-h-[250px]">
                <PTZPanel isConnected={connectionState === ConnectionState.CONNECTED} />
            </div>
          </div>
        
        </div>
      </div>

      {/* 3. MOBILE LAYOUT (Visible only on small screens) */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden relative bg-[#0b0f19]">
          <div className="flex-1 overflow-y-auto p-4 custom-scroll pb-20">
              {activeMobileTab === 'scenes' && (
                  <div className="flex flex-col gap-4 h-full">
                      <TransitionPanel 
                          transition={transition} 
                          isConnected={connectionState === ConnectionState.CONNECTED} 
                      />
                      <div className="flex-1">
                        <SceneGrid 
                            scenes={scenes} 
                            currentScene={currentScene} 
                            isConnected={connectionState === ConnectionState.CONNECTED}
                        />
                      </div>
                  </div>
              )}

              {activeMobileTab === 'audio' && (
                  <div className="h-full">
                      <AudioMixer 
                          sources={audioSources} 
                          isConnected={connectionState === ConnectionState.CONNECTED}
                      />
                  </div>
              )}

              {activeMobileTab === 'ptz' && (
                  <div className="h-full">
                      <PTZPanel isConnected={connectionState === ConnectionState.CONNECTED} />
                  </div>
              )}

              {activeMobileTab === 'system' && (
                  <div className="flex flex-col gap-6">
                      <ConnectionPanel connectionState={connectionState} />
                      <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                      <Logger logs={logs} />
                  </div>
              )}
          </div>

          {/* Fixed Bottom Navigation Bar */}
          <div className="h-16 bg-[#111827] border-t border-gray-800 flex justify-between items-center px-2 pb-safe absolute bottom-0 w-full z-50 shadow-2xl">
              <MobileTabButton id="scenes" icon={LayoutGrid} label="Cenas" />
              <MobileTabButton id="audio" icon={Sliders} label="Audio" />
              <MobileTabButton id="ptz" icon={Gamepad2} label="PTZ" />
              <MobileTabButton id="system" icon={Settings2} label="Menu" />
          </div>
      </div>

    </div>
  );
};

export default App;