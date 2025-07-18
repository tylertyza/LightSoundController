import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Device, Scene } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import LightingEffects from "./lighting-effects";

// Helper function to generate status circle color based on device state
const getDeviceStatusColor = (device: Device) => {
  // If device is off, return black
  if (!device.power) {
    return '#000000';
  }
  
  // If device uses temperature/kelvin (white light)
  if (device.color?.kelvin && device.color.kelvin > 0) {
    // Convert kelvin to RGB-ish color
    const kelvin = device.color.kelvin;
    let r, g, b;
    
    if (kelvin <= 2000) {
      r = 255; g = 147; b = 41;
    } else if (kelvin <= 3000) {
      r = 255; g = 197; b = 143;
    } else if (kelvin <= 4000) {
      r = 255; g = 214; b = 170;
    } else if (kelvin <= 5000) {
      r = 255; g = 228; b = 206;
    } else {
      r = 255; g = 243; b = 239;
    }
    
    // Apply brightness
    const brightness = (device.brightness || 100) / 100;
    r = Math.round(r * brightness);
    g = Math.round(g * brightness);
    b = Math.round(b * brightness);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // If device uses color (HSV/HSB)
  if (device.color?.hue !== undefined && device.color?.saturation !== undefined) {
    const hue = (device.color.hue / 65535) * 360;
    const saturation = device.color.saturation / 65535;
    const brightness = ((device.color.brightness || device.brightness || 100) / 65535) * 100;
    
    // Convert HSV to RGB
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
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Default to dim white if no color info
  const brightness = (device.brightness || 100) / 100;
  const gray = Math.round(255 * brightness);
  return `rgb(${gray}, ${gray}, ${gray})`;
};

interface LightingControlsProps {
  devices: Device[];
}

export default function LightingControls({ devices }: LightingControlsProps) {
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [brightness, setBrightness] = useState(80);
  const [temperature, setTemperature] = useState(3500);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [isDevicesCollapsed, setIsDevicesCollapsed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Debouncing refs for performance
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<number, any>>(new Map());
  
  const adoptedDevices = devices.filter(d => d.isAdopted && d.isOnline);
  const selectedDevices = adoptedDevices.filter(d => selectedDeviceIds.includes(d.id));
  
  // Update controls when device selection changes
  useEffect(() => {
    if (selectedDevices.length === 1) {
      // Single device selected - show its current values
      const device = selectedDevices[0];
      setBrightness(device.brightness || 80);
      setTemperature(device.temperature || 3500);
    } else if (selectedDevices.length > 1) {
      // Multiple devices - show average values
      const avgBrightness = selectedDevices.reduce((sum, d) => sum + (d.brightness || 80), 0) / selectedDevices.length;
      const avgTemperature = selectedDevices.reduce((sum, d) => sum + (d.temperature || 3500), 0) / selectedDevices.length;
      setBrightness(Math.round(avgBrightness));
      setTemperature(Math.round(avgTemperature));
    }
  }, [selectedDevices]);
  
  const handleDeviceSelection = (deviceId: number, selected: boolean) => {
    setSelectedDeviceIds(prev => 
      selected 
        ? [...prev, deviceId]
        : prev.filter(id => id !== deviceId)
    );
  };
  
  const handleSelectAll = () => {
    setSelectedDeviceIds(adoptedDevices.map(d => d.id));
  };
  
  const handleDeselectAll = () => {
    setSelectedDeviceIds([]);
  };
  

  
  const colorMutation = useMutation({
    mutationFn: async ({ deviceId, color }: { deviceId: number; color: any }) => {
      const response = await apiRequest("POST", `/api/devices/${deviceId}/color`, color);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });
  
  const sceneApplyMutation = useMutation({
    mutationFn: async (sceneId: number) => {
      const response = await apiRequest("POST", `/api/scenes/${sceneId}/apply`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Scene applied",
        description: "Lighting scene has been applied to all devices",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to apply scene",
        variant: "destructive",
      });
    },
  });

  const powerMutation = useMutation({
    mutationFn: async ({ deviceId, power }: { deviceId: number; power: boolean }) => {
      const response = await apiRequest("POST", `/api/devices/${deviceId}/power`, { power });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update device power",
        variant: "destructive",
      });
    },
  });
  

  
  // Debounced update function
  const debouncedUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const updates = Array.from(pendingUpdatesRef.current.entries());
      pendingUpdatesRef.current.clear();
      
      updates.forEach(([deviceId, colorData]) => {
        colorMutation.mutate({
          deviceId,
          color: colorData
        });
      });
    }, 150); // 150ms debounce delay
  }, [colorMutation]);
  
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    
    if (selectedDeviceIds.length === 0) return;
    
    // Convert hex to HSB for LIFX
    const colorWithoutHash = color.replace('#', '');
    const r = parseInt(colorWithoutHash.substr(0, 2), 16) / 255;
    const g = parseInt(colorWithoutHash.substr(2, 2), 16) / 255;
    const b = parseInt(colorWithoutHash.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let hue = 0;
    if (diff !== 0) {
      if (max === r) hue = ((g - b) / diff) % 6;
      else if (max === g) hue = (b - r) / diff + 2;
      else hue = (r - g) / diff + 4;
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    const saturation = max === 0 ? 0 : diff / max;
    const brightnessValue = Math.round((brightness / 100) * 65535);
    
    const colorData = { 
      hue: Math.round(hue / 360 * 65535), 
      saturation: Math.round(saturation * 65535), 
      brightness: brightnessValue, 
      kelvin: 0 // Use color instead of temperature
    };
    
    selectedDevices.forEach(device => {
      pendingUpdatesRef.current.set(device.id, colorData);
    });
    
    debouncedUpdate();
  };
  
  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    
    if (selectedDeviceIds.length === 0) return;
    
    const brightnessValue = Math.round((newBrightness / 100) * 65535);
    
    const colorData = { 
      hue: 0, 
      saturation: 0, 
      brightness: brightnessValue, 
      kelvin: 0 // Use brightness only without color or temp
    };
    
    selectedDevices.forEach(device => {
      pendingUpdatesRef.current.set(device.id, colorData);
    });
    
    debouncedUpdate();
  };
  
  const handleTemperatureChange = (newTemperature: number) => {
    setTemperature(newTemperature);
    
    if (selectedDeviceIds.length === 0) return;
    
    const brightnessValue = Math.round((brightness / 100) * 65535);
    
    const colorData = { 
      hue: 0, 
      saturation: 0, // Set to 0 to use white temperature instead of color
      brightness: brightnessValue, 
      kelvin: newTemperature 
    };
    
    selectedDevices.forEach(device => {
      pendingUpdatesRef.current.set(device.id, colorData);
    });
    
    debouncedUpdate();
  };
  
  const handleSceneSelect = (sceneId: number) => {
    sceneApplyMutation.mutate(sceneId);
  };

  const handlePowerToggle = (power: boolean) => {
    if (selectedDeviceIds.length === 0) return;
    
    selectedDevices.forEach(device => {
      powerMutation.mutate({
        deviceId: device.id,
        power: power
      });
    });
  };
  

  
  return (
    <div className="w-full md:w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      <div className="p-3 md:p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center">
            <i className="fas fa-magic mr-2"></i>
            Light Studio
          </h2>
          {/* Close button for mobile */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('closeLightingPanel'))}
            className="md:hidden text-slate-400 hover:text-white p-1 touch-manipulation"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
      </div>
      
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
        {/* Adopted Devices */}
        <div className="p-3 md:p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <button
              onClick={() => setIsDevicesCollapsed(!isDevicesCollapsed)}
              className="flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <i className={`fas fa-chevron-${isDevicesCollapsed ? 'right' : 'down'} mr-2 text-xs`}></i>
              Adopted Devices ({adoptedDevices.length})
            </button>
            {adoptedDevices.length > 0 && !isDevicesCollapsed && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700 touch-manipulation"
                >
                  <span className="hidden sm:inline">Select All</span>
                  <span className="sm:hidden">All</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700 touch-manipulation"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          {!isDevicesCollapsed && (
            adoptedDevices.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-plus-circle text-slate-600 text-2xl mb-2"></i>
                <p className="text-slate-400 text-sm">No devices adopted</p>
                <p className="text-slate-500 text-xs mt-1">Adopt devices from the discovery panel to control them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adoptedDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`bg-slate-900 rounded-lg p-2 border transition-colors ${
                      selectedDeviceIds.includes(device.id) 
                        ? 'border-blue-500 bg-blue-950' 
                        : 'border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Checkbox
                          id={`device-${device.id}`}
                          checked={selectedDeviceIds.includes(device.id)}
                          onCheckedChange={(checked) => handleDeviceSelection(device.id, checked as boolean)}
                        />
                        <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm font-medium text-white truncate">{device.label}</span>
                      </div>
                      {/* Status circle showing current light color/brightness */}
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0 ml-2"
                        style={{ backgroundColor: getDeviceStatusColor(device) }}
                        title={`${device.power ? 'On' : 'Off'} - ${device.brightness || 100}% brightness`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      

        
        {/* Color Control */}
        <div className="p-3 md:p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-medium text-slate-300">Color & Brightness</h3>
            <div className="text-xs text-slate-400">
              {selectedDeviceIds.length === 0 ? 'Select devices above' : `${selectedDeviceIds.length} device${selectedDeviceIds.length > 1 ? 's' : ''} selected`}
            </div>
          </div>

        {/* Power Toggle */}
        {selectedDeviceIds.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Power</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePowerToggle(false)}
                  disabled={powerMutation.isPending}
                  className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700 touch-manipulation"
                >
                  <i className="fas fa-power-off mr-1"></i>
                  Off
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePowerToggle(true)}
                  disabled={powerMutation.isPending}
                  className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700 touch-manipulation"
                >
                  <i className="fas fa-lightbulb mr-1"></i>
                  On
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Color Picker */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Color</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
            disabled={selectedDeviceIds.length === 0}
            className="w-full h-10 md:h-12 bg-slate-900 border border-slate-600 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          />
        </div>
        
        {/* Brightness Slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Brightness</label>
            <span className="text-xs text-slate-300 font-medium">{brightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
            disabled={selectedDeviceIds.length === 0}
            className="w-full h-3 md:h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${brightness}%, #374151 ${brightness}%, #374151 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Temperature Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Temperature</label>
            <span className="text-xs text-slate-300 font-medium">{temperature}K</span>
          </div>
          <input
            type="range"
            min="2500"
            max="9000"
            value={temperature}
            onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
            disabled={selectedDeviceIds.length === 0}
            className="w-full h-3 md:h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((temperature - 2500) / (9000 - 2500)) * 100}%, #374151 ${((temperature - 2500) / (9000 - 2500)) * 100}%, #374151 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span className="hidden sm:inline">Warm (2500K)</span>
            <span className="sm:hidden">Warm</span>
            <span className="hidden sm:inline">Cool (9000K)</span>
            <span className="sm:hidden">Cool</span>
          </div>
        </div>
        </div>
        
        {/* Lighting Effects */}
        <div className="border-t border-slate-700">
          <LightingEffects devices={devices} />
        </div>
      </div>
    </div>
  );
}
