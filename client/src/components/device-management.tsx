import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-cog mr-2"></i>
          Device Management
        </h2>
      </div>
      
      {/* Device Discovery Section */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Discovery</h3>
          <Button
            onClick={handleDiscoverDevices}
            disabled={isDiscovering}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <i className={`fas ${isDiscovering ? 'fa-spinner fa-spin' : 'fa-search'} mr-1`}></i>
            {isDiscovering ? 'Scanning...' : 'Scan Network'}
          </Button>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">UDP Port: 56700</div>
          <div className="text-xs text-slate-400">Rate Limit: 20 msg/sec</div>
        </div>
      </div>
      
      {/* Device List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
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
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                      <span className="text-sm font-medium text-white">{device.label}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleAdoptDevice(device)}
                        disabled={adoptDeviceMutation.isPending}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          device.isAdopted
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <i className={`fas ${device.isAdopted ? 'fa-minus' : 'fa-plus'} mr-1`}></i>
                        {device.isAdopted ? 'Remove' : 'Adopt'}
                      </button>
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        disabled={deleteDeviceMutation.isPending}
                        className="text-slate-400 hover:text-red-400 text-xs"
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
                    <div>IP: <span className="text-slate-300">{device.ip}</span></div>
                    <div>MAC: <span className="text-slate-300">{device.mac}</span></div>
                    <div>Type: <span className="text-slate-300">{device.deviceType}</span></div>
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
