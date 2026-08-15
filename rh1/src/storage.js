(function (root) {
    const namespace = root.Game || (root.Game = {});
    let { SETTINGS_KEY } = namespace;
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        ({ SETTINGS_KEY } = require('./config.js'));
    }

    const DEFAULT_SETTINGS = Object.freeze({ soundEnabled: false });

    function canUseStorage() {
        if (typeof window === 'undefined') return false;
        try {
            return Boolean(window.localStorage);
        } catch {
            return false;
        }
    }

    function loadSettings() {
        if (!canUseStorage()) return { ...DEFAULT_SETTINGS };
        try {
            const raw = window.localStorage.getItem(SETTINGS_KEY);
            if (!raw) return { ...DEFAULT_SETTINGS };
            const parsed = JSON.parse(raw);
            return { soundEnabled: parsed?.soundEnabled === true };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings(settings) {
        const value = { soundEnabled: settings?.soundEnabled === true };
        if (!canUseStorage()) return value;
        try {
            window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
        } catch {
            // 設定保存が使えない環境でもゲームは継続する。
        }
        return value;
    }

    function _resetSettingsForTests() {
        if (!canUseStorage()) return;
        try {
            window.localStorage.removeItem(SETTINGS_KEY);
        } catch {
            // テスト環境にストレージがない場合は何もしない。
        }
    }

    const api = { loadSettings, saveSettings, _resetSettingsForTests };
    Object.assign(namespace, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
