(function (root) {
    const namespace = root.Game || (root.Game = {});
    let { CONFIG, ENEMIES } = namespace;
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        ({ CONFIG } = require('./config.js'));
        ({ ENEMIES } = require('./data.js'));
    }

    class Player {
        constructor(x, y) {
            this.wx = x;
            this.wy = y;
            this.size = CONFIG.PLAYER_SIZE;
            this.maxHp = 100;
            this.hp = 100;
            this.speed = CONFIG.PLAYER_SPEED;
            this.level = 1;
            this.exp = 0;
            this.expToNext = CONFIG.EXP_TO_NEXT;
            this.invulnerable = 0;
        }

        get x() {
            return this.wx;
        }

        set x(value) {
            this.wx = value;
        }

        get y() {
            return this.wy;
        }

        set y(value) {
            this.wy = value;
        }

        update(dt, game) {
            const move = game.input.getMoveVector();
            const length = Math.hypot(move.x, move.y);
            if (length > 0) {
                this.wx += (move.x / Math.max(1, length)) * this.speed * dt;
                this.wy += (move.y / Math.max(1, length)) * this.speed * dt;
            }
            this.invulnerable = Math.max(0, this.invulnerable - dt);
        }

        takeDamage(amount) {
            if (this.invulnerable > 0) return false;
            this.hp = Math.max(0, this.hp - amount);
            this.invulnerable = 0.45;
            return true;
        }

        addExp(amount) {
            this.exp += amount;
            let leveled = false;
            while (this.exp >= this.expToNext) {
                this.exp -= this.expToNext;
                this.level += 1;
                this.expToNext = Math.round(this.expToNext * 1.22);
                leveled = true;
            }
            return leveled;
        }
    }

    class Enemy {
        constructor(x, y, definition) {
            this.reset(x, y, definition);
        }

        reset(x, y, definition) {
            this.x = x;
            this.y = y;
            this.definition = definition;
            this.id = definition.id;
            this.size = definition.size;
            this.hp = definition.hp;
            this.maxHp = definition.hp;
            this.speed = definition.speed;
            this.damage = definition.damage;
            this.color = definition.color;
            this.exp = definition.exp;
            this.phase = Math.random() * Math.PI * 2;
            this.contactWait = 0;
            this.dead = false;
            this.dropped = false;
            return this;
        }

        update(dt, player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            let vx = dx / distance;
            let vy = dy / distance;
            this.phase += dt * 3;
            if (this.definition.behavior === 'swerve') {
                const side = Math.sin(this.phase) * 0.75;
                const tx = -vy * side;
                const ty = vx * side;
                vx += tx;
                vy += ty;
                const normal = Math.max(1, Math.hypot(vx, vy));
                vx /= normal;
                vy /= normal;
            }
            this.x += vx * this.speed * dt;
            this.y += vy * this.speed * dt;
            this.contactWait = Math.max(0, this.contactWait - dt);
        }

        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) this.dead = true;
        }
    }

    class ExpGem {
        constructor(x = 0, y = 0, value = 0) {
            this.reset(x, y, value);
        }

        reset(x, y, value) {
            this.x = x;
            this.y = y;
            this.value = value;
            this.size = 8;
            this.dead = false;
            return this;
        }

        update(dt, player) {
            const playerX = player.wx ?? player.x;
            const playerY = player.wy ?? player.y;
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const distance = Math.hypot(dx, dy);
            if (distance < CONFIG.GEM_MAGNET_RADIUS && distance > 0) {
                const speed = 110 + (1 - distance / CONFIG.GEM_MAGNET_RADIUS) * 180;
                const step = Math.min(distance, speed * dt);
                this.x += (dx / distance) * step;
                this.y += (dy / distance) * step;
            }
            const collected = distance <= CONFIG.GEM_PICKUP_RADIUS;
            if (collected) this.dead = true;
            return collected;
        }
    }

    class Projectile {
        constructor(x, y, vx, vy, damage, life = 1.4) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.damage = damage;
            this.life = life;
            this.dead = false;
            this.size = 7;
        }

        update(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= dt;
            if (this.life <= 0) this.dead = true;
        }
    }

    function findEnemyDef(id) {
        return Object.values(ENEMIES).find((enemy) => enemy.id === id) ?? null;
    }

    const api = { Player, Enemy, ExpGem, Projectile, findEnemyDef };
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
