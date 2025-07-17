export interface LifxDevice {
  id: string;
  ip: string;
  mac: string;
  label: string;
  power: boolean;
  color: {
    hue: number;
    saturation: number;
    brightness: number;
    kelvin: number;
  };
}

export interface LifxColor {
  hue: number;
  saturation: number;
  brightness: number;
  kelvin: number;
}

export class LifxClient {
  private devices: Map<string, LifxDevice> = new Map();
  
  constructor(private onDeviceUpdate?: (device: LifxDevice) => void) {}
  
  // Convert hex color to LIFX HSBK format
  public static hexToHSBK(hex: string, brightness: number = 100, kelvin: number = 3500): LifxColor {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Convert RGB to HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let hue = 0;
    if (delta !== 0) {
      if (max === r) {
        hue = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        hue = 60 * ((b - r) / delta + 2);
      } else {
        hue = 60 * ((r - g) / delta + 4);
      }
    }
    
    const saturation = max === 0 ? 0 : delta / max;
    const value = max;
    
    // Convert to LIFX format (0-65535)
    return {
      hue: Math.round((hue / 360) * 65535),
      saturation: Math.round(saturation * 65535),
      brightness: Math.round((brightness / 100) * 65535),
      kelvin: kelvin
    };
  }
  
  // Convert LIFX HSBK to hex color
  public static hsbkToHex(color: LifxColor): string {
    const hue = (color.hue / 65535) * 360;
    const saturation = color.saturation / 65535;
    const brightness = color.brightness / 65535;
    
    // Convert HSV to RGB
    const c = brightness * saturation;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = brightness - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; b = c;
    } else if (hue >= 300 && hue < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Get temperature color representation
  public static getTemperatureColor(kelvin: number): string {
    // Simplified temperature to color mapping
    if (kelvin <= 2700) return '#ff8c00'; // Warm orange
    if (kelvin <= 3500) return '#ffb347'; // Warm yellow
    if (kelvin <= 4500) return '#ffff00'; // Yellow
    if (kelvin <= 5500) return '#ffffff'; // White
    if (kelvin <= 6500) return '#b3e5fc'; // Cool blue
    return '#87ceeb'; // Sky blue
  }
  
  // Effect sequences
  public static getEffectSequence(effectType: string): Array<{ color: LifxColor; duration: number }> {
    const sequences: { [key: string]: Array<{ color: LifxColor; duration: number }> } = {
      flash: [
        { color: { hue: 0, saturation: 0, brightness: 65535, kelvin: 6500 }, duration: 100 },
        { color: { hue: 0, saturation: 0, brightness: 32768, kelvin: 3500 }, duration: 500 },
      ],
      strobe: Array.from({ length: 10 }, (_, i) => ({
        color: { 
          hue: 0, 
          saturation: 0, 
          brightness: i % 2 === 0 ? 65535 : 0, 
          kelvin: 6500 
        },
        duration: 100
      })),
      breathe: [
        { color: { hue: 0, saturation: 0, brightness: 65535, kelvin: 3500 }, duration: 1000 },
        { color: { hue: 0, saturation: 0, brightness: 16384, kelvin: 3500 }, duration: 1000 },
      ],
      cycle: [
        { color: { hue: 0, saturation: 65535, brightness: 65535, kelvin: 3500 }, duration: 400 },
        { color: { hue: 21845, saturation: 65535, brightness: 65535, kelvin: 3500 }, duration: 400 },
        { color: { hue: 43690, saturation: 65535, brightness: 65535, kelvin: 3500 }, duration: 400 },
        { color: { hue: 10922, saturation: 65535, brightness: 65535, kelvin: 3500 }, duration: 400 },
        { color: { hue: 54613, saturation: 65535, brightness: 65535, kelvin: 3500 }, duration: 400 },
      ],
    };
    
    return sequences[effectType] || sequences.flash;
  }
}
