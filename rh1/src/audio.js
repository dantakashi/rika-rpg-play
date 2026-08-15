(function (root) {
    class AudioEngine {
        constructor(settings = {}) {
            this.enabled = settings.soundEnabled === true;
            this.context = null;
            this.master = null;
        }

        setEnabled(enabled) {
            this.enabled = Boolean(enabled);
            if (this.enabled) this.playSample();
        }

        playSample() {
            if (!this.enabled || typeof window === 'undefined') return false;
            try {
                const Context = window.AudioContext || window.webkitAudioContext;
                if (!Context) return false;
                if (!this.context) {
                    this.context = new Context();
                    this.master = this.context.createGain();
                    this.master.gain.value = 0.07;
                    this.master.connect(this.context.destination);
                }
                if (this.context.state === 'suspended') this.context.resume();
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(520, this.context.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(
                    780,
                    this.context.currentTime + 0.12
                );
                gain.gain.setValueAtTime(0.001, this.context.currentTime);
                gain.gain.exponentialRampToValueAtTime(1, this.context.currentTime + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.14);
                oscillator.connect(gain);
                gain.connect(this.master);
                oscillator.start();
                oscillator.stop(this.context.currentTime + 0.15);
                return true;
            } catch {
                return false;
            }
        }

        hit() {
            if (!this.enabled || !this.context) return;
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = 'square';
            oscillator.frequency.value = 180;
            gain.gain.setValueAtTime(0.045, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.045);
            oscillator.connect(gain);
            gain.connect(this.master);
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.05);
        }
    }

    const api = { AudioEngine };
    root.Game = Object.assign(root.Game || {}, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
