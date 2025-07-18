import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DeviceManagement from "@/components/device-management";
import LightingControls from "@/components/lighting-controls";
import LightingEffects from "@/components/lighting-effects";
import SoundboardGrid from "@/components/soundboard-grid";
import { AddEffectModal } from "@/components/add-effect-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAudio } from "@/hooks/use-audio";
import { Device, SoundButton, Scene, WebSocketMessage, LightEffect } from "@shared/schema";
import { Zap } from "lucide-react";

export default function Soundboard() {
  const [isAddEffectModalOpen, setIsAddEffectModalOpen] = useState(false);
  const [isEditSceneModalOpen, setIsEditSceneModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editingLightingEffect, setEditingLightingEffect] = useState<LightEffect | null>(null);
  const [globalVolume, setGlobalVolume] = useState(0.8);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [isDevicePanelOpen, setIsDevicePanelOpen] = useState(true);
  const [isLightingPanelOpen, setIsLightingPanelOpen] = useState(true);
  const [availableLightingEffects, setAvailableLightingEffects] = useState<any[]>([]);

  
  const { socket, sendMessage } = useWebSocket();
  const { playSound, setMasterVolume } = useAudio();
  const queryClient = useQueryClient();
  
  const { data: devices = [], refetch: refetchDevices } = useQuery({
    queryKey: ['/api/devices'],
  });
  
  const { data: soundButtons = [], refetch: refetchSoundButtons } = useQuery({
    queryKey: ['/api/sound-buttons'],
  });
  
  const { data: scenes = [], refetch: refetchScenes } = useQuery({
    queryKey: ['/api/scenes'],
  });

  const { data: lightingEffects = [], refetch: refetchLightingEffects } = useQuery({
    queryKey: ['/api/light-effects'],
  });
  
  useEffect(() => {
    if (devices.length > 0) {
      setConnectedDevices(devices);
    }
  }, [devices]);

  // Periodic refresh for device status colors every second
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDevices();
    }, 1000);

    return () => clearInterval(interval);
  }, [refetchDevices]);
  
  useEffect(() => {
    setMasterVolume(globalVolume);
  }, [globalVolume, setMasterVolume]);

  // Set appropriate default states for mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setIsDevicePanelOpen(false);
        setIsLightingPanelOpen(false);
      } else {
        setIsDevicePanelOpen(true);
        setIsLightingPanelOpen(true);
      }
    };

    // Set initial state based on screen size
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Listen for close panel events from mobile close buttons
  useEffect(() => {
    const handleCloseDevicePanel = () => setIsDevicePanelOpen(false);
    const handleCloseLightingPanel = () => setIsLightingPanelOpen(false);
    
    window.addEventListener('closeDevicePanel', handleCloseDevicePanel);
    window.addEventListener('closeLightingPanel', handleCloseLightingPanel);
    
    return () => {
      window.removeEventListener('closeDevicePanel', handleCloseDevicePanel);
      window.removeEventListener('closeLightingPanel', handleCloseLightingPanel);
    };
  }, []);
  
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'device_discovered':
          case 'device_status':
          case 'device_state_update':
          case 'device_power_update':
            // Update the local state immediately
            setConnectedDevices(prev => {
              const existing = prev.find(d => d.id === message.payload.id);
              if (existing) {
                return prev.map(d => d.id === message.payload.id ? message.payload : d);
              }
              return [...prev, message.payload];
            });
            // Also update the query cache for immediate UI updates
            queryClient.setQueryData(['/api/devices'], (oldData: Device[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.map(device => 
                device.id === message.payload.id ? message.payload : device
              );
            });
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
  }, [socket, refetchDevices, queryClient]);
  
  const handleSoundButtonClick = async (button: SoundButton) => {
    try {
      await playSound(`/api/audio/${button.audioFile}`, button.volume || 80);
      
      // Trigger lighting effect if one is assigned
      if (button.lightEffect && button.lightEffect !== 'none') {
        const devices = connectedDevices.filter(d => d.isOnline && d.isAdopted);
        
        if (devices.length > 0) {
          const response = await fetch(`/api/light-effects/${button.lightEffect}/apply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            console.error('Error applying light effect:', await response.text());
          }
        }
      }
      
      sendMessage({
        type: 'play_sound',
        payload: { buttonId: button.id }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleSceneClick = async (scene: Scene) => {
    try {
      const response = await fetch(`/api/scenes/${scene.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        sendMessage({
          type: 'scene_applied',
          payload: { sceneId: scene.id }
        });
      } else {
        console.error('Error applying scene:', await response.text());
      }
    } catch (error) {
      console.error('Error applying scene:', error);
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
  
  const handleAddEffect = () => {
    setIsAddEffectModalOpen(true);
  };
  
  const handleModalClose = () => {
    setIsAddEffectModalOpen(false);
    setEditingLightingEffect(null);
  };

  const handleLightingEffectSave = async (effectData: any) => {
    if (editingLightingEffect) {
      // Update existing lighting effect
      try {
        const response = await fetch(`/api/light-effects/${editingLightingEffect.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(effectData),
        });

        if (response.ok) {
          refetchLightingEffects();
          setIsAddEffectModalOpen(false);
          setEditingLightingEffect(null);
        }
      } catch (error) {
        console.error('Error updating lighting effect:', error);
      }
    } else {
      // Create new lighting effect
      try {
        const response = await fetch('/api/light-effects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(effectData),
        });

        if (response.ok) {
          refetchLightingEffects();
          setIsAddEffectModalOpen(false);
        }
      } catch (error) {
        console.error('Error creating lighting effect:', error);
      }
    }
  };
  
  const handleSoundSave = async (soundData: any) => {
    try {
      const formData = new FormData();
      formData.append('name', soundData.name);
      formData.append('description', soundData.description || '');
      formData.append('color', soundData.color);
      formData.append('icon', soundData.icon);
      formData.append('lightEffect', soundData.lightEffect);
      formData.append('volume', soundData.volume.toString());
      formData.append('audio', soundData.audioFile);

      const response = await fetch('/api/sound-buttons', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        refetchSoundButtons();
        setIsAddEffectModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving sound:', error);
    }
  };

  const handleSceneSave = async (sceneData: any) => {
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneData),
      });

      if (response.ok) {
        refetchScenes();
        setIsAddEffectModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving scene:', error);
    }
  };

  const handleSceneUpdate = async (sceneData: any) => {
    if (editingScene) {
      try {
        const response = await fetch(`/api/scenes/${editingScene.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sceneData),
        });

        if (response.ok) {
          refetchScenes();
          setIsAddEffectModalOpen(false);
          setEditingScene(null);
        }
      } catch (error) {
        console.error('Error updating scene:', error);
      }
    }
  };

  const handleSceneEdit = (scene: Scene) => {
    setEditingScene(scene);
    setIsEditSceneModalOpen(true);
  };

  const handleLightingEffectEdit = (effect: LightEffect) => {
    setEditingLightingEffect(effect);
    setIsAddEffectModalOpen(true);
  };

  const handleSceneDelete = async (sceneId: number) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        refetchScenes();
        setEditingScene(null);
        setIsEditSceneModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting scene:', error);
    }
  };

  const handleLightingEffectClick = async (effect: any) => {
    try {
      const devices = connectedDevices.filter(d => d.isOnline && d.isAdopted);
      
      if (devices.length > 0) {
        const response = await fetch(`/api/light-effects/${effect.id}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ loopCount: 1 }),
        });
        
        if (response.ok) {
          sendMessage({
            type: 'light_effect_applied',
            payload: { effectId: effect.id }
          });
        } else {
          console.error('Error applying lighting effect:', await response.text());
        }
      }
    } catch (error) {
      console.error('Error applying lighting effect:', error);
    }
  };

  const handleLightingEffectStop = async (effect: any) => {
    try {
      const devices = connectedDevices.filter(d => d.isOnline && d.isAdopted);
      
      if (devices.length > 0) {
        const response = await fetch(`/api/light-effects/${effect.id}/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          sendMessage({
            type: 'light_effect_stopped',
            payload: { effectId: effect.id }
          });
        } else {
          console.error('Error stopping lighting effect:', await response.text());
        }
      }
    } catch (error) {
      console.error('Error stopping lighting effect:', error);
    }
  };


  
  const onlineDevices = connectedDevices.filter(d => d.isOnline);
  
  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <button
              onClick={() => setIsDevicePanelOpen(!isDevicePanelOpen)}
              className="hidden md:block text-slate-400 hover:text-white transition-colors p-1 touch-manipulation"
              title="Toggle Device Panel"
            >
              <i className={`fas fa-${isDevicePanelOpen ? 'angle-left' : 'angle-right'} text-lg`}></i>
            </button>
            <i className="fas fa-lightbulb text-blue-400 text-xl md:text-2xl"></i>
            <h1 className="text-lg md:text-xl font-bold text-white truncate">
              <span className="hidden sm:inline">LIFX Sound & Light Control</span>
              <span className="sm:hidden">LIFX Control</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${socket ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className={`text-sm ${socket ? 'text-emerald-400' : 'text-red-400'} hidden sm:inline`}>
                {socket ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-slate-400 hidden md:block">
              <i className="fas fa-network-wired mr-1"></i>
              <span>{onlineDevices.length}</span> devices found
            </div>
            <button
              onClick={() => setIsLightingPanelOpen(!isLightingPanelOpen)}
              className="hidden md:block text-slate-400 hover:text-white transition-colors p-1 touch-manipulation"
              title="Toggle Lighting Panel"
            >
              <i className={`fas fa-${isLightingPanelOpen ? 'angle-right' : 'angle-left'} text-lg`}></i>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex h-screen overflow-hidden">
        {/* Device Management Panel - Mobile: Overlay, Desktop: Sidebar */}
        <div className={`
          z-20
          md:relative md:block md:transition-all md:duration-300 md:ease-in-out
          ${isDevicePanelOpen ? 'md:w-80' : 'md:w-0'}
        `}>
          {/* Mobile backdrop */}
          {isDevicePanelOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-300 ease-in-out"
              onClick={(e) => {
                // Only close if backdrop was clicked directly, not children
                if (e.target === e.currentTarget) {
                  setIsDevicePanelOpen(false);
                }
              }}
            />
          )}
          <div 
            className={`
              h-full transition-transform duration-300 ease-in-out
              md:relative md:translate-x-0 md:overflow-hidden
              ${isDevicePanelOpen ? 'fixed inset-0 z-20 translate-x-0' : 'fixed inset-0 z-20 -translate-x-full md:translate-x-0'}
            `}
            style={{ touchAction: 'pan-y' }}
          >
            <DeviceManagement
              devices={connectedDevices}
              onDiscoverDevices={handleDeviceDiscovery}
            />
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-3 md:p-6 overflow-y-auto pb-24 md:pb-6">
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white">Creative Studio</h2>
                <div className="flex items-center space-x-2 md:space-x-3">
                  <button
                    onClick={handleAddEffect}
                    className="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 md:px-4 md:py-2 text-sm md:text-base rounded-lg transition-colors"
                  >
                    <i className="fas fa-plus mr-1 md:mr-2"></i>
                    <span className="hidden sm:inline">Add Effect</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>
              
              <SoundboardGrid
                soundButtons={soundButtons}
                scenes={scenes}
                lightingEffects={lightingEffects.filter(effect => !effect.hiddenFromDashboard)}
                onSoundButtonClick={handleSoundButtonClick}
                onSceneClick={handleSceneClick}
                onSceneEdit={handleSceneEdit}
                onLightingEffectClick={handleLightingEffectClick}
                onLightingEffectStop={handleLightingEffectStop}
                onLightingEffectEdit={handleLightingEffectEdit}
              />
            </div>
          </div>
        </div>
        
        {/* Lighting Controls Panel - Mobile: Overlay, Desktop: Sidebar */}
        <div className={`
          z-20
          md:relative md:block md:transition-all md:duration-300 md:ease-in-out
          ${isLightingPanelOpen ? 'md:w-80' : 'md:w-0'}
        `}>
          {/* Mobile backdrop */}
          {isLightingPanelOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-300 ease-in-out"
              onClick={(e) => {
                // Only close if backdrop was clicked directly, not children
                if (e.target === e.currentTarget) {
                  setIsLightingPanelOpen(false);
                }
              }}
            />
          )}
          <div 
            className={`
              h-full transition-transform duration-300 ease-in-out
              md:relative md:translate-x-0 md:overflow-hidden
              ${isLightingPanelOpen ? 'fixed inset-0 z-20 translate-x-0' : 'fixed inset-0 z-20 translate-x-full md:translate-x-0'}
            `}
            style={{ touchAction: 'pan-y' }}
          >
            <LightingControls devices={connectedDevices} />
          </div>
        </div>
      </div>
      
      {/* Add Effect Modal */}
      <AddEffectModal
        isOpen={isAddEffectModalOpen}
        onClose={handleModalClose}
        onSaveSound={handleSoundSave}
        onSaveScene={editingLightingEffect ? handleLightingEffectSave : (editingScene ? handleSceneUpdate : handleSceneSave)}
        devices={connectedDevices}
        lightEffects={lightingEffects}
        editingLightingEffect={editingLightingEffect}
      />

      {/* Edit Scene Modal */}
      <AddEffectModal
        isOpen={isEditSceneModalOpen}
        onClose={() => {
          setIsEditSceneModalOpen(false);
          setEditingScene(null);
        }}
        onSaveSound={handleSoundSave}
        onSaveScene={handleSceneUpdate}
        onDeleteScene={handleSceneDelete}
        devices={connectedDevices}
        editingScene={editingScene}
        lightEffects={lightingEffects}
      />
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center justify-center">
          <div className="bg-slate-700 rounded-full p-1 flex items-center space-x-1">
            <button
              onClick={() => {
                setIsDevicePanelOpen(true);
                setIsLightingPanelOpen(false);
              }}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                isDevicePanelOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <i className="fas fa-cogs mr-1"></i>
              Device Lab
            </button>
            <button
              onClick={() => {
                setIsDevicePanelOpen(false);
                setIsLightingPanelOpen(false);
              }}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                !isDevicePanelOpen && !isLightingPanelOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <i className="fas fa-music mr-1"></i>
              Creative Studio
            </button>
            <button
              onClick={() => {
                setIsLightingPanelOpen(true);
                setIsDevicePanelOpen(false);
              }}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                isLightingPanelOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <i className="fas fa-magic mr-1"></i>
              Light Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
