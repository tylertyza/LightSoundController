import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Helper function to generate status circle color based on device state
const getDeviceStatusColor = (device: Device) => {
  // If device is off, return black
  if (device.power === false) {
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

interface DeviceManagementProps {
  devices: Device[];
  onDiscoverDevices: () => void;
}

export default function DeviceManagement({ devices, onDiscoverDevices }: DeviceManagementProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const adoptDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, adopt }: { deviceId: number; adopt: boolean }) => {
      const response = await apiRequest("POST", `/api/devices/${deviceId}/adopt`, { adopt });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Device updated",
        description: "Device adoption status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update device adoption status",
        variant: "destructive",
      });
    },
  });
  
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await apiRequest("DELETE", `/api/devices/${deviceId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Device deleted",
        description: "Device has been removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive",
      });
    },
  });
  
  const handleDiscoverDevices = async () => {
    setIsDiscovering(true);
    try {
      await apiRequest("POST", "/api/devices/discover");
      onDiscoverDevices();
      toast({
        title: "Discovery started",
        description: "Scanning for LIFX devices on the network",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start device discovery",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsDiscovering(false), 3000);
    }
  };
  
  const handleAdoptDevice = (device: Device) => {
    adoptDeviceMutation.mutate({ deviceId: device.id, adopt: !device.isAdopted });
  };
  
  const handleDeleteDevice = (deviceId: number) => {
    deleteDeviceMutation.mutate(deviceId);
  };
  
  return (
    <div className="w-full md:w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      <div className="p-3 md:p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center">
            <i className="fas fa-router mr-2"></i>
            Device Management
          </h2>
          {/* Close button for mobile */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('closeDevicePanel'))}
            className="md:hidden text-slate-400 hover:text-white p-1 touch-manipulation"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
      </div>
      
      {/* Device Discovery Section */}
      <div className="p-3 md:p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-medium text-slate-300">Discovery</h3>
          <Button
            onClick={handleDiscoverDevices}
            disabled={isDiscovering}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            <i className={`fas ${isDiscovering ? 'fa-spinner fa-spin' : 'fa-search'} mr-1`}></i>
            <span className="hidden sm:inline">{isDiscovering ? 'Scanning...' : 'Scan Network'}</span>
            <span className="sm:hidden">{isDiscovering ? 'Scan...' : 'Scan'}</span>
          </Button>
        </div>
        <div className="bg-slate-900 rounded-lg p-2 md:p-3">
          <div className="text-xs text-slate-400 mb-1 md:mb-2">UDP Port: 56700</div>
          <div className="text-xs text-slate-400">Rate Limit: 20 msg/sec</div>
        </div>
      </div>
      
      {/* Device List */}
      <div className="flex-1 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
        <div className="p-3 md:p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Connected Devices</h3>
          
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-lightbulb text-slate-600 text-3xl mb-2"></i>
              <p className="text-slate-400 text-sm">No devices found</p>
              <p className="text-slate-500 text-xs mt-1">Click "Scan Network" to discover devices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`bg-slate-900 rounded-lg p-3 border transition-colors ${
                    device.isAdopted ? 'border-blue-500 bg-blue-950' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                      {/* Status circle showing current light color/brightness */}
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: getDeviceStatusColor(device) }}
                        title={`${device.power ? 'On' : 'Off'} - ${device.brightness || 100}% brightness`}
                      />
                      <span className="text-sm font-medium text-white truncate">{device.label}</span>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleAdoptDevice(device)}
                        disabled={adoptDeviceMutation.isPending}
                        className={`text-xs px-2 py-1 rounded transition-colors touch-manipulation ${
                          device.isAdopted
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <i className={`fas ${device.isAdopted ? 'fa-minus' : 'fa-plus'}`}></i>
                        <span className="hidden sm:inline ml-1">{device.isAdopted ? 'Remove' : 'Adopt'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        disabled={deleteDeviceMutation.isPending}
                        className="text-slate-400 hover:text-red-400 text-xs p-1 touch-manipulation"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  {device.isAdopted && (
                    <div className="mb-2">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        Adopted
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>IP: <span className="text-slate-300">{device.ip}</span></div>
                      <div className="hidden sm:block">MAC: <span className="text-slate-300">{device.mac.substring(0, 8)}...</span></div>
                      <div>Type: <span className="text-slate-300">{device.deviceType}</span></div>
                    </div>
                    {device.lastSeen && (
                      <div>Last seen: <span className="text-slate-300">{new Date(device.lastSeen).toLocaleTimeString()}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
