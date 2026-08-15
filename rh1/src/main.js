(function (root) {
    const namespace = root.Game || (root.Game = {});
    let {
        CONFIG,
        GameState,
        ENEMY_LIST,
        WEAPONS,
        AudioEngine,
        EffectLayer,
        Enemy,
        ExpGem,
        Player,
        InputManager,
        Camera,
        Pool,
        SpatialHash,
        loadSettings,
        saveSettings,
        FpsMeter,
        UI,
        formatTime,
        Weapon,
        NotebookRenderer
    } = namespace;
    let { Quiz } = root;
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        Object.assign(namespace, require('./config.js'));
        Object.assign(namespace, require('./data.js'));
        Object.assign(namespace, require('./audio.js'));
        Object.assign(namespace, require('./effects.js'));
        Object.assign(namespace, require('./entities.js'));
        Object.assign(namespace, require('./input.js'));
        Object.assign(namespace, require('./camera.js'));
        Object.assign(namespace, require('./pool.js'));
        Object.assign(namespace, require('./spatial-hash.js'));
        Object.assign(namespace, require('./storage.js'));
        Object.assign(namespace, require('./systems.js'));
        Object.assign(namespace, require('./ui.js'));
        Object.assign(namespace, require('./weapons.js'));
        ({ Quiz } = require('./quiz-stub.js'));
        Object.assign(namespace, require('./notebook.js'));
        ({
            CONFIG,
            GameState,
            ENEMY_LIST,
            WEAPONS,
            AudioEngine,
            EffectLayer,
            Enemy,
            ExpGem,
            Player,
            InputManager,
            Camera,
            Pool,
            SpatialHash,
            loadSettings,
            saveSettings,
            FpsMeter,
            UI,
            formatTime,
            Weapon,
            NotebookRenderer
        } = namespace);
    }

    class Game {
        constructor(documentObject = document, windowObject = window) {
            this.document = documentObject;
            this.window = windowObject;
            this.canvas = documentObject.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.ui = new UI();
            this.notebook = typeof NotebookRenderer === 'function' ? new NotebookRenderer(documentObject) : null;
            this.settings = loadSettings();
            this.audio = new AudioEngine(this.settings);
            this.input = new InputManager(
                documentObject.getElementById('joystick'),
                documentObject.getElementById('joystickKnob')
            );
            this.effects = new EffectLayer();
            this.fpsMeter = new FpsMeter();
            this.camera = new Camera(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.WORLD_SCALE);
            this.enemyHash = new SpatialHash(80);
            this.enemyPool = new Pool(
                () => new Enemy(0, 0, ENEMY_LIST[0]),
                (enemy, x, y, definition) => enemy.reset(x, y, definition),
                { maxSize: CONFIG.MAX_ENEMIES, prealloc: CONFIG.MAX_ENEMIES }
            );
            this.gemPool = new Pool(
                () => new ExpGem(),
                (gem, x, y, value) => gem.reset(x, y, value),
                { maxSize: CONFIG.MAX_GEMS, prealloc: CONFIG.MAX_GEMS }
            );
            const params = new URLSearchParams(windowObject.location.search);
            this.perfEnabled = params.get('perf') === '1';
            this.demo = params.get('demo') === '1';
            this.autoStart = params.get('auto') === '1';
            this.matchSeconds = this.demo ? 12 : CONFIG.MATCH_SECONDS;
            this.state = GameState.START;
            this.resultWon = null;
            this.gameTime = 0;
            this.kills = 0;
            this.spawnClock = 0;
            this.player = new Player(0, 0);
            this.weapon = new Weapon(WEAPONS.LIGHT_ORB);
            this.enemies = [];
            this.gems = [];
            this.projectiles = [];
            this.lastFrame = 0;
            this.boundFrame = (timestamp) => this.frame(timestamp);
            this.exposeDiagnostics();
            this.bindUi();
        this.ui.setSound(this.settings.soundEnabled);
            this.ui.updatePerf(this, 0);
            this.ui.showStart();
            if (this.autoStart) this.window.setTimeout(() => this.start(), 0);
        }

        publicState() {
            if (this.state === GameState.START) return 'title';
            if (this.state === GameState.PLAYING) return 'play';
            if (this.state === GameState.QUIZ) return 'quiz';
            return this.resultWon ? 'win' : 'lose';
        }

        exposeDiagnostics() {
            const quizStats = () => typeof Quiz?.getStats === 'function'
                ? Object.freeze(Quiz.getStats())
                : Object.freeze({ asked: 0, correct: 0, wrong: 0 });
            Object.defineProperty(this.window, '__rh1', {
                configurable: true,
                enumerable: true,
                get: () => {
                    const player = this.player || { wx: 0, wy: 0, hp: 0 };
                    const playerScreen = this.camera
                        ? this.camera.worldToScreen(player.wx, player.wy, player)
                        : { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
                    return Object.freeze({
                        state: this.publicState(),
                        elapsed: this.gameTime,
                        enemies: this.enemies?.length ?? 0,
                        player: Object.freeze({ wx: player.wx, wy: player.wy }),
                        playerScreen: Object.freeze(playerScreen),
                        gems: this.gems
                            ? this.gems.filter((gem) => this.camera?.isVisible(gem.x, gem.y, player)).length
                            : 0,
                        hp: player.hp,
                        level: player.level,
                        exp: player.exp,
                        expToNext: player.expToNext,
                        fps: this.fpsMeter?.fps ?? 0,
                        quiz: quizStats()
                    });
                }
            });
        }

        bindUi() {
            this.document.getElementById('startButton').addEventListener('click', () => this.start());
            this.document.getElementById('retryButton').addEventListener('click', () => this.start());
            this.document.getElementById('menuButton').addEventListener('click', () => this.toMenu());
            this.ui.soundButton.addEventListener('click', () => {
                this.settings = saveSettings({ soundEnabled: !this.settings.soundEnabled });
                this.audio.setEnabled(this.settings.soundEnabled);
                this.ui.setSound(this.settings.soundEnabled);
            });
        }

        start() {
            Quiz?.hideOverlay?.();
            this.state = GameState.PLAYING;
            this.resultWon = null;
            this.gameTime = 0;
            this.kills = 0;
            this.spawnClock = 0;
            this.releaseEntities();
            this.player = new Player(0, 0);
            this.weapon = new Weapon(WEAPONS.LIGHT_ORB);
            this.projectiles = [];
            this.ui.showPlaying();
            this.spawnEnemy(true);
        }

        toMenu() {
            Quiz?.hideOverlay?.();
            this.state = GameState.START;
            this.resultWon = null;
            this.ui.showStart();
        }

        spawnEnemy(first = false) {
            if (this.enemies.length >= CONFIG.MAX_ENEMIES) return;
            const definition = ENEMY_LIST[Math.floor(Math.random() * ENEMY_LIST.length)];
            const point = this.camera.getSpawnPoint(this.player, Math.random, CONFIG.SPAWN_MARGIN);
            const enemy = this.enemyPool.acquire(point.x, point.y, definition);
            if (!enemy) return;
            this.enemies.push(enemy);
        }

        update(dt) {
            if (this.state !== GameState.PLAYING) return;
            this.gameTime += dt;
            this.spawnClock -= dt;
            if (this.spawnClock <= 0) {
                this.spawnClock = Math.max(0.22, CONFIG.SPAWN_INTERVAL - this.gameTime * 0.0015);
                this.spawnEnemy();
            }
            this.player.update(dt, this);
            this.weapon.update(dt, this.player, this);
            for (const enemy of this.enemies) enemy.update(dt, this.player);
            for (const projectile of this.projectiles) projectile.update(dt);
            this.resolveProjectiles();
            this.resolveContact();
            this.resolveGems(dt);
            this.recycleEntities();
            this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
            this.effects.update(dt);
            if (this.player.hp <= 0) {
                this.finish(false);
            } else if (this.gameTime >= this.matchSeconds) {
                this.gameTime = this.matchSeconds;
                this.finish(true);
            }
            this.ui.updateHud(this);
        }

        resolveProjectiles() {
            this.enemyHash.insertAll(this.enemies);
            for (const projectile of this.projectiles) {
                const nearby = this.enemyHash.queryRect(projectile.x, projectile.y, 18);
                for (const enemy of nearby) {
                    if (enemy.dead) continue;
                    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
                    if (distance <= enemy.size + projectile.size) {
                        enemy.takeDamage(projectile.damage);
                        projectile.dead = true;
                        this.effects.flash(0.05);
                        if (enemy.dead) {
                            this.kills += 1;
                            this.dropExpGem(enemy);
                        }
                        break;
                    }
                }
            }
        }

        dropExpGem(enemy) {
            if (enemy.dropped || this.gems.length >= CONFIG.MAX_GEMS) return false;
            if (this.gemPool.created >= CONFIG.MAX_GEMS && this.gemPool.free.length === 0) return false;
            const gem = this.gemPool.acquire(enemy.x, enemy.y, enemy.exp);
            if (!gem) return false;
            enemy.dropped = true;
            this.gems.push(gem);
            return true;
        }

        resolveGems(dt) {
            let leveledUp = false;
            for (const gem of this.gems) {
                if (gem.dead) continue;
                if (gem.update(dt, this.player)) {
                    leveledUp = this.player.addExp(gem.value) || leveledUp;
                }
            }
            if (leveledUp) this.onLevelUpHook();
        }

        releaseEntities() {
            for (const enemy of this.enemies || []) this.enemyPool?.release(enemy);
            for (const gem of this.gems || []) this.gemPool?.release(gem);
            this.enemies = [];
            this.gems = [];
        }

        recycleEntities() {
            const keptEnemies = [];
            for (const enemy of this.enemies) {
                if (enemy.dead || this.camera.isOutside(enemy.x, enemy.y, this.player, CONFIG.CAMERA_CULL_MARGIN)) {
                    this.enemyPool.release(enemy);
                } else {
                    keptEnemies.push(enemy);
                }
            }
            this.enemies = keptEnemies;

            const keptGems = [];
            for (const gem of this.gems) {
                if (gem.dead || this.camera.isOutside(gem.x, gem.y, this.player, CONFIG.CAMERA_CULL_MARGIN)) {
                    this.gemPool.release(gem);
                } else {
                    keptGems.push(gem);
                }
            }
            this.gems = keptGems;
        }

        resolveContact() {
            for (const enemy of this.enemies) {
                const distance = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (distance <= enemy.size + this.player.size && enemy.contactWait <= 0) {
                    if (this.player.takeDamage(enemy.damage)) {
                        enemy.contactWait = 0.7;
                        this.effects.flash(0.12);
                    }
                }
            }
        }

        onLevelUpHook() {
            if (this.state !== GameState.PLAYING || typeof Quiz?.ask !== 'function') return;
            this.state = GameState.QUIZ;
            Quiz.ask({
                subjects: ['dummy'],
                grades: [1],
                ctxFn: () => '成長の合図です。答えても答えなくても大丈夫です。',
                onResult: (correct) => {
                    if (this.weapon.level < CONFIG.WEAPON_MAX_LEVEL) this.weapon.levelUp();
                    if (correct) this.state = GameState.PLAYING;
                },
                onContinue: () => {
                    this.state = GameState.PLAYING;
                }
            });
        }

        finish(won) {
            if (this.state !== GameState.PLAYING) return;
            Quiz?.hideOverlay?.();
            this.state = GameState.RESULT;
            this.resultWon = Boolean(won);
            this.ui.showResult(won, this.gameTime, this.kills, this.demo);
        }

        frame(timestamp) {
            if (!this.lastFrame) this.lastFrame = timestamp;
            const dt = Math.min(0.05, Math.max(0, (timestamp - this.lastFrame) / 1000));
            this.lastFrame = timestamp;
            this.update(dt);
            this.render();
            const fps = this.fpsMeter.tick(timestamp);
            this.ui.updatePerf(this, fps);
            this.window.requestAnimationFrame(this.boundFrame);
        }

        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = '#fbfaf4';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.save();
            this.camera.apply(ctx, this.player);
            this.drawArena(ctx);
            for (const gem of this.gems) this.drawGem(ctx, gem);
            for (const projectile of this.projectiles) this.drawProjectile(ctx, projectile);
            for (const enemy of this.enemies) this.drawEnemy(ctx, enemy);
            this.drawPlayer(ctx);
            ctx.restore();
            this.notebook?.drawMargin(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.effects.render(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        drawArena(ctx) {
            if (this.notebook) {
                this.notebook.drawPaper(
                    ctx,
                    this.player,
                    CONFIG.CANVAS_WIDTH,
                    CONFIG.CANVAS_HEIGHT,
                    CONFIG.WORLD_SCALE
                );
                return;
            }
            ctx.strokeStyle = 'rgba(145, 182, 210, 0.1)';
            ctx.lineWidth = 1 / CONFIG.WORLD_SCALE;
            const halfWorldWidth = CONFIG.CANVAS_WIDTH / CONFIG.WORLD_SCALE / 2;
            const halfWorldHeight = CONFIG.CANVAS_HEIGHT / CONFIG.WORLD_SCALE / 2;
            const startX = Math.floor((this.player.wx - halfWorldWidth) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            const endX = Math.ceil((this.player.wx + halfWorldWidth) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            const startY = Math.floor((this.player.wy - halfWorldHeight) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            const endY = Math.ceil((this.player.wy + halfWorldHeight) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            for (let x = startX; x <= endX; x += CONFIG.GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
                ctx.stroke();
            }
            for (let y = startY; y <= endY; y += CONFIG.GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();
            }
        }

        drawPlayer(ctx) {
            const drewNotebook = this.notebook?.drawPlayer(ctx, this.player);
            if (!drewNotebook) {
                ctx.fillStyle = this.player.invulnerable > 0 ? '#e0c39e' : '#8eb4ca';
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#1f5a86';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
            const barWidth = 48;
            const barHeight = 6;
            const barX = this.player.x - barWidth / 2;
            const barY = this.player.y + this.player.size + 9;
            ctx.fillStyle = 'rgba(31, 90, 134, 0.18)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = hpRatio > 0.35 ? '#2b719c' : '#c0524d';
            ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
        }

        drawGem(ctx, gem) {
            if (this.notebook?.drawGem(ctx, gem)) return;
            ctx.fillStyle = 'rgba(98, 145, 180, 0.48)';
            ctx.strokeStyle = '#1f5a86';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gem.x, gem.y - gem.size);
            ctx.lineTo(gem.x + gem.size, gem.y);
            ctx.lineTo(gem.x, gem.y + gem.size);
            ctx.lineTo(gem.x - gem.size, gem.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        drawEnemy(ctx, enemy) {
            if (this.notebook?.drawEnemy(ctx, enemy)) return;
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            if (enemy.id === 'chaser') {
                ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            } else {
                ctx.moveTo(enemy.x, enemy.y - enemy.size);
                ctx.lineTo(enemy.x + enemy.size, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + enemy.size);
                ctx.lineTo(enemy.x - enemy.size, enemy.y);
                ctx.closePath();
            }
            ctx.fill();
        }

        drawProjectile(ctx, projectile) {
            if (this.notebook?.drawProjectile(ctx, projectile)) return;
            ctx.fillStyle = '#2b719c';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function boot() {
        const game = new Game();
        game.window.requestAnimationFrame(game.boundFrame);
        return game;
    }

    const api = { Game, boot, formatTime };
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
