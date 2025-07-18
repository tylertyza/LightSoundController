import { useState, useRef } from "react";
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
  onLightingEffectStop: (effect: LightEffect) => void;
  onSceneEdit?: (scene: Scene) => void;
  onLightingEffectEdit?: (effect: LightEffect) => void;
}

type GridItem = (SoundButton & { type: 'sound' }) | (Scene & { type: 'scene' }) | (LightEffect & { type: 'lighting' });

export default function SoundboardGrid({ soundButtons, scenes, lightingEffects, onSoundButtonClick, onSceneClick, onLightingEffectClick, onLightingEffectStop, onSceneEdit, onLightingEffectEdit }: SoundboardGridProps) {
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set());
  const [persistentActiveItems, setPersistentActiveItems] = useState<Set<string>>(new Set());
  const [progressItems, setProgressItems] = useState<Map<string, number>>(new Map());
  const [touchHandled, setTouchHandled] = useState<Set<string>>(new Set());
  // Store original device states for looping effects
  const originalDeviceStates = useRef<Map<string, any>>(new Map());
  // Add a lockout for lighting effect toggles
  const lightingEffectLockRef = useRef(false);
  
  // Separate items by type
  const soundItems = soundButtons.map(button => ({ ...button, type: 'sound' as const }));
  const sceneItems = scenes.map(scene => ({ ...scene, type: 'scene' as const }));
  const lightingItems = lightingEffects.map(effect => ({ ...effect, type: 'lighting' as const }));
  
  const handleItemClick = (item: GridItem) => {
    const itemKey = `${item.type}-${item.id}`;
    
    // For lighting effects, handle toggle logic
    if (item.type === 'lighting') {
      if (lightingEffectLockRef.current) return; // Prevent rapid toggling
      lightingEffectLockRef.current = true;
      setTimeout(() => { lightingEffectLockRef.current = false; }, 500); // 500ms lock
      const isCurrentlyActive = persistentActiveItems.has(itemKey);
      
      if (isCurrentlyActive) {
        // Remove frontend restore logic: do not call restoreState or POST to /api/devices/:id/restore
        // Just turn off this effect and let the backend handle restoration
        setPersistentActiveItems(new Set());
        setProgressItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemKey);
          return newMap;
        });
        // Stop the effect on the server
        onLightingEffectStop(item);
      } else {
        // Save original device state (parent must provide a callback)
        if ('saveDeviceState' in item && typeof (item as any).saveDeviceState === 'function') {
          // Save a restore function in the ref (no longer used for restore)
          originalDeviceStates.current.set(itemKey, (item as any).saveDeviceState());
        }
        // Turn on this effect and turn off others
        setPersistentActiveItems(new Set([itemKey]));
        setActiveItems(prev => new Set(prev).add(itemKey));
        
        onLightingEffectClick(item);
        
        // Check if it's a timed effect (not infinite loop)
        // Don't show progress bar for infinite loops (loopCount === 0)
        const isInfiniteLoop = (item as any)?.customJson?.loopCount === 0;
        if (!isInfiniteLoop) {
          const effectDuration = calculateEffectDuration(item);
          if (effectDuration > 0) {
            startProgressBar(itemKey, effectDuration);
          }
        }
      }
    } else {
      // For sound and scene effects, clear other active items
      setPersistentActiveItems(new Set([itemKey]));
      setActiveItems(prev => new Set(prev).add(itemKey));
      
      if (item.type === 'sound') {
        onSoundButtonClick(item);
        // Start progress bar for sound effects
        startProgressBar(itemKey, (item as any)?.duration || 3000);
      } else if (item.type === 'scene') {
        onSceneClick(item);
        // Scenes are persistent until another is selected
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

  const calculateEffectDuration = (effect: any) => {
    if (!effect.customJson) return effect.duration || 1000;
    
    const config = effect.customJson;
    const steps = config.steps || [];
    const loopCount = config.loopCount || 1;
    const globalDelay = config.globalDelay || 0;
    
    // Calculate duration of one cycle
    let cycleDuration = 0;
    steps.forEach((step: any) => {
      cycleDuration += (step.duration || 1000);
      cycleDuration += (step.delay || 0);
    });
    
    // Add global delay
    cycleDuration += globalDelay;
    
    // Multiply by loop count (if not infinite)
    if (loopCount === 0) return 0; // Infinite loop
    
    return cycleDuration * loopCount;
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
  
  // Replace getSceneColors with a version that returns both class and style
  const getSceneGradient = (scene: any) => {
    let hexColors: string[] = [];
    let tailwindColors: string[] = [];

    // 1. Try configuration.steps
    if (scene.configuration) {
      try {
        const config = typeof scene.configuration === 'string' ? JSON.parse(scene.configuration) : scene.configuration;
        if (config.steps && Array.isArray(config.steps)) {
          config.steps.forEach((step: any) => {
            if (step.color && /^#[0-9A-Fa-f]{6}$/.test(step.color)) {
              hexColors.push(step.color);
            } else if (step.color) {
              tailwindColors.push(`from-[${step.color}]`);
            }
          });
        }
        if (config.color && hexColors.length === 0 && /^#[0-9A-Fa-f]{6}$/.test(config.color)) {
          hexColors.push(config.color);
        } else if (config.color && tailwindColors.length === 0) {
          tailwindColors.push(`from-[${config.color}]`);
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Try scene.colors
    if (hexColors.length === 0 && scene.colors && Array.isArray(scene.colors)) {
      if (scene.colors.every((c: string) => /^#[0-9A-Fa-f]{6}$/.test(c))) {
        hexColors = scene.colors;
      } else {
        scene.colors.forEach((color: string, idx: number) => {
          if (idx === 0) tailwindColors.push(`from-[${color}]`);
          else if (idx === 1) tailwindColors.push(`to-[${color}]`);
        });
      }
    }

    // 3. Try deviceSettings
    if (hexColors.length === 0 && scene.deviceSettings) {
      const deviceColors = Object.values(scene.deviceSettings)
        .map((setting: any) => setting.color)
        .filter((c: string) => !!c);
      if (deviceColors.every((c: string) => /^#[0-9A-Fa-f]{6}$/.test(c))) {
        hexColors = deviceColors as string[];
      } else {
        deviceColors.forEach((color: string, idx: number) => {
          if (idx === 0) tailwindColors.push(`from-[${color}]`);
          else if (idx === 1) tailwindColors.push(`to-[${color}]`);
        });
      }
    }

    // 4. Fallbacks
    if (hexColors.length === 0 && tailwindColors.length === 0) {
      const sceneName = scene.name?.toLowerCase?.() || '';
      if (sceneName.includes('movie') || sceneName.includes('night') || sceneName.includes('warm')) {
        tailwindColors.push('from-amber-600');
      } else if (sceneName.includes('focus') || sceneName.includes('bright') || sceneName.includes('daylight')) {
        tailwindColors.push('from-blue-200');
      } else if (sceneName.includes('party') || sceneName.includes('colorful')) {
        tailwindColors.push('from-purple-500');
      } else if (sceneName.includes('relax') || sceneName.includes('sunset')) {
        tailwindColors.push('from-orange-400');
      } else {
        tailwindColors.push('from-slate-600');
      }
    }
    if (tailwindColors.length === 1) tailwindColors.push('to-slate-800');
    else if (tailwindColors.length > 1 && !tailwindColors.some(c => c.startsWith('to-'))) tailwindColors.push('to-slate-900');

    // If we have multiple hex colors, use inline linear-gradient
    if (hexColors.length > 1) {
      const stops = hexColors.join(', ');
      return {
        className: '',
        style: { background: `linear-gradient(135deg, ${stops})` }
      };
    } else if (hexColors.length === 1) {
      return {
        className: '',
        style: { background: hexColors[0] }
      };
    } else {
      return {
        className: `bg-gradient-to-br ${tailwindColors.join(' ')}`,
        style: undefined
      };
    }
  };

  // Update getItemStyle to use getSceneGradient
  const getItemStyle = (item: GridItem, isActive: boolean, isPersistent: boolean) => {
    const itemKey = `${item.type}-${item.id}`;
    const baseStyle = "relative rounded-xl p-2 md:p-4 hover:bg-slate-700 transition-all duration-200 cursor-pointer group border border-slate-700 overflow-hidden touch-manipulation";
    const sizeStyle = item.type === 'lighting' ? "h-16 md:h-20" : "h-24 md:h-32";
    let backgroundStyle = "bg-slate-800";
    let inlineStyle: any = undefined;
    if (item.type === 'scene') {
      const grad = getSceneGradient(item);
      backgroundStyle = grad.className || "";
      inlineStyle = grad.style;
    }
    const color = item.type === 'sound' ? item.color : item.type === 'lighting' ? 'cyan' : 'amber';
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
    return { className: `${baseStyle} ${sizeStyle} ${backgroundStyle} ${hoverStyle} ${activeStyle} ${persistentStyle}`.trim(), style: inlineStyle };
  };

  // Helper function to generate status circle color based on device state
  const getDeviceStatusColor = (device: any) => {
    if (!device.power) return '#000000';
    // Prefer RGB color if present
    if (device.color && device.color.r !== undefined && device.color.g !== undefined && device.color.b !== undefined) {
      return `rgb(${device.color.r},${device.color.g},${device.color.b})`;
    }
    // HSV/HSB color
    if (device.color?.hue !== undefined && device.color?.saturation !== undefined) {
      const hue = (device.color.hue / 65535) * 360;
      const saturation = device.color.saturation / 65535;
      const brightness = ((device.color.brightness || device.brightness || 100) / 65535) * 100;
      const c = (brightness / 100) * saturation;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = (brightness / 100) - c;
      let r, g, b;
      if (hue < 60) { r = c; g = x; b = 0; }
      else if (hue < 120) { r = x; g = c; b = 0; }
      else if (hue < 180) { r = 0; g = c; b = x; }
      else if (hue < 240) { r = 0; g = x; b = c; }
      else if (hue < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      return `rgb(${r},${g},${b})`;
    }
    // Kelvin/temperature fallback
    if (device.color?.kelvin && device.color.kelvin > 0) {
      const kelvin = device.color.kelvin;
      let r, g, b;
      if (kelvin <= 2000) { r = 255; g = 147; b = 41; }
      else if (kelvin <= 3000) { r = 255; g = 197; b = 143; }
      else if (kelvin <= 4000) { r = 255; g = 214; b = 170; }
      else if (kelvin <= 5000) { r = 255; g = 228; b = 206; }
      else { r = 255; g = 243; b = 239; }
      const brightness = (device.brightness || 100) / 100;
      r = Math.round(r * brightness);
      g = Math.round(g * brightness);
      b = Math.round(b * brightness);
      return `rgb(${r},${g},${b})`;
    }
    // Default to dim white
    const brightness = (device.brightness || 100) / 100;
    const gray = Math.round(255 * brightness);
    return `rgb(${gray},${gray},${gray})`;
  };

  const getSceneColors = (scene: any) => {
    // Extract colors from scene data for gradient
    const colors = [];
    
    // Check for JSON configuration first
    if (scene.configuration) {
      try {
        const config = typeof scene.configuration === 'string' ? JSON.parse(scene.configuration) : scene.configuration;
        
        // Check for steps array with color data
        if (config.steps && Array.isArray(config.steps)) {
          config.steps.forEach((step: any) => {
            if (step.color) {
              colors.push(`from-[${step.color}]`);
            }
          });
        }
        
        // Check for direct color property
        if (config.color && colors.length === 0) {
          colors.push(`from-[${config.color}]`);
        }
        
        // Check for brightness/temperature values to create warm colors
        if (colors.length === 0 && config.brightness !== undefined) {
          if (config.temperature && config.temperature <= 3000) {
            colors.push('from-amber-600');
          } else if (config.temperature && config.temperature >= 5000) {
            colors.push('from-blue-200');
          } else {
            colors.push('from-yellow-400');
          }
        }
      } catch (e) {
        // If JSON parsing fails, fall back to checking for color property
        if (scene.configuration?.color) {
          colors.push(`from-[${scene.configuration.color}]`);
        }
      }
    }
    
    // Check for colors array in scene definition (for default scenes)
    if (colors.length === 0 && scene.colors && Array.isArray(scene.colors)) {
      // If hex colors, use inline style
      if (scene.colors.every((c: string) => c.startsWith('#'))) {
        return scene.colors;
      }
      // Otherwise, use Tailwind classes
      scene.colors.forEach((color: string, index: number) => {
        if (index === 0) {
          colors.push(`from-[${color}]`);
        } else if (index === 1) {
          colors.push(`to-[${color}]`);
        }
      });
    }
    
    // Check for device-specific settings if no JSON colors found
    if (colors.length === 0 && scene.deviceSettings) {
      Object.values(scene.deviceSettings).forEach((setting: any) => {
        if (setting.color) {
          colors.push(`from-[${setting.color}]`);
        }
      });
    }
    
    // For default scenes, check the name for color hints
    if (colors.length === 0) {
      const sceneName = scene.name.toLowerCase();
      if (sceneName.includes('movie') || sceneName.includes('night') || sceneName.includes('warm')) {
        colors.push('from-amber-600');
      } else if (sceneName.includes('focus') || sceneName.includes('bright') || sceneName.includes('daylight')) {
        colors.push('from-blue-200');
      } else if (sceneName.includes('party') || sceneName.includes('colorful')) {
        colors.push('from-purple-500');
      } else if (sceneName.includes('relax') || sceneName.includes('sunset')) {
        colors.push('from-orange-400');
      } else {
        colors.push('from-slate-600'); // Default fallback
      }
    }
    
    // Add default colors for gradient if we have some
    if (colors.length === 1) {
      colors.push('to-slate-800');
    } else if (colors.length > 1 && !colors.some(c => c.startsWith('to-'))) {
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
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">{title}</h2>
        <div className={gridCols || "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4"}>
          {items.map((item) => {
            const itemKey = `${item.type}-${item.id}`;
            const isActive = activeItems.has(itemKey);
            const isPersistent = persistentActiveItems.has(itemKey);
            const progress = progressItems.get(itemKey) || 0;
            
            return (
              <div
                key={itemKey}
                className={getItemStyle(item, isActive, isPersistent).className}
                style={getItemStyle(item, isActive, isPersistent).style}
                onClick={(e) => {
                  e.stopPropagation();
                  const itemKey = `${item.type}-${item.id}`;
                  // Only handle click if touch wasn't already handled
                  if (!touchHandled.has(itemKey)) {
                    handleItemClick(item);
                  }
                  // Clear touch handled flag after a short delay
                  setTimeout(() => {
                    setTouchHandled(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(itemKey);
                      return newSet;
                    });
                  }, 100);
                }}
                onTouchStart={(e) => {
                  // Allow default touch behavior for proper mobile interaction
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const itemKey = `${item.type}-${item.id}`;
                  // Mark this item as touch handled
                  setTouchHandled(prev => new Set(prev).add(itemKey));
                  handleItemClick(item);
                  // Force blur to deselect the element after touch
                  if (e.target instanceof HTMLElement) {
                    e.target.blur();
                  }
                }}
              >
                <div className={`flex ${item.type === 'lighting' ? 'flex-row items-center' : 'flex-col items-center justify-center'} h-full text-center`}>
                  <div className={`${item.type === 'lighting' ? 'w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3' : 'w-8 h-8 md:w-10 md:h-10 mb-2'} rounded-lg flex items-center justify-center ${getIconBackgroundStyle(item)}`}>
                    <i className={`fas ${getIconComponent((item as any)?.icon, item.type)} text-white ${item.type === 'lighting' ? 'text-xs md:text-sm' : 'text-sm md:text-lg'}`}></i>
                  </div>
                  <div className={item.type === 'lighting' ? 'flex-1' : ''}>
                    <h3 className={`text-white font-medium mb-1 group-hover:text-blue-300 transition-colors drop-shadow-md ${item.type === 'lighting' ? 'text-xs md:text-sm' : 'text-xs md:text-sm'}`}>
                      {item.name}
                    </h3>
                    {(item as any)?.description && item.type !== 'lighting' && (
                      <p className="text-slate-200 text-xs line-clamp-2 group-hover:text-slate-300 transition-colors drop-shadow-sm">
                        {(item as any).description}
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
                    className="absolute top-1 right-1 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-6 h-6 touch-manipulation"
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
                    className="absolute top-1 right-1 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-6 h-6 touch-manipulation"
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
    <div className="space-y-4 md:space-y-6">
      {renderSection("Sound Effects", soundItems)}
      {renderSection("Lighting Scenes", sceneItems)}
      {renderSection("Lighting Effects", lightingItems, "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 md:gap-3")}
      
      {/* Empty State */}
      {soundItems.length === 0 && sceneItems.length === 0 && lightingItems.length === 0 && (
        <div className="text-center py-8 md:py-16">
          <div className="text-slate-400 text-base md:text-lg mb-4">
            <i className="fas fa-music text-4xl md:text-6xl mb-4"></i>
            <p>No effects available</p>
          </div>
          <p className="text-slate-500 text-sm">
            Click "Add Effect" to create your first sound or lighting effect
          </p>
        </div>
      )}
    </div>
  );
}
