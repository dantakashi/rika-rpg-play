(function (root) {
    class SpatialHash {
        constructor(cell = 64) {
            this.cell = cell;
            this.map = new Map();
            this._size = 0;
        }

        _key(x, y) {
            return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`;
        }

        insert(item) {
            const key = this._key(item.x, item.y);
            if (!this.map.has(key)) this.map.set(key, []);
            this.map.get(key).push(item);
            this._size += 1;
        }

        insertAll(items) {
            this.clear();
            for (const item of items) this.insert(item);
        }

        insertEnemies(items) {
            this.insertAll(items);
        }

        clear() {
            this.map.clear();
            this._size = 0;
        }

        get size() {
            return this._size;
        }

        occupiedCellCount() {
            return this.map.size;
        }

        *queryRect(x, y, radius) {
            const minX = Math.floor((x - radius) / this.cell);
            const maxX = Math.floor((x + radius) / this.cell);
            const minY = Math.floor((y - radius) / this.cell);
            const maxY = Math.floor((y + radius) / this.cell);
            const seen = new Set();
            for (let cy = minY; cy <= maxY; cy += 1) {
                for (let cx = minX; cx <= maxX; cx += 1) {
                    const bucket = this.map.get(`${cx},${cy}`) ?? [];
                    for (const item of bucket) {
                        if (seen.has(item)) continue;
                        seen.add(item);
                        yield item;
                    }
                }
            }
        }

        findNearest(x, y, radius) {
            if (radius <= 0) return null;
            let best = null;
            let bestDistance = radius * radius;
            for (const item of this.queryRect(x, y, radius)) {
                const distance = (item.x - x) ** 2 + (item.y - y) ** 2;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = item;
                }
            }
            return best;
        }

        findNearestEnemy(x, y, radius) {
            return this.findNearest(x, y, radius);
        }
    }

    const api = { SpatialHash };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
