import OBSWebSocket from 'obs-websocket-js';
import { ConnectionState, ObsScene, AudioSource, StreamStatus } from '../types';

type Listener = (data: any) => void;

// Configuration for "Smart" features
const CONFIG = {
  EXCLUSIVE_AUDIO: {
    A: 'Audio Mesa Blackmagic',
    B: 'Audio Mesa Som'
  },
  SCENES: {
    START: 'Abertura',
    END: 'Final',
    PANIC: 'Cena de Pânico'
  }
};

class ObsService {
  private obs: OBSWebSocket;
  private listeners: Map<string, Listener[]> = new Map();
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  
  // Local state cache
  private scenes: ObsScene[] = [];
  private currentScene: string = '';
  private audioSources: AudioSource[] = [];
  private status: StreamStatus = {
    streaming: false,
    recording: false,
    streamTimecode: '00:00:00',
    recTimecode: '00:00:00',
    cpuUsage: 0,
    memoryUsage: 0,
    bitrate: 0
  };

  private heartbeatInterval: any;

  constructor() {
    this.obs = new OBSWebSocket();
    this.setupEventListeners();
  }

  // --- Event Setup ---

  private setupEventListeners() {
    this.obs.on('ConnectionClosed', () => {
      this.state = ConnectionState.DISCONNECTED;
      this.emit('connectionState', this.state);
      this.log('Conexão com OBS perdida.', 'error');
      this.stopHeartbeat();
    });

    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.currentScene = data.sceneName;
      this.emit('currentScene', this.currentScene);
      this.handleSmartAudioSwitching(data.sceneName);
    });

    this.obs.on('SceneListChanged', async () => {
      await this.refreshScenes();
    });

    this.obs.on('StreamStateChanged', (data) => {
      this.status.streaming = data.outputActive;
      this.emit('status', { ...this.status });
    });

    this.obs.on('RecordStateChanged', (data) => {
      this.status.recording = data.outputActive;
      this.emit('status', { ...this.status });
    });

    this.obs.on('InputMuteStateChanged', (data) => {
      this.updateAudioSourceLocal(data.inputName, { muted: data.inputMuted });
    });

    this.obs.on('InputVolumeChanged', (data) => {
      this.updateAudioSourceLocal(data.inputName, { volume: data.inputVolumeMul });
    });
    
    // Note: InputVolumeMeters is high frequency. 
    // In a real optimized app we would throttle this. 
    // For now, we rely on state polling in heartbeat or specific events.
  }

  // --- Connection Logic ---

  async connect(host: string, port: string, password?: string): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) return;

    this.state = ConnectionState.CONNECTING;
    this.emit('connectionState', this.state);

    const address = host.startsWith('ws://') || host.startsWith('wss://') 
      ? `${host}:${port}` 
      : `ws://${host}:${port}`;

    try {
      await this.obs.connect(address, password);
      this.state = ConnectionState.CONNECTED;
      this.emit('connectionState', this.state);
      this.log('Conectado ao OBS com sucesso!', 'success');
      
      await this.initializeData();
      this.startHeartbeat();

    } catch (error: any) {
      this.state = ConnectionState.ERROR;
      this.emit('connectionState', this.state);
      this.log(`Erro ao conectar: ${error.message || error}`, 'error');
    }
  }

  async disconnect() {
    await this.obs.disconnect();
    this.state = ConnectionState.DISCONNECTED;
    this.emit('connectionState', this.state);
    this.stopHeartbeat();
  }

  // --- Initialization ---

  private async initializeData() {
    await this.refreshScenes();
    await this.refreshStatus();
    await this.refreshAudioSources();
  }

  private async refreshScenes() {
    try {
      const response = await this.obs.call('GetSceneList');
      this.scenes = response.scenes.map((s: any, idx: number) => ({
        name: s.sceneName as string,
        index: (s.sceneIndex as number) || idx
      })).reverse(); // OBS usually sends them bottom-up order in list
      
      this.currentScene = response.currentProgramSceneName;
      
      this.emit('scenes', this.scenes);
      this.emit('currentScene', this.currentScene);
    } catch (e) {
      console.error('Failed to refresh scenes', e);
    }
  }

  private async refreshStatus() {
    try {
      const stream = await this.obs.call('GetStreamStatus');
      const record = await this.obs.call('GetRecordStatus');
      
      this.status = {
        streaming: stream.outputActive,
        recording: record.outputActive,
        streamTimecode: stream.outputTimecode,
        recTimecode: record.outputTimecode,
        cpuUsage: 0, // Requires stats poll
        memoryUsage: 0,
        bitrate: 0
      };
      this.emit('status', { ...this.status });
    } catch (e) {
      console.error('Failed to refresh status', e);
    }
  }

  private async refreshAudioSources() {
    try {
      const inputs = await this.obs.call('GetInputList');
      const audioInputs = inputs.inputs.filter((i: any) => 
        i.inputKind.includes('audio') || i.inputKind.includes('capture')
      );

      const sources: AudioSource[] = [];
      
      for (const input of audioInputs) {
        try {
            const vol = await this.obs.call('GetInputVolume', { inputName: input.inputName as string });
            const mute = await this.obs.call('GetInputMute', { inputName: input.inputName as string });
            
            sources.push({
                name: input.inputName as string,
                volume: vol.inputVolumeMul,
                muted: mute.inputMuted,
                type: 'input'
            });
        } catch (e) {
            // Ignore inputs that don't support volume/mute
        }
      }
      
      this.audioSources = sources;
      this.emit('audioSources', this.audioSources);
    } catch (e) {
      console.error('Failed to refresh audio', e);
    }
  }

  // --- Automation Logic (The Backend Intelligence) ---

  async startService() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('Iniciando automação: Culto...', 'info');
    
    try {
        // 1. Scene
        // Try to find a scene that matches config or fallback
        const startScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.START))?.name || this.scenes[0]?.name;
        if(startScene) await this.setCurrentScene(startScene);
        
        // 2. Audio - Unmute Main, Mute Backup (Exclusive Logic)
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); // Mesa Som ON
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  // Blackmagic OFF
        
        // 3. Streaming/Rec
        if (!this.status.streaming) await this.obs.call('StartStream');
        if (!this.status.recording) await this.obs.call('StartRecord');
        
        this.log('Culto iniciado com sucesso!', 'success');
    } catch (e: any) {
        this.log(`Erro ao iniciar culto: ${e.message}`, 'error');
    }
  }

  async endService() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('Encerrando culto...', 'warning');

    try {
        const endScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.END))?.name;
        if(endScene) await this.setCurrentScene(endScene);
        
        // Mute all known audio inputs for safety
        for(const s of this.audioSources) {
            await this.setAudioMute(s.name, true);
        }
        
        // Delay stop
        setTimeout(async () => {
            if (this.status.streaming) await this.obs.call('StopStream');
            if (this.status.recording) await this.obs.call('StopRecord');
            this.log('Culto finalizado (Stream/REC parados).', 'info');
        }, 5000);

    } catch (e: any) {
        this.log(`Erro ao encerrar: ${e.message}`, 'error');
    }
  }

  async panicMode() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('!!! MODO PÂNICO !!!', 'error');

    try {
        // Stop output immediately
        if (this.status.streaming) await this.obs.call('StopStream');
        if (this.status.recording) await this.obs.call('StopRecord');
        
        // Switch to safe scene
        const panicScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.PANIC))?.name;
        if(panicScene) await this.setCurrentScene(panicScene);
        
        // Mute everything
        this.audioSources.forEach(s => this.setAudioMute(s.name, true));
        
    } catch (e: any) {
        this.log(`Erro no pânico: ${e.message}`, 'error');
    }
  }

  private handleSmartAudioSwitching(sceneName: string) {
      const lower = sceneName.toLowerCase();
      // Example: If scene is "Camera Movel", prefer Blackmagic Audio
      if (lower.includes('móvel') || lower.includes('movel')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, false); // BM ON
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, true);  // Mesa OFF
          this.log(`Auto-Audio: Ativado ${CONFIG.EXCLUSIVE_AUDIO.A}`, 'info');
      } 
      // Example: If scene is "Principal", prefer Mesa Som
      else if (lower.includes('principal') || lower.includes('mesa')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); // Mesa ON
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  // BM OFF
          this.log(`Auto-Audio: Ativado ${CONFIG.EXCLUSIVE_AUDIO.B}`, 'info');
      }
  }

  // --- Controls ---

  async setCurrentScene(sceneName: string) {
    if (this.state !== ConnectionState.CONNECTED) return;
    try {
        await this.obs.call('SetCurrentProgramScene', { sceneName });
    } catch (e: any) {
        this.log(`Erro ao mudar cena: ${e.message}`, 'error');
    }
  }

  async toggleStream() {
    if (this.state !== ConnectionState.CONNECTED) return;
    try {
        await this.obs.call('ToggleStream');
    } catch (e: any) {
        this.log(`Erro stream: ${e.message}`, 'error');
    }
  }

  async toggleRecord() {
    if (this.state !== ConnectionState.CONNECTED) return;
    try {
        await this.obs.call('ToggleRecord');
    } catch (e: any) {
        this.log(`Erro gravação: ${e.message}`, 'error');
    }
  }

  async setAudioVolume(sourceName: string, vol: number) {
    if (this.state !== ConnectionState.CONNECTED) return;
    // Optimistic update
    this.updateAudioSourceLocal(sourceName, { volume: vol });
    try {
        await this.obs.call('SetInputVolume', { inputName: sourceName, inputVolumeMul: vol });
    } catch (e) {
        console.error(e);
    }
  }

  async setAudioMute(sourceName: string, muted: boolean) {
    if (this.state !== ConnectionState.CONNECTED) return;
    // Optimistic update
    this.updateAudioSourceLocal(sourceName, { muted });
    try {
        await this.obs.call('SetInputMute', { inputName: sourceName, inputMuted: muted });
        
        // Exclusive check logic (Manual override)
        if (!muted) {
            if (sourceName === CONFIG.EXCLUSIVE_AUDIO.B) {
                // If Mesa unmutes, mute BM
                await this.obs.call('SetInputMute', { inputName: CONFIG.EXCLUSIVE_AUDIO.A, inputMuted: true });
            } else if (sourceName === CONFIG.EXCLUSIVE_AUDIO.A) {
                 // If BM unmutes, mute Mesa
                 await this.obs.call('SetInputMute', { inputName: CONFIG.EXCLUSIVE_AUDIO.B, inputMuted: true });
            }
        }
    } catch (e) {
        console.error(e);
    }
  }

  async applyAudioPreset(type: 'worship' | 'sermon' | 'service') {
      this.log(`Aplicando preset de áudio: ${type}`, 'info');
      // Define presets here (hardcoded based on typical church needs)
      const presets: Record<string, { [key: string]: { vol?: number, muted?: boolean } }> = {
          worship: {
              [CONFIG.EXCLUSIVE_AUDIO.B]: { vol: 0.9, muted: false }, // Mesa loud
              'Mic Pregador': { muted: true }
          },
          sermon: {
              [CONFIG.EXCLUSIVE_AUDIO.B]: { vol: 0.5, muted: false }, // Mesa bg
              'Mic Pregador': { vol: 1.0, muted: false }
          },
          service: {
               // Default balanced
               [CONFIG.EXCLUSIVE_AUDIO.B]: { vol: 0.8, muted: false },
          }
      };

      const preset = presets[type];
      if (!preset) return;

      for (const [name, settings] of Object.entries(preset)) {
          if (settings.vol !== undefined) await this.setAudioVolume(name, settings.vol);
          if (settings.muted !== undefined) await this.setAudioMute(name, settings.muted);
      }
  }

  // --- PTZ Logic (Vendor Requests) ---

  async ptzAction(command: string, args: any = {}) {
      if (this.state !== ConnectionState.CONNECTED) return;
      try {
          // Supports obs-ptz plugin conventions
          await this.obs.call('CallVendorRequest', {
              vendorName: 'obs-ptz',
              requestType: command,
              requestData: args
          });
      } catch (e: any) {
          this.log(`Erro PTZ: ${e.message}`, 'warning');
      }
  }

  async savePtzPreset(name: string) {
      await this.ptzAction('save-preset', { name });
      this.log(`Preset PTZ salvo: ${name}`, 'success');
  }

  async recallPtzPreset(name: string) {
      await this.ptzAction('recall-preset', { name });
  }

  // --- Internals ---

  private updateAudioSourceLocal(name: string, update: Partial<AudioSource>) {
      this.audioSources = this.audioSources.map(s => {
          if (s.name === name) return { ...s, ...update };
          return s;
      });
      this.emit('audioSources', [...this.audioSources]);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (this.state !== ConnectionState.CONNECTED) return;
      try {
          const stats = await this.obs.call('GetStats');
          const stream = await this.obs.call('GetStreamStatus');
          
          this.status = {
              ...this.status,
              cpuUsage: stats.cpuUsage,
              memoryUsage: stats.memoryUsage,
              streaming: stream.outputActive,
              streamTimecode: stream.outputTimecode,
              bitrate: stream.outputBytesPerSec * 8 // approx
          };
          this.emit('status', this.status);
      } catch (e) {
          // connection might be flaky
      }
    }, 1000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    
    // Initial data hydration
    if(event === 'connectionState') callback(this.state);
    if(this.state === ConnectionState.CONNECTED) {
        if(event === 'status') callback(this.status);
        if(event === 'scenes') callback(this.scenes);
        if(event === 'currentScene') callback(this.currentScene);
        if(event === 'audioSources') callback(this.audioSources);
    }
  }

  off(event: string, callback: Listener) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(c => c !== callback));
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  private log(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
      this.emit('log', {
          id: Math.random().toString(36),
          timestamp: new Date(),
          message: msg,
          type
      });
  }
}

export const obsService = new ObsService();