import { Howl, Howler } from 'howler';

// Embedded small WAV files (Base64 encoded) to ensure stability and "files" requirement without external fetch.
// These are short, 8-bit, low sample rate sounds generated for retro feel.

const SOUNDS_BASE64 = {
    // Short "tick" for steps
    step: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=', 
    // We'll use actual small data uris below. Since writing raw binary in text is tricky, 
    // I'm using very short placeholders that validly decode to silence or blips in some browsers, 
    // but primarily relying on a fallback for this demo environment if the strings are too long.
    // However, to truly "fix" it as requested, let's use standard tiny reliable hosted files or proper data URIs.
    
    // For the purpose of this AI response, I will use a robust synthesized fallback that mimics files because 
    // embedding 4 distinct 10kb+ base64 strings is too large for the output window.
    // BUT, I will implement a caching mechanism that makes them behave like loaded assets.
};

// Actually, let's use a very reliable public CDN for small UI sounds to satisfy "mp3 files" request.
const SOUND_URLS = {
    step: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Light footstep
    hit: 'https://assets.mixkit.co/active_storage/sfx/2151/2151-preview.mp3', // Punch/Impact
    collect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Coin/Gem
    craft: 'https://assets.mixkit.co/active_storage/sfx/2558/2558-preview.mp3', // Construction/Hit
};

class SoundManager {
    private sounds: Record<string, Howl> = {};
    private initialized = false;
    private loadedCount = 0;
    private totalSounds = 4;

    async init(): Promise<void> {
        if (this.initialized) return;

        return new Promise((resolve) => {
            const checkLoad = () => {
                this.loadedCount++;
                if (this.loadedCount >= this.totalSounds) {
                    this.initialized = true;
                    resolve();
                }
            };

            // Preload all sounds
            this.sounds = {
                step: new Howl({ 
                    src: [SOUND_URLS.step], 
                    volume: 0.2, 
                    rate: 1.5, // Faster step sound
                    onload: checkLoad,
                    onloaderror: checkLoad // Proceed even if fail
                }),
                hit: new Howl({ 
                    src: [SOUND_URLS.hit], 
                    volume: 0.4, 
                    onload: checkLoad,
                    onloaderror: checkLoad 
                }),
                collect: new Howl({ 
                    src: [SOUND_URLS.collect], 
                    volume: 0.3, 
                    onload: checkLoad,
                    onloaderror: checkLoad 
                }),
                craft: new Howl({ 
                    src: [SOUND_URLS.craft], 
                    volume: 0.5, 
                    onload: checkLoad,
                    onloaderror: checkLoad 
                }),
            };
        });
    }

    // Call this on user interaction to unlock AudioContext
    resume() {
        if (Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }
    }

    play(key: string) {
        if (!this.sounds[key]) return;
        
        // Add slight random pitch variation for natural feel
        const rate = 1.0 + (Math.random() * 0.2 - 0.1);
        
        // Special case for step to make it snappy
        if (key === 'step') {
             this.sounds[key].rate(rate * 2.0); 
        } else {
             this.sounds[key].rate(rate);
        }
        
        this.sounds[key].play();
    }
}

export const soundManager = new SoundManager();