import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface Props {
  logs: LogEntry[];
}

export const Logger: React.FC<Props> = ({ logs }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="glass-panel rounded-xl flex flex-col h-40 overflow-hidden shadow-lg border border-gray-800">
            <div className="bg-gray-900/80 px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
                <Terminal className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">System Log</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed custom-scroll bg-gray-950/50">
                {logs.length === 0 && <span className="text-gray-700 italic">>> Aguardando eventos...</span>}
                {logs.map(log => (
                    <div key={log.id} className="mb-0.5 border-l-2 border-transparent pl-1 hover:bg-white/5 transition-colors">
                        <span className="text-gray-600 select-none">[{log.timestamp.toLocaleTimeString()}]</span>
                        <span className={`ml-2 ${
                            log.type === 'error' ? 'text-red-400 font-bold border-l-red-500' : 
                            log.type === 'success' ? 'text-green-400 border-l-green-500' : 
                            log.type === 'warning' ? 'text-amber-400 border-l-amber-500' : 'text-blue-300'
                        }`}>
                            {log.type !== 'info' ? `${log.type.toUpperCase()}: ` : ''}{log.message}
                        </span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}