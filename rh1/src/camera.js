(function (root) {
    class Camera {
        constructor(width, height, worldScale = 1) {
            this.width = width;
            this.height = height;
            this.worldScale = worldScale;
        }

        get centerX() {
            return this.width / 2;
        }

        get centerY() {
            return this.height / 2;
        }

        worldToScreen(wx, wy, player) {
            return {
                x: this.centerX + (wx - player.wx) * this.worldScale,
                y: this.centerY + (wy - player.wy) * this.worldScale
            };
        }

        screenToWorld(sx, sy, player) {
            return {
                wx: player.wx + (sx - this.centerX) / this.worldScale,
                wy: player.wy + (sy - this.centerY) / this.worldScale
            };
        }

        get viewRadius() {
            return Math.hypot(this.width / 2 / this.worldScale, this.height / 2 / this.worldScale);
        }

        isOutside(x, y, player, margin = 0) {
            return Math.hypot(x - player.wx, y - player.wy) > this.viewRadius + margin;
        }

        isVisible(x, y, player, padding = 0) {
            const screen = this.worldToScreen(x, y, player);
            return screen.x >= -padding
                && screen.x <= this.width + padding
                && screen.y >= -padding
                && screen.y <= this.height + padding;
        }

        getSpawnPoint(player, random = Math.random, margin = 0) {
            const angle = random() * Math.PI * 2;
            const radius = this.viewRadius + margin + random() * 80;
            return {
                x: player.wx + Math.cos(angle) * radius,
                y: player.wy + Math.sin(angle) * radius
            };
        }

        apply(ctx, player) {
            ctx.setTransform(
                this.worldScale,
                0,
                0,
                this.worldScale,
                this.centerX - player.wx * this.worldScale,
                this.centerY - player.wy * this.worldScale
            );
        }
    }

    const api = { Camera };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
