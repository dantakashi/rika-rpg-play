(function (root) {
    class Pool {
        constructor(factory, reset = null, options = {}) {
            if (typeof factory !== 'function') throw new TypeError('factory must be a function');
            this.factory = factory;
            this.reset = typeof reset === 'function' ? reset : null;
            this.maxSize = options.maxSize ?? 512;
            this.free = [];
            this.created = 0;
            this.acquired = 0;
            for (let i = 0; i < Math.min(options.prealloc ?? 0, this.maxSize); i += 1) {
                this.free.push(this.factory());
                this.created += 1;
            }
        }

        acquire(...args) {
            const reused = this.free.length > 0;
            const object = reused ? this.free.pop() : this.factory();
            if (!reused) this.created += 1;
            if (this.reset) this.reset(object, ...args);
            this.acquired += 1;
            return object;
        }

        release(object) {
            if (!object || this.free.includes(object)) return;
            this.acquired = Math.max(0, this.acquired - 1);
            if (this.free.length < this.maxSize) this.free.push(object);
        }

        clear() {
            this.free.length = 0;
        }

        stats() {
            return {
                created: this.created,
                acquired: this.acquired,
                free: this.free.length,
                maxSize: this.maxSize
            };
        }
    }

    function apply(object, fields) {
        Object.assign(object, fields);
        return object;
    }

    function resetFloatingText(object, text, x, y, color, options = {}) {
        return apply(object, {
            text,
            x,
            y,
            color,
            weight: options.weight ?? 'bold',
            crit: options.crit ?? false,
            life: options.life ?? 1,
            vy: options.vy ?? -28
        });
    }

    function resetParticle(object, x, y, color, options = {}) {
        const angle = options.angle ?? 0;
        const speed = options.speed ?? 0;
        return apply(object, {
            x,
            y,
            color,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: options.life ?? 0.5
        });
    }

    function resetEnemyProjectile(object, x, y, angle, speed, damage) {
        return apply(object, {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            life: 3,
            shouldRemove: false,
            size: 6
        });
    }

    function resetExpGem(object, x, y, value) {
        return apply(object, {
            x,
            y,
            value,
            size: 8,
            dead: false
        });
    }

    const api = { Pool, resetFloatingText, resetParticle, resetEnemyProjectile, resetExpGem };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
