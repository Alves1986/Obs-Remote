import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
}

export const Logger: React.FC<Props> = ({ logs }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="bg-black/40 rounded-lg p-2 h-32 overflow-y-auto font-mono text-xs border border-gray-800/50">
            {logs.length === 0 && <span className="text-gray-600 italic">Nenhuma atividade registrada...</span>}
            {logs.map(log => (
                <div key={log.id} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span className={`ml-2 ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'warning' ? 'text-yellow-400' : 'text-blue-300'
                    }`}>
                        {log.message}
                    </span>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}