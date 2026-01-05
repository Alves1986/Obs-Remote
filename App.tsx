import React, { useEffect, useState } from 'react';
import { obsService } from './services/obsService';
import { StatusStrip } from './components/StatusStrip';
import { ConnectionPanel } from './components/ConnectionPanel';
import { MacroControls } from './components/MacroControls';
import { SceneGrid } from './components/SceneGrid';
import { AudioMixer } from './components/AudioMixer';
import { PTZPanel } from './components/PTZPanel';
import { Logger } from './components/Logger';
import { ConnectionState, ObsScene, AudioSource, StreamStatus, LogEntry } from './types';

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

  useEffect(() => {
    // Subscribe to service events
    const handleConnection = (s: ConnectionState) => setConnectionState(s);
    const handleStatus = (s: StreamStatus) => setStatus(s);
    const handleScenes = (s: ObsScene[]) => setScenes(s);
    const handleCurrentScene = (s: string) => setCurrentScene(s);
    const handleAudio = (s: AudioSource[]) => setAudioSources(s);
    const handleLog = (l: LogEntry) => setLogs(prev => [...prev.slice(-49), l]); // Keep last 50

    obsService.on('connectionState', handleConnection);
    obsService.on('status', handleStatus);
    obsService.on('scenes', handleScenes);
    obsService.on('currentScene', handleCurrentScene);
    obsService.on('audioSources', handleAudio);
    obsService.on('log', handleLog);

    return () => {
      // Cleanup
      obsService.off('connectionState', handleConnection);
      obsService.off('status', handleStatus);
      obsService.off('scenes', handleScenes);
      obsService.off('currentScene', handleCurrentScene);
      obsService.off('audioSources', handleAudio);
      obsService.off('log', handleLog);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen text-gray-100 font-sans selection:bg-blue-500/30">
      
      {/* 1. Top Status Strip (Fixed Height) */}
      <StatusStrip 
        status={status} 
        connectionState={connectionState} 
        currentScene={currentScene} 
      />

      {/* 2. Main Content Grid (Fluid) */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-full max-w-[1920px] mx-auto">
          
          {/* Left Column: Command Center (3 cols) */}
          <div className="col-span-12 xl:col-span-3 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
            <ConnectionPanel connectionState={connectionState} />
            
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 custom-scroll">
                 <MacroControls isConnected={connectionState === ConnectionState.CONNECTED} />
                 <div className="mt-auto">
                    <Logger logs={logs} />
                 </div>
            </div>
          </div>

          {/* Center Column: Visual Switching (5 cols) */}
          <div className="col-span-12 xl:col-span-5 lg:col-span-5 flex flex-col h-full overflow-hidden">
            <SceneGrid 
                scenes={scenes} 
                currentScene={currentScene} 
                isConnected={connectionState === ConnectionState.CONNECTED}
            />
          </div>

          {/* Right Column: Mix & Move (4 cols) */}
          <div className="col-span-12 xl:col-span-4 lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
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
    </div>
  );
};

export default App;