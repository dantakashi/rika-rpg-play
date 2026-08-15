(function (root) {
    class FpsMeter {
        constructor() {
            this.lastTime = 0;
            this.frames = 0;
            this.fps = 0;
        }

        tick(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            this.frames += 1;
            const elapsed = timestamp - this.lastTime;
            if (elapsed >= 500) {
                this.fps = Math.round((this.frames * 1000) / elapsed);
                this.frames = 0;
                this.lastTime = timestamp;
            }
            return this.fps;
        }
    }

    const api = { FpsMeter };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
