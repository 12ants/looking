import { Howl, Howler } from 'howler';

// To ensure 100% stability without relying on external CDNs that may break or have CORS issues,
// we generate retro-style sound effects procedurally using the Web Audio API and load them into Howler.

const generateSoundUrl = async (type: 'step' | 'hit' | 'collect' | 'craft'): Promise<string> => {
    // Create offline context
    const ctx = new window.OfflineAudioContext(1, 44100 * 0.5, 44100);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;

    if (type === 'collect') {
        // High pitch ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    } else if (type === 'hit') {
        // Low noise/saw crunch
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
    } else if (type === 'step') {
        // Short tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
    } else if (type === 'craft') {
        // Mechanical thud
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    const buffer = await ctx.startRendering();
    
    // Convert to WAV Blob
    const wavData = audioBufferToWav(buffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

// Simple WAV encoder helper
function audioBufferToWav(buffer: AudioBuffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = buffer.getChannelData(0);
    const dataSize = data.length * bytesPerSample;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

class SoundManager {
    private sounds: Record<string, Howl> = {};
    private initialized = false;

    async init() {
        if (this.initialized) return;
        
        try {
            const [stepUrl, hitUrl, collectUrl, craftUrl] = await Promise.all([
                generateSoundUrl('step'),
                generateSoundUrl('hit'),
                generateSoundUrl('collect'),
                generateSoundUrl('craft')
            ]);

            this.sounds = {
                step: new Howl({ src: [stepUrl], volume: 0.3 }),
                hit: new Howl({ src: [hitUrl], volume: 0.5 }),
                collect: new Howl({ src: [collectUrl], volume: 0.4 }),
                craft: new Howl({ src: [craftUrl], volume: 0.6 }),
            };
            this.initialized = true;
        } catch (e) {
            console.error("Audio generation failed", e);
        }
    }

    // Call this on user interaction
    resume() {
        if (Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }
        if (!this.initialized) {
            this.init();
        }
    }

    play(key: string) {
        if (!this.initialized || !this.sounds[key]) return;
        // Pitch variation for natural feel
        const rate = 0.9 + Math.random() * 0.2;
        this.sounds[key].rate(rate);
        this.sounds[key].play();
    }
}

export const soundManager = new SoundManager();
// Auto init to prepare resources, but context will need resume
soundManager.init();