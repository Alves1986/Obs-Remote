import OBSWebSocket from 'obs-websocket-js';
import { ConnectionState, ObsScene, AudioSource, StreamStatus, TransitionState, ConnectionPreset } from '../types';

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
  private transitionState: TransitionState = { currentTransition: 'Fade', duration: 300 };
  
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

    this.obs.on('CurrentSceneTransitionChanged', (data) => {
        this.transitionState.currentTransition = data.transitionName;
        this.emit('transition', this.transitionState);
    });

    this.obs.on('CurrentSceneTransitionDurationChanged', (data) => {
        this.transitionState.duration = data.transitionDuration;
        this.emit('transition', this.transitionState);
    });
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

  // --- Local Storage Presets ---

  savePreset(preset: ConnectionPreset) {
      const presets = this.getPresets();
      const existingIndex = presets.findIndex(p => p.name === preset.name);
      
      if (existingIndex >= 0) {
          presets[existingIndex] = preset;
      } else {
          presets.push(preset);
      }
      localStorage.setItem('obs_connection_presets', JSON.stringify(presets));
  }

  getPresets(): ConnectionPreset[] {
      try {
          const data = localStorage.getItem('obs_connection_presets');
          return data ? JSON.parse(data) : [];
      } catch {
          return [];
      }
  }

  deletePreset(name: string) {
      const presets = this.getPresets().filter(p => p.name !== name);
      localStorage.setItem('obs_connection_presets', JSON.stringify(presets));
  }

  // --- Initialization ---

  private async initializeData() {
    await this.refreshScenes();
    await this.refreshStatus();
    await this.refreshAudioSources();
    await this.refreshTransition();
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

  private async refreshTransition() {
      try {
          const t = await this.obs.call('GetCurrentSceneTransition');
          this.transitionState = {
              currentTransition: t.transitionName,
              duration: t.transitionDuration ?? 300
          };
          this.emit('transition', this.transitionState);
      } catch (e) {
          console.error(e);
      }
  }

  // --- Automation Logic (The Backend Intelligence) ---

  async startService() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('Iniciando automação: Culto...', 'info');
    
    try {
        const startScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.START))?.name || this.scenes[0]?.name;
        if(startScene) await this.setCurrentScene(startScene);
        
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); 
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  
        
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
        
        for(const s of this.audioSources) {
            await this.setAudioMute(s.name, true);
        }
        
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
        if (this.status.streaming) await this.obs.call('StopStream');
        if (this.status.recording) await this.obs.call('StopRecord');
        
        const panicScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.PANIC))?.name;
        if(panicScene) await this.setCurrentScene(panicScene);
        
        this.audioSources.forEach(s => this.setAudioMute(s.name, true));
        
    } catch (e: any) {
        this.log(`Erro no pânico: ${e.message}`, 'error');
    }
  }

  private handleSmartAudioSwitching(sceneName: string) {
      const lower = sceneName.toLowerCase();
      if (lower.includes('móvel') || lower.includes('movel')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, false); 
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, true);  
          this.log(`Auto-Audio: Ativado ${CONFIG.EXCLUSIVE_AUDIO.A}`, 'info');
      } 
      else if (lower.includes('principal') || lower.includes('mesa')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); 
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  
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

  async setTransition(transitionName: string) {
      if (this.state !== ConnectionState.CONNECTED) return;
      try {
          await this.obs.call('SetCurrentSceneTransition', { transitionName });
      } catch (e) { console.error(e); }
  }

  async setTransitionDuration(duration: number) {
      if (this.state !== ConnectionState.CONNECTED) return;
      try {
          await this.obs.call('SetCurrentSceneTransitionDuration', { transitionDuration: duration });
      } catch (e) { console.error(e); }
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
    this.updateAudioSourceLocal(sourceName, { volume: vol });
    try {
        await this.obs.call('SetInputVolume', { inputName: sourceName, inputVolumeMul: vol });
    } catch (e) { console.error(e); }
  }

  async setAudioMute(sourceName: string, muted: boolean) {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.updateAudioSourceLocal(sourceName, { muted });
    try {
        await this.obs.call('SetInputMute', { inputName: sourceName, inputMuted: muted });
        if (!muted) {
            if (sourceName === CONFIG.EXCLUSIVE_AUDIO.B) {
                await this.obs.call('SetInputMute', { inputName: CONFIG.EXCLUSIVE_AUDIO.A, inputMuted: true });
            } else if (sourceName === CONFIG.EXCLUSIVE_AUDIO.A) {
                 await this.obs.call('SetInputMute', { inputName: CONFIG.EXCLUSIVE_AUDIO.B, inputMuted: true });
            }
        }
    } catch (e) { console.error(e); }
  }

  async applyAudioPreset(type: 'worship' | 'sermon' | 'service') {
      this.log(`Aplicando preset de áudio: ${type}`, 'info');
      const presets: Record<string, { [key: string]: { vol?: number, muted?: boolean } }> = {
          worship: {
              [CONFIG.EXCLUSIVE_AUDIO.B]: { vol: 0.9, muted: false },
              'Mic Pregador': { muted: true }
          },
          sermon: {
              [CONFIG.EXCLUSIVE_AUDIO.B]: { vol: 0.5, muted: false },
              'Mic Pregador': { vol: 1.0, muted: false }
          },
          service: {
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
              bitrate: stream.outputBytesPerSec * 8 
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
        if(event === 'transition') callback(this.transitionState);
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