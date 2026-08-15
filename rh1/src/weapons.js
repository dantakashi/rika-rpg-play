(function (root) {
    const namespace = root.Game || (root.Game = {});
    let { Projectile } = namespace;
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        ({ Projectile } = require('./entities.js'));
    }

    class Weapon {
        constructor(definition) {
            this.def = definition;
            this.id = definition.id;
            this.name = definition.name;
            this.icon = definition.icon;
            this.level = 1;
            this.cooldown = 0;
        }

        levelUp() {
            this.level += 1;
        }

        isEvolved() {
            return Boolean(this.def.evolveLevel && this.level >= this.def.evolveLevel);
        }

        getDamage(player = {}) {
            const multiplier = player.getDamageMult?.() ?? 1;
            return this.def.baseDamage * (1 + (this.level - 1) * 0.2) * multiplier;
        }

        getCooldown(player = {}) {
            const multiplier = player.getCooldownMult?.() ?? 1;
            return Math.max(0.05, this.def.baseCooldown * 0.92 ** (this.level - 1) * multiplier);
        }

        getRange(player = {}) {
            const multiplier = player.getAreaMult?.() ?? 1;
            return this.def.baseRange * (1 + (this.level - 1) * 0.1) * multiplier;
        }

        update(dt, player, game) {
            this.cooldown -= dt;
            if (this.cooldown > 0) return;
            this.cooldown = this.getCooldown(player);
            this.fire(player, game);
        }

        fire(player, game) {
            let target = null;
            let best = this.getRange(player) ** 2;
            for (const enemy of game.enemies) {
                const distance = (enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2;
                if (distance < best) {
                    best = distance;
                    target = enemy;
                }
            }
            if (!target) return false;
            const distance = Math.max(1, Math.sqrt(best));
            const speed = 510;
            game.projectiles.push(
                new Projectile(
                    player.x,
                    player.y,
                    ((target.x - player.x) / distance) * speed,
                    ((target.y - player.y) / distance) * speed,
                    this.getDamage(player)
                )
            );
            game.audio?.hit?.();
            return true;
        }
    }

    const api = { Weapon };
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
