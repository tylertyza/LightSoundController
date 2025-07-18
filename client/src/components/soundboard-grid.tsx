import { useState } from "react";
import { SoundButton, Scene, LightEffect } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface SoundboardGridProps {
  soundButtons: SoundButton[];
  scenes: Scene[];
  lightingEffects: LightEffect[];
  onSoundButtonClick: (button: SoundButton) => void;
  onSceneClick: (scene: Scene) => void;
  onLightingEffectClick: (effect: LightEffect) => void;
  onSceneEdit?: (scene: Scene) => void;
}

type GridItem = (SoundButton & { type: 'sound' }) | (Scene & { type: 'scene' }) | (LightEffect & { type: 'lighting' });

export default function SoundboardGrid({ soundButtons, scenes, lightingEffects, onSoundButtonClick, onSceneClick, onLightingEffectClick, onSceneEdit }: SoundboardGridProps) {
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set());
  
  // Combine and sort sound buttons, scenes, and lighting effects
  const allItems: GridItem[] = [
    ...soundButtons.map(button => ({ ...button, type: 'sound' as const })),
    ...scenes.map(scene => ({ ...scene, type: 'scene' as const })),
    ...lightingEffects.map(effect => ({ ...effect, type: 'lighting' as const }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  
  const handleItemClick = (item: GridItem) => {
    const itemKey = `${item.type}-${item.id}`;
    setActiveItems(prev => new Set(prev).add(itemKey));
    
    if (item.type === 'sound') {
      onSoundButtonClick(item);
    } else if (item.type === 'scene') {
      onSceneClick(item);
    } else if (item.type === 'lighting') {
      onLightingEffectClick(item);
    }
    
    // Remove active state after 2 seconds
    setTimeout(() => {
      setActiveItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }, 2000);
  };
  
  const getItemStyle = (item: GridItem, isActive: boolean) => {
    const baseStyle = "bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition-all duration-200 cursor-pointer group border border-slate-700";
    const typeStyle = item.type === 'scene' ? "border-l-4 border-l-amber-500" : 
                     item.type === 'lighting' ? "border-l-4 border-l-cyan-500" : "";
    
    const color = item.type === 'sound' ? item.color : 
                 item.type === 'lighting' ? 'cyan' : 'amber';
    const colorMap: { [key: string]: string } = {
      purple: "hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20",
      green: "hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20",
      red: "hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20",
      yellow: "hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20",
      blue: "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20",
      indigo: "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20",
      pink: "hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/20",
      cyan: "hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20",
      lime: "hover:border-lime-500 hover:shadow-lg hover:shadow-lime-500/20",
      amber: "hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20",
    };
    
    const activeStyle = isActive ? "scale-105 shadow-lg shadow-blue-500/50" : "";
    const hoverStyle = colorMap[color] || "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20";
    
    return `${baseStyle} ${typeStyle} ${hoverStyle} ${activeStyle}`;
  };
  
  const getIconBackgroundStyle = (item: GridItem) => {
    const color = item.type === 'sound' ? item.color : 
                 item.type === 'lighting' ? 'cyan' : 'amber';
    const colorMap: { [key: string]: string } = {
      purple: "bg-gradient-to-br from-purple-500 to-pink-600",
      green: "bg-gradient-to-br from-emerald-500 to-teal-600",
      red: "bg-gradient-to-br from-red-500 to-orange-600",
      yellow: "bg-gradient-to-br from-yellow-500 to-orange-600",
      blue: "bg-gradient-to-br from-blue-500 to-indigo-600",
      indigo: "bg-gradient-to-br from-indigo-500 to-purple-600",
      pink: "bg-gradient-to-br from-pink-500 to-rose-600",
      cyan: "bg-gradient-to-br from-cyan-500 to-blue-600",
      lime: "bg-gradient-to-br from-lime-500 to-green-600",
      amber: "bg-gradient-to-br from-amber-500 to-orange-600",
    };
    
    return colorMap[color] || "bg-gradient-to-br from-blue-500 to-indigo-600";
  };
  
  const getHoverTextColor = (item: GridItem) => {
    const color = item.type === 'sound' ? item.color : 'amber';
    const colorMap: { [key: string]: string } = {
      purple: "group-hover:text-purple-400",
      green: "group-hover:text-green-400",
      red: "group-hover:text-red-400",
      yellow: "group-hover:text-yellow-400",
      blue: "group-hover:text-blue-400",
      indigo: "group-hover:text-indigo-400",
      pink: "group-hover:text-pink-400",
      cyan: "group-hover:text-cyan-400",
      lime: "group-hover:text-lime-400",
      amber: "group-hover:text-amber-400",
    };
    
    return colorMap[color] || "group-hover:text-blue-400";
  };
  
  if (allItems.length === 0) {
    return (
      <div className="text-center py-16">
        <i className="fas fa-music text-slate-600 text-6xl mb-4"></i>
        <h3 className="text-lg font-medium text-slate-400 mb-2">No Sound Effects or Scenes</h3>
        <p className="text-slate-500 text-sm">Click "Add Sound" or add lighting scenes to get started</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {allItems.map((item) => {
        const itemKey = `${item.type}-${item.id}`;
        const isActive = activeItems.has(itemKey);
        const icon = item.type === 'sound' ? item.icon : item.icon;
        
        return (
          <div
            key={itemKey}
            className={`${getItemStyle(item, isActive)} relative group`}
          >
            <div className="text-center" onClick={() => handleItemClick(item)}>
              <div className={`w-12 h-12 ${getIconBackgroundStyle(item)} rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform`}>
                <i className={`fas fa-${icon}`}></i>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <h3 className={`text-sm font-semibold text-white ${getHoverTextColor(item)} transition-colors`}>
                  {item.name}
                </h3>
                {item.type === 'scene' && (
                  <span className="text-xs bg-amber-600 text-white px-1 py-0.5 rounded">
                    Scene
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-slate-400 mt-1">{item.description}</p>
              )}
            </div>
            {item.type === 'scene' && onSceneEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 hover:bg-slate-700/80 text-white p-1 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onSceneEdit(item);
                }}
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
