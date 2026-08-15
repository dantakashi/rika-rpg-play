(function (root) {
    const KEY_VECTORS = Object.freeze({
        w: { x: 0, y: -1 },
        arrowup: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        arrowdown: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        arrowleft: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
        arrowright: { x: 1, y: 0 }
    });

    function normaliseKey(key) {
        return typeof key === 'string' ? key.toLowerCase() : '';
    }

    class InputManager {
        constructor(stickElement = null, knobElement = null) {
            this.keys = new Set();
            this.touch = { active: false, x: 0, y: 0 };
            this.stickElement = stickElement;
            this.knobElement = knobElement;
            this.boundKeyDown = (event) => this.keys.add(normaliseKey(event.key));
            this.boundKeyUp = (event) => this.keys.delete(normaliseKey(event.key));
            this.boundBlur = () => this.keys.clear();
            this.boundPointerDown = (event) => this.startTouch(event);
            this.boundPointerMove = (event) => this.moveTouch(event);
            this.boundPointerUp = () => this.endTouch();
            if (typeof window !== 'undefined') {
                window.addEventListener('keydown', this.boundKeyDown);
                window.addEventListener('keyup', this.boundKeyUp);
                window.addEventListener('blur', this.boundBlur);
            }
            if (stickElement) {
                stickElement.addEventListener('pointerdown', this.boundPointerDown);
                stickElement.addEventListener('pointermove', this.boundPointerMove);
                stickElement.addEventListener('pointerup', this.boundPointerUp);
                stickElement.addEventListener('pointercancel', this.boundPointerUp);
            }
        }

        startTouch(event) {
            event.preventDefault();
            this.touch.active = true;
            this.moveTouch(event);
            this.stickElement?.setPointerCapture?.(event.pointerId);
        }

        moveTouch(event) {
            if (!this.touch.active && event.type !== 'pointerdown') return;
            const rect = this.stickElement?.getBoundingClientRect();
            if (!rect) return;
            const radius = Math.min(rect.width, rect.height) * 0.34;
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let x = event.clientX - cx;
            let y = event.clientY - cy;
            const length = Math.hypot(x, y);
            if (length > radius) {
                x = (x / length) * radius;
                y = (y / length) * radius;
            }
            this.touch.x = x / radius;
            this.touch.y = y / radius;
            if (this.knobElement) this.knobElement.style.transform = `translate(${x}px, ${y}px)`;
        }

        endTouch() {
            this.touch.active = false;
            this.touch.x = 0;
            this.touch.y = 0;
            if (this.knobElement) this.knobElement.style.transform = 'translate(0, 0)';
        }

        getMoveVector() {
            let x = this.touch.x;
            let y = this.touch.y;
            for (const key of this.keys) {
                const vector = KEY_VECTORS[key];
                if (vector) {
                    x += vector.x;
                    y += vector.y;
                }
            }
            const length = Math.hypot(x, y);
            if (length <= 0) return { x: 0, y: 0 };
            return { x: x / Math.max(1, length), y: y / Math.max(1, length) };
        }

        destroy() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('keydown', this.boundKeyDown);
                window.removeEventListener('keyup', this.boundKeyUp);
                window.removeEventListener('blur', this.boundBlur);
            }
            this.stickElement?.removeEventListener('pointerdown', this.boundPointerDown);
            this.stickElement?.removeEventListener('pointermove', this.boundPointerMove);
            this.stickElement?.removeEventListener('pointerup', this.boundPointerUp);
            this.stickElement?.removeEventListener('pointercancel', this.boundPointerUp);
        }
    }

    const api = { normaliseKey, InputManager };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
