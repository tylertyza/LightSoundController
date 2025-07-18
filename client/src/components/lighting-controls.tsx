import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Device, Scene } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LightingEffects from "./lighting-effects";

interface LightingControlsProps {
  devices: Device[];
}

export default function LightingControls({ devices }: LightingControlsProps) {
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [brightness, setBrightness] = useState(80);
  const [temperature, setTemperature] = useState(3500);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const adoptedDevices = devices.filter(d => d.isAdopted && d.isOnline);
  
  const powerMutation = useMutation({
    mutationFn: async ({ deviceId, power }: { deviceId: number; power: boolean }) => {
      const response = await apiRequest("POST", `/api/devices/${deviceId}/power`, { power });
      return response.json();
    },
    onSuccess: () => {
      // Refresh devices after successful power change
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Success",
        description: "Device power updated successfully",
      });
    },
    onError: (error) => {
      console.error('Power toggle failed:', error);
      toast({
        title: "Error",
        description: "Failed to toggle device power",
        variant: "destructive",
      });
    },
  });
  
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
  
  const handleAllLightsOn = () => {
    adoptedDevices.forEach(device => {
      powerMutation.mutate({ deviceId: device.id, power: true });
    });
  };
  
  const handleAllLightsOff = () => {
    adoptedDevices.forEach(device => {
      powerMutation.mutate({ deviceId: device.id, power: false });
    });
  };
  
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    
    // Convert hex to HSL for LIFX
    const hue = 0; // Simplified for demo
    const saturation = 65535;
    const brightnessValue = Math.round((brightness / 100) * 65535);
    
    adoptedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { hue, saturation, brightness: brightnessValue, kelvin: temperature }
      });
    });
  };
  
  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    
    const brightnessValue = Math.round((newBrightness / 100) * 65535);
    
    adoptedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { hue: 0, saturation: 0, brightness: brightnessValue, kelvin: temperature }
      });
    });
  };
  
  const handleTemperatureChange = (newTemperature: number) => {
    setTemperature(newTemperature);
    
    const brightnessValue = Math.round((brightness / 100) * 65535);
    
    adoptedDevices.forEach(device => {
      colorMutation.mutate({
        deviceId: device.id,
        color: { hue: 0, saturation: 0, brightness: brightnessValue, kelvin: newTemperature }
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
        <h3 className="text-sm font-medium text-slate-300 mb-3">Adopted Devices</h3>
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
                className="bg-slate-900 rounded-lg p-2 border border-slate-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm font-medium text-white">{device.label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Status Indicator - Shows current power state */}
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      device.power 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      <i className={`fas ${device.power ? 'fa-lightbulb' : 'fa-power-off'} mr-1`}></i>
                      {device.power ? 'On' : 'Off'}
                    </div>
                    
                    {/* Power Control Buttons - Independent of status */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          console.log(`Turning ON device ${device.id} (${device.label})`);
                          powerMutation.mutate({ deviceId: device.id, power: true });
                        }}
                        disabled={powerMutation.isPending || device.power}
                        className={`text-xs px-2 py-1 rounded text-white disabled:opacity-50 ${
                          device.power 
                            ? 'bg-emerald-600 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                        title="Turn On"
                      >
                        <i className="fas fa-lightbulb"></i>
                      </button>
                      <button
                        onClick={() => {
                          console.log(`Turning OFF device ${device.id} (${device.label})`);
                          powerMutation.mutate({ deviceId: device.id, power: false });
                        }}
                        disabled={powerMutation.isPending || !device.power}
                        className={`text-xs px-2 py-1 rounded text-white disabled:opacity-50 ${
                          !device.power 
                            ? 'bg-slate-600 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        title="Turn Off"
                      >
                        <i className="fas fa-power-off"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Controls */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleAllLightsOn}
            disabled={powerMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <i className="fas fa-lightbulb mr-1"></i>
            All On
          </Button>
          <Button
            onClick={handleAllLightsOff}
            disabled={powerMutation.isPending}
            className="bg-slate-600 hover:bg-slate-700"
            size="sm"
          >
            <i className="fas fa-power-off mr-1"></i>
            All Off
          </Button>
        </div>
      </div>
      
      {/* Color Control */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Color & Brightness</h3>
        
        {/* Color Picker */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Color</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-10 bg-slate-900 border border-slate-600 rounded cursor-pointer"
          />
        </div>
        
        {/* Brightness Slider */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Brightness</label>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Temperature Slider */}
        <div>
          <label className="block text-xs text-slate-400 mb-2">Temperature</label>
          <input
            type="range"
            min="2500"
            max="9000"
            value={temperature}
            onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Warm</span>
            <span>Cool</span>
          </div>
        </div>
      </div>
      

      

    </div>
  );
}
