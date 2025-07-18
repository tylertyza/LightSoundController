import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Device, Scene } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import LightingEffects from "./lighting-effects";

interface LightingControlsProps {
  devices: Device[];
}

export default function LightingControls({ devices }: LightingControlsProps) {
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [brightness, setBrightness] = useState(80);
  const [temperature, setTemperature] = useState(3500);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    
    selectedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { 
          hue: Math.round(hue / 360 * 65535), 
          saturation: Math.round(saturation * 65535), 
          brightness: brightnessValue, 
          kelvin: 0 // Use color instead of temperature
        }
      });
    });
  };
  
  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    
    if (selectedDeviceIds.length === 0) return;
    
    const brightnessValue = Math.round((newBrightness / 100) * 65535);
    
    selectedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { 
          hue: 0, 
          saturation: 0, 
          brightness: brightnessValue, 
          kelvin: 0 // Use brightness only without color or temp
        }
      });
    });
  };
  
  const handleTemperatureChange = (newTemperature: number) => {
    setTemperature(newTemperature);
    
    if (selectedDeviceIds.length === 0) return;
    
    const brightnessValue = Math.round((brightness / 100) * 65535);
    
    selectedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { 
          hue: 0, 
          saturation: 0, // Set to 0 to use white temperature instead of color
          brightness: brightnessValue, 
          kelvin: newTemperature 
        }
      });
    });
  };
  
  const handleSceneSelect = (sceneId: number) => {
    sceneApplyMutation.mutate(sceneId);
  };
  

  
  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-palette mr-2"></i>
          Lighting Controls
        </h2>
      </div>
      
      {/* Adopted Devices */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Adopted Devices</h3>
          {adoptedDevices.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs px-2 py-1 h-6 text-slate-400 border-slate-600 hover:bg-slate-700"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        {adoptedDevices.length === 0 ? (
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`device-${device.id}`}
                      checked={selectedDeviceIds.includes(device.id)}
                      onCheckedChange={(checked) => handleDeviceSelection(device.id, checked as boolean)}
                    />
                    <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm font-medium text-white">{device.label}</span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      

      
      {/* Color Control */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Color & Brightness</h3>
          <div className="text-xs text-slate-400">
            {selectedDeviceIds.length === 0 ? 'Select devices above' : `${selectedDeviceIds.length} device${selectedDeviceIds.length > 1 ? 's' : ''} selected`}
          </div>
        </div>
        
        {/* Color Picker */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Color</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
            disabled={selectedDeviceIds.length === 0}
            className="w-full h-10 bg-slate-900 border border-slate-600 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((temperature - 2500) / (9000 - 2500)) * 100}%, #374151 ${((temperature - 2500) / (9000 - 2500)) * 100}%, #374151 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Warm (2500K)</span>
            <span>Cool (9000K)</span>
          </div>
        </div>
      </div>
      

      

    </div>
  );
}
