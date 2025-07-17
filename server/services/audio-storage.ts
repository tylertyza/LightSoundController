import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export class AudioStorage {
  private readonly audioDir = path.join(process.cwd(), 'audio-files');

  constructor() {
    this.ensureAudioDirectory();
  }

  private async ensureAudioDirectory() {
    try {
      await mkdir(this.audioDir, { recursive: true });
    } catch (error) {
      console.error('Error creating audio directory:', error);
    }
  }

  public async saveAudioFile(filename: string, buffer: Buffer): Promise<string> {
    const filepath = path.join(this.audioDir, filename);
    await writeFile(filepath, buffer);
    return filepath;
  }

  public async getAudioFile(filename: string): Promise<Buffer> {
    const filepath = path.join(this.audioDir, filename);
    return await readFile(filepath);
  }

  public async deleteAudioFile(filename: string): Promise<void> {
    const filepath = path.join(this.audioDir, filename);
    await unlink(filepath);
  }

  public generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${timestamp}${ext}`;
  }

  public getAudioUrl(filename: string): string {
    return `/api/audio/${filename}`;
  }
}

export const audioStorage = new AudioStorage();
