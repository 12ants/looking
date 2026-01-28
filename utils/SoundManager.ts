import { Howl, Howler } from 'howler';
import { BiomeType } from '../types';

const SOUND_URLS = {
    step: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    hit: 'https://assets.mixkit.co/active_storage/sfx/2151/2151-preview.mp3',
    collect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    craft: 'https://assets.mixkit.co/active_storage/sfx/2558/2558-preview.mp3',
    // Ambience
    [BiomeType.FOREST]: 'https://assets.mixkit.co/active_storage/sfx/1218/1218-preview.mp3', // Birds/Nature
    [BiomeType.DESERT]: 'https://assets.mixkit.co/active_storage/sfx/1460/1460-preview.mp3', // Wind
    [BiomeType.ALPINE]: 'https://assets.mixkit.co/active_storage/sfx/1392/1392-preview.mp3', // Cold Wind
};

class SoundManager {
    private sounds: Record<string, Howl> = {};
    private initialized = false;
    private loadedCount = 0;
    private totalSounds = 7;
    private currentAmbience: Howl | null = null;
    private currentAmbienceKey: string | null = null;

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

            const commonOptions = {
                onload: checkLoad,
                onloaderror: checkLoad
            };

            this.sounds = {
                step: new Howl({ src: [SOUND_URLS.step], volume: 0.2, rate: 1.5, ...commonOptions }),
                hit: new Howl({ src: [SOUND_URLS.hit], volume: 0.4, ...commonOptions }),
                collect: new Howl({ src: [SOUND_URLS.collect], volume: 0.3, ...commonOptions }),
                craft: new Howl({ src: [SOUND_URLS.craft], volume: 0.5, ...commonOptions }),
                
                // Ambience Tracks
                [BiomeType.FOREST]: new Howl({ src: [SOUND_URLS[BiomeType.FOREST]], volume: 0.1, loop: true, ...commonOptions }),
                [BiomeType.DESERT]: new Howl({ src: [SOUND_URLS[BiomeType.DESERT]], volume: 0.15, loop: true, ...commonOptions }),
                [BiomeType.ALPINE]: new Howl({ src: [SOUND_URLS[BiomeType.ALPINE]], volume: 0.2, loop: true, ...commonOptions }),
            };
        });
    }

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

    playAmbience(biome: BiomeType) {
        if (this.currentAmbienceKey === biome) return;

        // Fade out current if different
        if (this.currentAmbience) {
            const old = this.currentAmbience;
            old.fade(old.volume(), 0, 1000);
            setTimeout(() => old.stop(), 1000);
        }

        // Play new
        const sound = this.sounds[biome];
        if (sound) {
            this.currentAmbience = sound;
            this.currentAmbienceKey = biome;
            sound.volume(0);
            sound.play();
            sound.fade(0, biome === BiomeType.ALPINE ? 0.2 : 0.1, 2000); // Fade in
        }
    }

    stopAmbience() {
        if (this.currentAmbience) {
            const old = this.currentAmbience;
            old.fade(old.volume(), 0, 1000);
            setTimeout(() => {
                old.stop();
                if (this.currentAmbience === old) {
                    this.currentAmbience = null;
                    this.currentAmbienceKey = null;
                }
            }, 1000);
        }
    }
}

export const soundManager = new SoundManager();