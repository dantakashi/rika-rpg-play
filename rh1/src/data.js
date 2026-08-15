(function (root) {
    const WEAPONS = Object.freeze({
        LIGHT_ORB: Object.freeze({
            id: 'light_orb',
            name: '光のオーブ',
            icon: '✦',
            baseDamage: 24,
            baseCooldown: 0.62,
            baseRange: 330,
            type: 'projectile',
            evolveLevel: 5
        })
    });

    const ENEMIES = Object.freeze({
        CHASER: Object.freeze({
            id: 'chaser',
            name: '追跡者',
            hp: 42,
            speed: 52,
            damage: 12,
            size: 16,
            color: '#646b72',
            behavior: 'chase',
            exp: 10
        }),
        SWERVER: Object.freeze({
            id: 'swerver',
            name: 'ふらつき',
            hp: 30,
            speed: 40,
            damage: 8,
            size: 14,
            color: '#bd5b43',
            behavior: 'swerve',
            exp: 12
        })
    });

    const ENEMY_LIST = Object.freeze(Object.values(ENEMIES));
    const api = { WEAPONS, ENEMIES, ENEMY_LIST };
    root.Game = Object.assign(root.Game || {}, api);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
