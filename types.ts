export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING'
}

export interface ObsScene {
  name: string;
  index: number;
}

export interface AudioSource {
  name: string;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  type: 'input' | 'output';
}

export interface StreamStatus {
  streaming: boolean;
  recording: boolean;
  streamTimecode: string;
  recTimecode: string;
  cpuUsage: number;
  memoryUsage: number;
  bitrate: number;
}

export interface PtzPreset {
  id: string;
  name: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface TransitionState {
  currentTransition: string;
  duration: number;
  availableTransitions: string[]; // Added list of available transitions
}

export interface ConnectionPreset {
  id?: number; // Database ID
  name: string;
  host: string;
  port: string;
  password?: string;
}