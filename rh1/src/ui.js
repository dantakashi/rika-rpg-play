(function (root) {
    class UI {
        constructor() {
            this.startScreen = document.getElementById('startScreen');
            this.resultScreen = document.getElementById('resultScreen');
            this.canvasHud = document.getElementById('hud');
            this.perf = document.getElementById('perf');
            this.soundButton = document.getElementById('soundButton');
            this.resultTitle = document.getElementById('resultTitle');
        }

        showStart() {
            this.startScreen.hidden = false;
            this.resultScreen.hidden = true;
            this.canvasHud.hidden = true;
        }

        showPlaying() {
            this.startScreen.hidden = true;
            this.resultScreen.hidden = true;
            this.canvasHud.hidden = false;
        }

        showResult(won, time, kills, demo = false) {
            this.canvasHud.hidden = true;
            this.resultTitle.textContent = won ? '勝利' : '敗北';
            document.getElementById('resultMessage').textContent = won
                ? demo ? 'デモを完走しました。' : '3分間、生き抜きました。'
                : '体力がなくなりました。';
            document.getElementById('resultTime').textContent = formatTime(time);
            document.getElementById('resultKills').textContent = String(kills);
            this.resultScreen.hidden = false;
        }

        updateHud(game) {
            document.getElementById('timeValue').textContent = formatTime(game.gameTime);
            document.getElementById('killsValue').textContent = String(game.kills);
            document.getElementById('levelValue').textContent = String(game.player.level);
            document.getElementById('enemyValue').textContent = String(game.enemies.length);
            const gemValue = document.getElementById('gemValue');
            if (gemValue) {
                const visibleGems = game.camera
                    ? game.gems.filter((gem) => game.camera.isVisible(gem.x, gem.y, game.player)).length
                    : game.gems?.length ?? 0;
                gemValue.textContent = String(visibleGems);
            }
            document.getElementById('hpValue').textContent = String(Math.ceil(game.player.hp));
            document.getElementById('hpBar').style.width = `${game.player.hp}%`;
            document.getElementById('expBar').style.width = `${
                (game.player.exp / game.player.expToNext) * 100
            }%`;
        }

        updatePerf(game, fps) {
            if (game.perfEnabled) {
                this.perf.hidden = false;
                this.perf.textContent = `fps ${fps || '--'}　敵 ${game.enemies.length}　時間 ${formatTime(game.gameTime)}`;
            } else {
                this.perf.hidden = true;
            }
        }

        setSound(enabled) {
            this.soundButton.textContent = enabled ? '音声：ON' : '音声：OFF';
            this.soundButton.setAttribute('aria-pressed', String(enabled));
        }
    }

    function formatTime(seconds) {
        const value = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(value / 60);
        const rest = value % 60;
        return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    }

    const api = { UI, formatTime };
    const namespace = root.Game || (root.Game = {});
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
