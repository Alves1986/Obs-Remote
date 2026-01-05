import React from 'react';
import { ObsScene } from '../types';
import { obsService } from '../services/obsService';
import { Image, LayoutTemplate, Mic2, Users } from 'lucide-react';

interface Props {
  scenes: ObsScene[];
  currentScene: string;
  isConnected: boolean;
}

export const SceneGrid: React.FC<Props> = ({ scenes, currentScene, isConnected }) => {
  
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('louvor')) return <Mic2 className="w-5 h-5" />;
    if (n.includes('palavra') || n.includes('pregador')) return <Users className="w-5 h-5" />;
    if (n.includes('câmera') || n.includes('camera')) return <Image className="w-5 h-5" />;
    return <LayoutTemplate className="w-5 h-5" />;
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 h-full overflow-hidden flex flex-col">
      <h3 className="text-gray-300 font-semibold mb-4 flex items-center gap-2">
        <LayoutTemplate className="w-4 h-4" /> Cenas Disponíveis
      </h3>
      
      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center text-gray-600">
            Aguardando conexão...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1">
            {scenes.map((scene) => {
            const isActive = currentScene === scene.name;
            return (
                <button
                key={scene.name}
                onClick={() => obsService.setCurrentScene(scene.name)}
                className={`
                    relative p-4 rounded-lg text-left transition-all duration-200 border-2
                    flex flex-col gap-2 min-h-[5rem]
                    ${isActive 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'}
                `}
                >
                <div className={`opacity-80 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {getIcon(scene.name)}
                </div>
                <span className="font-semibold text-sm leading-tight">{scene.name}</span>
                {isActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping" />
                )}
                </button>
            );
            })}
        </div>
      )}
    </div>
  );
};