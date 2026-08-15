(function (root) {
    const PAPER = '#fbfaf4';
    const BLUE_INK = '#1f5a86';
    const BLUE_LIGHT = '#5f86a6';
    const RED_INK = '#c0524d';
    const PENCIL = '#646b72';
    const WARM_INK = '#bd5b43';

    class NotebookRenderer {
        constructor(documentObject = root.document) {
            this.document = documentObject;
            this.cache = new Map();
            this.paperTile = this.createPaperTile();
        }

        createCanvas(width, height) {
            if (typeof root.OffscreenCanvas === 'function') {
                return new root.OffscreenCanvas(width, height);
            }
            if (this.document?.createElement) {
                const canvas = this.document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                return canvas;
            }
            return null;
        }

        createPaperTile() {
            const size = 160;
            const tile = this.createCanvas(size, size);
            const ctx = tile?.getContext?.('2d');
            if (!ctx) return null;

            ctx.fillStyle = PAPER;
            ctx.fillRect(0, 0, size, size);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(85, 133, 166, 0.22)';
            for (let y = 0; y <= size; y += 80) {
                ctx.beginPath();
                ctx.moveTo(0, y + 0.5);
                ctx.lineTo(size, y + 0.5);
                ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(85, 133, 166, 0.12)';
            for (let x = 0; x <= size; x += 80) {
                ctx.beginPath();
                ctx.moveTo(x + 0.5, 0);
                ctx.lineTo(x + 0.5, size);
                ctx.stroke();
            }

            // A deterministic handful of tiny paper fibres keeps the sheet from looking sterile.
            ctx.fillStyle = 'rgba(108, 105, 91, 0.08)';
            for (let i = 0; i < 24; i += 1) {
                const x = (i * 47) % size;
                const y = (i * 71 + 13) % size;
                ctx.fillRect(x, y, 1, 1);
            }
            return tile;
        }

        drawPaper(ctx, player, width, height, worldScale) {
            if (!this.paperTile) {
                ctx.fillStyle = PAPER;
                ctx.fillRect(
                    player.wx - width / worldScale / 2,
                    player.wy - height / worldScale / 2,
                    width / worldScale,
                    height / worldScale
                );
                return;
            }

            const tileSize = this.paperTile.width;
            const halfWidth = width / worldScale / 2;
            const halfHeight = height / worldScale / 2;
            const startX = Math.floor((player.wx - halfWidth) / tileSize) * tileSize;
            const endX = Math.ceil((player.wx + halfWidth) / tileSize) * tileSize;
            const startY = Math.floor((player.wy - halfHeight) / tileSize) * tileSize;
            const endY = Math.ceil((player.wy + halfHeight) / tileSize) * tileSize;

            for (let x = startX; x <= endX; x += tileSize) {
                for (let y = startY; y <= endY; y += tileSize) {
                    ctx.drawImage(this.paperTile, x, y, tileSize, tileSize);
                }
            }
        }

        drawMargin(ctx, width, height) {
            ctx.save();
            ctx.globalAlpha = 0.46;
            ctx.fillStyle = PAPER;
            ctx.strokeStyle = 'rgba(74, 82, 88, 0.34)';
            ctx.lineWidth = 1;
            for (let y = 56; y < height; y += 78) {
                ctx.beginPath();
                ctx.arc(30, y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }

        getSprite(key, size, painter) {
            if (this.cache.has(key)) return this.cache.get(key);
            const canvas = this.createCanvas(size, size);
            const ctx = canvas?.getContext?.('2d');
            if (!ctx) return null;
            ctx.imageSmoothingEnabled = true;
            painter(ctx, size);
            this.cache.set(key, canvas);
            return canvas;
        }

        drawSprite(ctx, key, x, y, size, painter) {
            const sprite = this.getSprite(key, size, painter);
            if (!sprite) return false;
            ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
            return true;
        }

        drawPlayer(ctx, player) {
            return this.drawSprite(ctx, 'player', player.x, player.y, 76, (sprite, size) => {
                const center = size / 2;
                sprite.strokeStyle = BLUE_INK;
                sprite.lineWidth = 4;
                sprite.fillStyle = 'rgba(82, 145, 184, 0.28)';
                sprite.beginPath();
                sprite.arc(center, center, 18, 0, Math.PI * 2);
                sprite.fill();
                sprite.stroke();

                sprite.strokeStyle = BLUE_LIGHT;
                sprite.lineWidth = 2;
                sprite.beginPath();
                sprite.arc(center + 1, center - 1, 22, 0.2, Math.PI * 1.64);
                sprite.stroke();
                sprite.beginPath();
                sprite.moveTo(center - 4, center - 27);
                sprite.lineTo(center + 8, center - 20);
                sprite.stroke();
            });
        }

        drawGem(ctx, gem) {
            return this.drawSprite(ctx, 'gem', gem.x, gem.y, 42, (sprite, size) => {
                const center = size / 2;
                sprite.strokeStyle = BLUE_INK;
                sprite.fillStyle = 'rgba(98, 145, 180, 0.32)';
                sprite.lineWidth = 3;
                sprite.beginPath();
                sprite.moveTo(center, center - 8);
                sprite.lineTo(center + 8, center);
                sprite.lineTo(center, center + 8);
                sprite.lineTo(center - 8, center);
                sprite.closePath();
                sprite.fill();
                sprite.stroke();
                sprite.fillStyle = BLUE_INK;
                sprite.fillRect(center - 2, center - 2, 4, 4);
            });
        }

        drawEnemy(ctx, enemy) {
            const isWarm = enemy.id !== 'chaser';
            const key = isWarm ? 'enemy-warm' : 'enemy-pencil';
            return this.drawSprite(ctx, key, enemy.x, enemy.y, 48, (sprite, size) => {
                const center = size / 2;
                sprite.lineWidth = 3;
                sprite.strokeStyle = isWarm ? WARM_INK : PENCIL;
                sprite.fillStyle = isWarm ? 'rgba(189, 91, 67, 0.24)' : 'rgba(100, 107, 114, 0.24)';
                sprite.beginPath();
                if (isWarm) {
                    sprite.moveTo(center, 10);
                    sprite.lineTo(size - 10, center);
                    sprite.lineTo(center, size - 10);
                    sprite.lineTo(10, center);
                    sprite.closePath();
                } else {
                    sprite.arc(center, center, 15, 0, Math.PI * 2);
                }
                sprite.fill();
                sprite.stroke();

                sprite.globalAlpha = 0.7;
                sprite.lineWidth = 2;
                sprite.beginPath();
                if (isWarm) {
                    sprite.moveTo(center + 2, 8);
                    sprite.lineTo(size - 7, center + 2);
                    sprite.lineTo(center - 1, size - 8);
                    sprite.stroke();
                } else {
                    sprite.arc(center - 1, center + 1, 18, 0.3, Math.PI * 1.7);
                    sprite.stroke();
                    sprite.moveTo(center - 10, center - 19);
                    sprite.lineTo(center + 10, center - 17);
                    sprite.stroke();
                }
            });
        }

        drawProjectile(ctx, projectile) {
            return this.drawSprite(ctx, 'projectile', projectile.x, projectile.y, 34, (sprite, size) => {
                const center = size / 2;
                sprite.strokeStyle = BLUE_INK;
                sprite.fillStyle = 'rgba(41, 100, 143, 0.42)';
                sprite.lineWidth = 3;
                sprite.beginPath();
                sprite.arc(center, center, 7, 0, Math.PI * 2);
                sprite.fill();
                sprite.stroke();
                sprite.lineWidth = 2;
                sprite.beginPath();
                sprite.moveTo(5, center + 4);
                sprite.lineTo(center - 7, center + 1);
                sprite.stroke();
            });
        }
    }

    const api = { NotebookRenderer };
    root.Game = Object.assign(root.Game || {}, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
