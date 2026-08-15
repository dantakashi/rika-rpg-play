(function (root) {
    const CONFIG = Object.freeze({
        CANVAS_WIDTH: 960,
        CANVAS_HEIGHT: 540,
        WORLD_SCALE: 0.5,
        ARENA_WIDTH: 1920,
        ARENA_HEIGHT: 1080,
        PLAYER_SPEED: 220,
        PLAYER_SIZE: 18,
        MAX_ENEMIES: 120,
        MAX_GEMS: 180,
        GRID_SIZE: 80,
        CAMERA_CULL_MARGIN: 420,
        SPAWN_MARGIN: 130,
        GEM_MAGNET_RADIUS: 120,
        GEM_PICKUP_RADIUS: 24,
        MATCH_SECONDS: 180,
        SPAWN_INTERVAL: 0.85,
        WEAPON_MAX_LEVEL: 5,
        EXP_TO_NEXT: 35
    });

    const GameState = Object.freeze({
        START: 'start',
        PLAYING: 'playing',
        QUIZ: 'quiz',
        RESULT: 'result'
    });

    const SETTINGS_KEY = 'mini_vansaba_settings_v1';
    const api = { CONFIG, GameState, SETTINGS_KEY };
    root.Game = Object.assign(root.Game || {}, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
