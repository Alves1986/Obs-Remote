import OBSWebSocket from 'obs-websocket-js';
import { ConnectionState, ObsScene, AudioSource, StreamStatus, TransitionState, ConnectionPreset } from '../types';
import { supabase } from './supabaseClient';

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
  
  // Connection persistence
  private shouldReconnect: boolean = false;
  private reconnectTimer: any = null;
  private lastConnectionDetails: { host: string, port: string, password?: string, secure: boolean } | null = null;

  // Local state cache
  private scenes: ObsScene[] = [];
  private currentScene: string = '';
  private previewScene: string = ''; 
  private audioSources: AudioSource[] = [];
  private inputs: string[] = []; 
  private transitionState: TransitionState = { currentTransition: 'Fade', duration: 300, availableTransitions: [] };
  private studioMode: boolean = false;
  
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
    this.obs.on('ConnectionClosed', (error) => {
      this.stopHeartbeat();
      
      // Check if it was an intentional disconnect
      if (this.shouldReconnect && this.lastConnectionDetails) {
          this.state = ConnectionState.RECONNECTING;
          this.emit('connectionState', this.state);
          this.log(`Conexão perdida. Reconectando em 3s...`, 'warning');
          
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
              this.connect(
                  this.lastConnectionDetails!.host,
                  this.lastConnectionDetails!.port,
                  this.lastConnectionDetails!.password,
                  this.lastConnectionDetails!.secure
              );
          }, 3000);
      } else {
          this.state = ConnectionState.DISCONNECTED;
          this.emit('connectionState', this.state);
          // Only log error if it wasn't a manual disconnect
          if (error && error.code !== 1000) {
             this.log(`Desconectado: ${error.message}`, 'error');
          }
      }
    });

    this.obs.on('ConnectionError', (err) => {
        console.error("Socket Error", err);
        // ConnectionClosed usually fires after this, handling the state change there.
    });

    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.currentScene = data.sceneName;
      this.emit('currentScene', this.currentScene);
      this.handleSmartAudioSwitching(data.sceneName);
    });

    this.obs.on('CurrentPreviewSceneChanged', (data) => {
      this.previewScene = data.sceneName;
      this.emit('previewScene', this.previewScene);
    });

    this.obs.on('StudioModeStateChanged', (data) => {
      this.studioMode = data.studioModeEnabled;
      this.emit('studioMode', this.studioMode);
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

  async connect(host: string, port: string, password?: string, secure: boolean = false): Promise<void> {
    // If already connected, do nothing
    if (this.state === ConnectionState.CONNECTED) return;

    // Cache credentials for auto-reconnect
    this.shouldReconnect = true;
    this.lastConnectionDetails = { host, port, password, secure };

    this.state = ConnectionState.CONNECTING;
    this.emit('connectionState', this.state);

    let cleanHost = host.replace('ws://', '').replace('wss://', '').replace('/', '');
    
    if (!cleanHost.includes(':')) {
        cleanHost = `${cleanHost}:${port}`;
    }

    const protocol = secure ? 'wss' : 'ws';
    const url = `${protocol}://${cleanHost}`;

    try {
      console.log(`Tentando conectar em: ${url}`);
      await this.obs.connect(url, password, { rpcVersion: 1 });
      
      this.state = ConnectionState.CONNECTED;
      this.emit('connectionState', this.state);
      this.log(`Conectado com sucesso (${protocol.toUpperCase()})!`, 'success');
      
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      
      await this.initializeData();
      this.startHeartbeat();

    } catch (error: any) {
      console.error("Connection Error:", error);
      
      // If we are in "shouldReconnect" mode (failed attempt), go to RECONNECTING instead of ERROR immediately
      // unless it's a specific auth error
      if (this.shouldReconnect) {
          this.state = ConnectionState.RECONNECTING;
          this.emit('connectionState', this.state);
          this.log(`Falha ao conectar. Tentando novamente em 3s...`, 'warning');
          
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
             this.connect(host, port, password, secure);
          }, 3000);
      } else {
          this.state = ConnectionState.ERROR;
          this.emit('connectionState', this.state);
          this.log(`Erro ao conectar: ${error.message || error}`, 'error');
      }
    }
  }

  async disconnect() {
    this.shouldReconnect = false; // Disable auto-reconnect
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    await this.obs.disconnect();
    this.state = ConnectionState.DISCONNECTED;
    this.emit('connectionState', this.state);
    this.stopHeartbeat();
  }

  // --- Supabase Persistence ---

  async fetchPresets(): Promise<ConnectionPreset[]> {
    try {
      const { data, error } = await supabase
        .from('connection_presets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ConnectionPreset[];
    } catch (e) {
      if (this.getLocalPresets().length > 0) {
          console.warn('Using local presets due to DB error');
      }
      return this.getLocalPresets();
    }
  }

  async addPreset(preset: ConnectionPreset): Promise<void> {
    try {
      const { error } = await supabase
        .from('connection_presets')
        .insert([{ 
          name: preset.name, 
          host: preset.host, 
          port: preset.port, 
          password: preset.password 
        }]);

      if (error) throw error;
      const currentLocal = this.getLocalPresets();
      localStorage.setItem('obs_connection_presets', JSON.stringify([...currentLocal, preset]));
      this.log('Conexão salva na nuvem.', 'success');
    } catch (e: any) {
      const currentLocal = this.getLocalPresets();
      localStorage.setItem('obs_connection_presets', JSON.stringify([...currentLocal, preset]));
      this.log(`Salvo localmente: ${e.message}`, 'warning');
    }
  }

  async removePreset(id: number): Promise<void> {
    try {
      const { error } = await supabase.from('connection_presets').delete().eq('id', id);
      if (error) throw error;
      this.log('Conexão removida.', 'info');
    } catch (e: any) {
      this.log(`Erro ao remover: ${e.message}`, 'error');
    }
  }

  private getLocalPresets(): ConnectionPreset[] {
      try {
          const data = localStorage.getItem('obs_connection_presets');
          return data ? JSON.parse(data) : [];
      } catch {
          return [];
      }
  }

  // --- Initialization ---

  private async initializeData() {
    await this.refreshScenes();
    await this.refreshStatus();
    await this.refreshAudioSources();
    await this.refreshTransition();
    await this.refreshInputs();
    
    // Check Studio Mode
    try {
        const studio = await this.obs.call('GetStudioModeEnabled');
        this.studioMode = studio.studioModeEnabled;
        this.emit('studioMode', this.studioMode);
    } catch(e) {}
  }

  private async refreshScenes() {
    try {
      const response = await this.obs.call('GetSceneList');
      this.scenes = response.scenes.map((s: any, idx: number) => ({
        name: s.sceneName as string,
        index: (s.sceneIndex as number) || idx
      })).reverse();
      
      this.currentScene = response.currentProgramSceneName;
      // In Studio Mode, we might want preview info too
      try {
          const preview = await this.obs.call('GetCurrentPreviewScene');
          this.previewScene = preview.currentPreviewSceneName;
      } catch (e) {
          this.previewScene = this.currentScene;
      }

      this.emit('scenes', this.scenes);
      this.emit('currentScene', this.currentScene);
      this.emit('previewScene', this.previewScene);
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
        cpuUsage: 0,
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
        } catch (e) {}
      }
      this.audioSources = sources;
      this.emit('audioSources', this.audioSources);
    } catch (e) {}
  }

  private async refreshInputs() {
      try {
          const list = await this.obs.call('GetInputList');
          this.inputs = list.inputs.map((i: any) => i.inputName);
          this.emit('inputs', this.inputs);
      } catch (e) {}
  }

  private async refreshTransition() {
      try {
          const t = await this.obs.call('GetCurrentSceneTransition');
          const list = await this.obs.call('GetSceneTransitionList');
          
          this.transitionState = {
              currentTransition: t.transitionName,
              duration: t.transitionDuration ?? 300,
              availableTransitions: list.transitions.map((tr: any) => tr.transitionName)
          };
          this.emit('transition', this.transitionState);
      } catch (e) {
          console.error(e);
      }
  }

  // --- Controls ---

  async setCurrentScene(sceneName: string) {
    if (this.state !== ConnectionState.CONNECTED) return;
    try {
        if (this.studioMode) {
            await this.obs.call('SetCurrentPreviewScene', { sceneName });
            this.previewScene = sceneName;
            this.emit('previewScene', this.previewScene);
        } else {
            await this.obs.call('SetCurrentProgramScene', { sceneName });
        }
    } catch (e: any) {
        this.log(`Erro ao mudar cena: ${e.message}`, 'error');
    }
  }

  async triggerTransition() {
      if (this.state !== ConnectionState.CONNECTED) return;
      try {
          await this.obs.call('TriggerStudioModeTransition');
      } catch(e: any) {
          this.log(`Erro transição: ${e.message}`, 'error');
      }
  }

  async startService() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('Iniciando automação...', 'info');
    
    try {
        if (!this.studioMode) await this.obs.call('SetStudioModeEnabled', { studioModeEnabled: true });

        const startScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.START))?.name || this.scenes[0]?.name;
        if(startScene) await this.setCurrentScene(startScene); 
        
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); 
        await this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  
        
        if (!this.status.streaming) await this.obs.call('StartStream');
        if (!this.status.recording) await this.obs.call('StartRecord');
        
        await this.triggerTransition();
        this.log('Culto iniciado!', 'success');
    } catch (e: any) {
        this.log(`Erro ao iniciar: ${e.message}`, 'error');
    }
  }

  async endService() {
    if (this.state !== ConnectionState.CONNECTED) return;
    try {
        const endScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.END))?.name;
        if(endScene) {
            await this.setCurrentScene(endScene);
            await this.triggerTransition();
        }
        
        for(const s of this.audioSources) await this.setAudioMute(s.name, true);
        
        setTimeout(async () => {
            if (this.status.streaming) await this.obs.call('StopStream');
            if (this.status.recording) await this.obs.call('StopRecord');
        }, 5000);

    } catch (e: any) {
        this.log(`Erro ao encerrar: ${e.message}`, 'error');
    }
  }

  async panicMode() {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.log('!!! MODO PÂNICO !!!', 'error');
    try {
        await this.obs.call('StopStream');
        await this.obs.call('StopRecord');
        const panicScene = this.scenes.find(s => s.name.includes(CONFIG.SCENES.PANIC))?.name;
        if(panicScene) {
            await this.obs.call('SetCurrentProgramScene', { sceneName: panicScene });
        }
        this.audioSources.forEach(s => this.setAudioMute(s.name, true));
    } catch (e) {}
  }

  private handleSmartAudioSwitching(sceneName: string) {
      const lower = sceneName.toLowerCase();
      if (lower.includes('móvel') || lower.includes('movel')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, false); 
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, true);  
      } 
      else if (lower.includes('principal') || lower.includes('mesa')) {
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.B, false); 
          this.setAudioMute(CONFIG.EXCLUSIVE_AUDIO.A, true);  
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
    try { await this.obs.call('ToggleStream'); } catch (e: any) { this.log(e.message, 'error'); }
  }

  async toggleRecord() {
    if (this.state !== ConnectionState.CONNECTED) return;
    try { await this.obs.call('ToggleRecord'); } catch (e: any) { this.log(e.message, 'error'); }
  }

  async setAudioVolume(sourceName: string, vol: number) {
    if (this.state !== ConnectionState.CONNECTED) return;
    this.updateAudioSourceLocal(sourceName, { volume: vol });
    try { await this.obs.call('SetInputVolume', { inputName: sourceName, inputVolumeMul: vol }); } catch (e) {}
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
    } catch (e) {}
  }

  // --- PTZ Logic (Updated for obs-ptz) ---

  async ptzAction(sourceName: string, action: string, arg: string | number) {
      if (this.state !== ConnectionState.CONNECTED) return;
      
      try {
          let requestType = 'ptz';
          let requestData: any = { id: sourceName };

          if (['left', 'right', 'up', 'down', 'stop'].includes(action)) {
             requestData.type = 'move';
             requestData.direction = action;
          } else if (action === 'zoom_in') {
             requestData.type = 'zoom';
             requestData.direction = 'in';
          } else if (action === 'zoom_out') {
             requestData.type = 'zoom';
             requestData.direction = 'out';
          } else if (action === 'preset') {
             requestData.type = 'preset';
             requestData.num = arg;
          } else {
             requestData.type = 'move';
             requestData.direction = 'stop';
          }

          console.log(`PTZ [${sourceName}]:`, requestData);
          
          await this.obs.call('CallVendorRequest', {
              vendorName: 'obs-ptz',
              requestType: requestType,
              requestData: requestData
          });
      } catch (e: any) {
          console.error("PTZ Plugin Error:", e);
      }
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
          // If stats fail, it might indicate a disconnect that wasn't caught
          console.warn("Heartbeat failed", e);
      }
    }, 1000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    
    if(event === 'connectionState') callback(this.state);
    if(this.state === ConnectionState.CONNECTED) {
        if(event === 'status') callback(this.status);
        if(event === 'scenes') callback(this.scenes);
        if(event === 'currentScene') callback(this.currentScene);
        if(event === 'previewScene') callback(this.previewScene);
        if(event === 'audioSources') callback(this.audioSources);
        if(event === 'inputs') callback(this.inputs);
        if(event === 'transition') callback(this.transitionState);
        if(event === 'studioMode') callback(this.studioMode);
    }
  }

  off(event: string, callback: Listener) {
    const callbacks = this.listeners.get(event);
    if (callbacks) this.listeners.set(event, callbacks.filter(c => c !== callback));
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) callbacks.forEach(cb => cb(data));
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