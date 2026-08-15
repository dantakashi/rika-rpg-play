(function (root) {
    class EffectLayer {
        constructor() {
            this.delays = [];
            this.flashTime = 0;
        }

        schedule(delay, callback) {
            const token = { remaining: Math.max(0, delay), callback, cancelled: false };
            this.delays.push(token);
            return token;
        }

        update(dt) {
            this.flashTime = Math.max(0, this.flashTime - dt);
            for (let i = this.delays.length - 1; i >= 0; i -= 1) {
                const token = this.delays[i];
                token.remaining -= dt;
                if (token.remaining > 1e-9) continue;
                this.delays.splice(i, 1);
                if (token.cancelled) continue;
                try {
                    token.callback();
                } catch {
                    // エフェクトの一つが失敗しても次の更新を継続する。
                }
            }
        }

        flash(seconds = 0.12) {
            this.flashTime = Math.max(this.flashTime, seconds);
        }

        render(ctx, width, height) {
            if (this.flashTime <= 0) return;
            ctx.save();
            ctx.globalAlpha = Math.min(0.3, this.flashTime * 2);
            ctx.fillStyle = '#fff4bb';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    const api = { EffectLayer };
    root.Game = Object.assign(root.Game || {}, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
