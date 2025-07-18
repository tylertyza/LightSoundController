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
  onLightingEffectEdit?: (effect: LightEffect) => void;
}

type GridItem = (SoundButton & { type: 'sound' }) | (Scene & { type: 'scene' }) | (LightEffect & { type: 'lighting' });

export default function SoundboardGrid({ soundButtons, scenes, lightingEffects, onSoundButtonClick, onSceneClick, onLightingEffectClick, onSceneEdit, onLightingEffectEdit }: SoundboardGridProps) {
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set());
  const [persistentActiveItems, setPersistentActiveItems] = useState<Set<string>>(new Set());
  const [progressItems, setProgressItems] = useState<Map<string, number>>(new Map());
  
  // Separate items by type
  const soundItems = soundButtons.map(button => ({ ...button, type: 'sound' as const }));
  const sceneItems = scenes.map(scene => ({ ...scene, type: 'scene' as const }));
  const lightingItems = lightingEffects.map(effect => ({ ...effect, type: 'lighting' as const }));
  
  const handleItemClick = (item: GridItem) => {
    const itemKey = `${item.type}-${item.id}`;
    
    // Clear other active items when selecting a new one
    setPersistentActiveItems(new Set([itemKey]));
    setActiveItems(prev => new Set(prev).add(itemKey));
    
    if (item.type === 'sound') {
      onSoundButtonClick(item);
      // Start progress bar for sound effects
      startProgressBar(itemKey, item.duration || 3000);
    } else if (item.type === 'scene') {
      onSceneClick(item);
      // Scenes are persistent until another is selected
    } else if (item.type === 'lighting') {
      onLightingEffectClick(item);
      // Check if it's a looping effect
      if (item.duration && item.duration > 0) {
        startProgressBar(itemKey, item.duration);
      }
    }
    
    // Remove active state after animation
    setTimeout(() => {
      setActiveItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }, 300);
  };

  const startProgressBar = (itemKey: string, duration: number) => {
    setProgressItems(prev => new Map(prev).set(itemKey, 0));
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setProgressItems(prev => new Map(prev).set(itemKey, progress));
      
      if (progress >= 1) {
        clearInterval(interval);
        setProgressItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemKey);
          return newMap;
        });
        
        // Remove from persistent active if it's not a looping effect
        if (!itemKey.includes('scene')) {
          setPersistentActiveItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
        }
      }
    }, 50);
  };
  
  const getItemStyle = (item: GridItem, isActive: boolean, isPersistent: boolean) => {
    const itemKey = `${item.type}-${item.id}`;
    const baseStyle = "relative rounded-xl p-4 hover:bg-slate-700 transition-all duration-200 cursor-pointer group border border-slate-700 overflow-hidden";
    
    // Different sizing for lighting effects
    const sizeStyle = item.type === 'lighting' ? "h-20" : "h-32";
    
    // Background styles
    let backgroundStyle = "bg-slate-800";
    if (item.type === 'scene') {
      // Generate gradient background based on scene colors
      const sceneColors = getSceneColors(item);
      if (sceneColors.length > 0) {
        backgroundStyle = `bg-gradient-to-br ${sceneColors.join(' ')}`;
      }
    }
    
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
    const persistentStyle = isPersistent ? "ring-2 ring-blue-500 ring-opacity-75" : "";
    const hoverStyle = colorMap[color] || "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20";
    
    return `${baseStyle} ${sizeStyle} ${backgroundStyle} ${hoverStyle} ${activeStyle} ${persistentStyle}`;
  };

  const getSceneColors = (scene: any) => {
    // Extract colors from scene data for gradient
    const colors = [];
    
    // Check for device-specific settings first
    if (scene.deviceSettings) {
      Object.values(scene.deviceSettings).forEach((setting: any) => {
        if (setting.color) {
          colors.push(`from-[${setting.color}]`);
        }
      });
    }
    
    // Fallback to configuration color if no device settings
    if (colors.length === 0 && scene.configuration?.color) {
      colors.push(`from-[${scene.configuration.color}]`);
    }
    
    // Add default colors for gradient if we have some
    if (colors.length === 1) {
      colors.push('to-slate-800');
    } else if (colors.length > 1) {
      colors.push('to-slate-900');
    }
    
    return colors.slice(0, 3); // Limit to 3 colors for gradient
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
  
  const getIconComponent = (icon: string, type: 'sound' | 'scene' | 'lighting') => {
    const iconMap: { [key: string]: string } = {
      'volume-2': 'fa-volume-up',
      'music': 'fa-music',
      'zap': 'fa-bolt',
      'bell': 'fa-bell',
      'megaphone': 'fa-bullhorn',
      'lightbulb': 'fa-lightbulb',
      'sun': 'fa-sun',
      'moon': 'fa-moon',
      'rainbow': 'fa-rainbow',
      'palette': 'fa-palette',
      'home': 'fa-home',
      'film': 'fa-film',
      'bed': 'fa-bed',
      'gamepad': 'fa-gamepad',
      'coffee': 'fa-coffee',
      'utensils': 'fa-utensils',
      'bath': 'fa-bath',
      'car': 'fa-car',
      'plane': 'fa-plane',
      'bicycle': 'fa-bicycle',
      'heart': 'fa-heart',
      'star': 'fa-star',
      'gift': 'fa-gift',
      'flag': 'fa-flag',
      'trophy': 'fa-trophy',
      // Lighting effect specific icons
      'flash': 'fa-bolt',
      'strobe': 'fa-stroopwafel',
      'fade': 'fa-adjust',
      'cycle': 'fa-sync-alt',
      'breathe': 'fa-wind',
      'pulse': 'fa-heartbeat',
    };
    
    return iconMap[icon] || 'fa-circle';
  };

  if (soundItems.length === 0 && sceneItems.length === 0 && lightingItems.length === 0) {
    return (
      <div className="text-center py-16">
        <i className="fas fa-music text-slate-600 text-6xl mb-4"></i>
        <h3 className="text-lg font-medium text-slate-400 mb-2">No Sound Effects or Scenes</h3>
        <p className="text-slate-500 text-sm">Click "Add Effect" to get started</p>
      </div>
    );
  }
  
  const renderSection = (title: string, items: GridItem[], gridCols?: string) => {
    if (items.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className={gridCols || "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"}>
          {items.map((item) => {
            const itemKey = `${item.type}-${item.id}`;
            const isActive = activeItems.has(itemKey);
            const isPersistent = persistentActiveItems.has(itemKey);
            const progress = progressItems.get(itemKey) || 0;
            
            return (
              <div
                key={itemKey}
                className={getItemStyle(item, isActive, isPersistent)}
                onClick={() => handleItemClick(item)}
              >
                <div className={`flex ${item.type === 'lighting' ? 'flex-row items-center' : 'flex-col items-center justify-center'} h-full text-center`}>
                  <div className={`${item.type === 'lighting' ? 'w-8 h-8 mr-3' : 'w-10 h-10 mb-2'} rounded-lg flex items-center justify-center ${getIconBackgroundStyle(item)}`}>
                    <i className={`fas ${getIconComponent(item.icon, item.type)} text-white ${item.type === 'lighting' ? 'text-sm' : 'text-lg'}`}></i>
                  </div>
                  <div className={item.type === 'lighting' ? 'flex-1' : ''}>
                    <h3 className={`text-white font-medium mb-1 group-hover:text-blue-300 transition-colors ${item.type === 'lighting' ? 'text-sm' : 'text-sm'}`}>
                      {item.name}
                    </h3>
                    {item.description && item.type !== 'lighting' && (
                      <p className="text-slate-400 text-xs line-clamp-2 group-hover:text-slate-300 transition-colors">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                {progress > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-100 ease-out"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}
                
                {item.type === 'scene' && onSceneEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSceneEdit(item);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-6 h-6"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
                
                {item.type === 'lighting' && onLightingEffectEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLightingEffectEdit(item);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-6 h-6"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSection("Sound Effects", soundItems)}
      {renderSection("Lighting Scenes", sceneItems)}
      {renderSection("Lighting Effects", lightingItems, "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3")}
    </div>
  );
}
