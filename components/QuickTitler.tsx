import React, { useState } from 'react';
import { obsService } from '../services/obsService';
import { Type, Send, Eye, EyeOff, Settings } from 'lucide-react';

interface Props {
    isConnected: boolean;
}

export const QuickTitler: React.FC<Props> = ({ isConnected }) => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    
    // OBS Source Names configuration (Must match your OBS Scene)
    const [config, setConfig] = useState({
        titleSource: 'Texto Nome',
        subtitleSource: 'Texto Cargo',
        groupSource: 'LowerThird' // The group or main source to toggle visibility
    });
    const [showConfig, setShowConfig] = useState(false);

    const handleUpdate = async () => {
        if (!isConnected) return;
        if (config.titleSource) await obsService.setTextSettings(config.titleSource, title);
        if (config.subtitleSource) await obsService.setTextSettings(config.subtitleSource, subtitle);
    };

    const toggleVisibility = async () => {
        if (!isConnected) return;
        const newState = !isVisible;
        setIsVisible(newState);
        await obsService.setSceneItemEnabled(config.groupSource, newState);
    };

    if (showConfig) {
        return (
            <div className="glass-panel rounded-xl p-4 shadow-lg border border-gray-800 bg-[#13151a] flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                    <h3 className="text-gray-300 font-bold text-xs uppercase">Config Titler</h3>
                    <button onClick={() => setShowConfig(false)} className="text-brand-500 text-xs hover:underline">Voltar</button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Fonte do Nome (OBS)</label>
                        <input 
                            value={config.titleSource} 
                            onChange={e => setConfig({...config, titleSource: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Fonte do Cargo (OBS)</label>
                        <input 
                            value={config.subtitleSource} 
                            onChange={e => setConfig({...config, subtitleSource: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Grupo/Fonte (Visibilidade)</label>
                        <input 
                            value={config.groupSource} 
                            onChange={e => setConfig({...config, groupSource: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-xl p-4 shadow-lg border border-gray-800 bg-[#13151a] flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                 <h3 className="text-gray-200 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <Type className="w-4 h-4 text-brand-500" /> Quick Titler
                 </h3>
                 <button onClick={() => setShowConfig(true)} className="text-gray-600 hover:text-white transition-colors">
                     <Settings className="w-4 h-4" />
                 </button>
            </div>

            <div className="space-y-3 flex-1">
                <input 
                    type="text" 
                    placeholder="Nome / Título Principal"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-brand-500 outline-none placeholder-gray-600 font-bold"
                />
                <input 
                    type="text" 
                    placeholder="Cargo / Subtítulo"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-brand-500 outline-none placeholder-gray-600"
                />

                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={handleUpdate}
                        disabled={!isConnected}
                        className="flex-1 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-800/50 text-blue-300 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Send className="w-3 h-3" /> Atualizar
                    </button>
                    
                    <button 
                        onClick={toggleVisibility}
                        disabled={!isConnected}
                        className={`
                            flex-1 border text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-all active:scale-95
                            ${isVisible 
                                ? 'bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/50' 
                                : 'bg-green-950/40 border-green-500/30 text-green-400 hover:bg-green-900/50'}
                        `}
                    >
                        {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {isVisible ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            </div>
        </div>
    );
};