import { useRef, useCallback, useState } from 'react';

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      setIsInitialized(true);
    }
  }, []);
  
  const playSound = useCallback(async (audioUrl: string, volume: number = 80) => {
    try {
      initializeAudioContext();
      
      if (!audioContextRef.current || !masterGainRef.current) {
        throw new Error('Audio context not initialized');
      }
      
      // Resume audio context if it's suspended (required for autoplay policies)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create individual gain node for this sound's volume
      const soundGainNode = audioContextRef.current.createGain();
      soundGainNode.gain.value = Math.max(0, Math.min(1, volume / 100)); // Convert percentage to 0-1 range
      
      source.connect(soundGainNode);
      soundGainNode.connect(masterGainRef.current);
      source.start();
      
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  }, [initializeAudioContext]);
  
  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);
  
  const stopAllSounds = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
  }, []);
  
  return {
    playSound,
    setMasterVolume,
    stopAllSounds,
    isInitialized,
  };
}
