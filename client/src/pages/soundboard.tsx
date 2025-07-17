import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DeviceManagement from "@/components/device-management";
import LightingControls from "@/components/lighting-controls";
import SoundboardGrid from "@/components/soundboard-grid";
import AudioUploadModal from "@/components/audio-upload-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAudio } from "@/hooks/use-audio";
import { Device, SoundButton, Scene, WebSocketMessage } from "@shared/schema";

export default function Soundboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.8);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [isDevicePanelOpen, setIsDevicePanelOpen] = useState(true);
  const [isLightingPanelOpen, setIsLightingPanelOpen] = useState(true);
  
  const { socket, sendMessage } = useWebSocket();
  const { playSound, setMasterVolume } = useAudio();
  
  const { data: devices = [], refetch: refetchDevices } = useQuery({
    queryKey: ['/api/devices'],
  });
  
  const { data: soundButtons = [], refetch: refetchSoundButtons } = useQuery({
    queryKey: ['/api/sound-buttons'],
  });
  
  const { data: scenes = [] } = useQuery({
    queryKey: ['/api/scenes'],
  });
  
  useEffect(() => {
    if (devices.length > 0) {
      setConnectedDevices(devices);
    }
  }, [devices]);
  
  useEffect(() => {
    setMasterVolume(globalVolume);
  }, [globalVolume, setMasterVolume]);
  
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'device_discovered':
          case 'device_status':
            setConnectedDevices(prev => {
              const existing = prev.find(d => d.id === message.payload.id);
              if (existing) {
                return prev.map(d => d.id === message.payload.id ? message.payload : d);
              }
              return [...prev, message.payload];
            });
            refetchDevices();
            break;
          case 'sound_played':
            // Handle sound played feedback
            break;
          case 'light_effect_triggered':
            // Handle light effect feedback
            break;
          case 'scene_applied':
            // Handle scene applied feedback
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, refetchDevices]);
  
  const handleSoundButtonClick = async (button: SoundButton) => {
    try {
      await playSound(`/api/audio/${button.audioFile}`);
      sendMessage({
        type: 'play_sound',
        payload: { buttonId: button.id }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };
  
  const handleDeviceDiscovery = () => {
    sendMessage({
      type: 'discover_devices',
      payload: {}
    });
  };
  
  const handleVolumeChange = (volume: number) => {
    setGlobalVolume(volume);
  };
  
  const handleAddSoundButton = () => {
    setIsUploadModalOpen(true);
  };
  
  const handleModalClose = () => {
    setIsUploadModalOpen(false);
  };
  
  const handleSoundSave = () => {
    setIsUploadModalOpen(false);
    refetchSoundButtons();
  };
  
  const onlineDevices = connectedDevices.filter(d => d.isOnline);
  
  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsDevicePanelOpen(!isDevicePanelOpen)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Toggle Device Panel"
            >
              <i className={`fas fa-${isDevicePanelOpen ? 'angle-left' : 'angle-right'} text-lg`}></i>
            </button>
            <i className="fas fa-lightbulb text-blue-400 text-2xl"></i>
            <h1 className="text-xl font-bold text-white">LIFX Sound & Light Control</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${socket ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className={`text-sm ${socket ? 'text-emerald-400' : 'text-red-400'}`}>
                {socket ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-slate-400">
              <i className="fas fa-network-wired mr-1"></i>
              <span>{onlineDevices.length}</span> devices found
            </div>
            <button
              onClick={() => setIsLightingPanelOpen(!isLightingPanelOpen)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Toggle Lighting Panel"
            >
              <i className={`fas fa-${isLightingPanelOpen ? 'angle-right' : 'angle-left'} text-lg`}></i>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex h-screen overflow-hidden">
        {/* Device Management Panel */}
        <div className={`transition-all duration-300 ${isDevicePanelOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <DeviceManagement
            devices={connectedDevices}
            onDiscoverDevices={handleDeviceDiscovery}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Sound & Light Board</h2>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-volume-up text-slate-400"></i>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={globalVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <button
                    onClick={handleAddSoundButton}
                    className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Sound
                  </button>
                </div>
              </div>
              
              <SoundboardGrid
                soundButtons={soundButtons}
                onSoundButtonClick={handleSoundButtonClick}
              />
            </div>
          </div>
        </div>
        
        {/* Lighting Controls Panel */}
        <div className={`transition-all duration-300 ${isLightingPanelOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <LightingControls
            devices={connectedDevices}
            scenes={scenes}
            onTriggerEffect={(deviceId, effectType, duration) => {
              sendMessage({
                type: 'trigger_effect',
                payload: { deviceId, effectType, duration }
              });
            }}
          />
        </div>
      </div>
      
      {/* Audio Upload Modal */}
      <AudioUploadModal
        isOpen={isUploadModalOpen}
        onClose={handleModalClose}
        onSave={handleSoundSave}
      />
    </div>
  );
}
