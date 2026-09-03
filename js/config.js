/**
 * Crownforge: Taj Khakestar - Game Configuration
 * All game constants, building definitions, and static data
 */

export const CONFIG = {
    // Game constants
    TILE_SIZE: 42,
    SAVE_KEY: 'crownforge_save_v4',
    MAX_DAY: 999,
    MAP_BOUNDS: { minX: -7, maxX: 7, minY: -6, maxY: 7 },

    // Timing
    TICK_INTERVAL: 4000,       // Resource production tick (ms)
    DAY_INTERVAL: 60000,       // Day increment (ms)
    MAX_ELAPSED_TICK: 15,      // Max elapsed ticks per interval

    // Starting resources
    START_GOLD: 1200,
    START_FOOD: 800,
    START_GEMS: 35,
    START_POP: 12,
    START_ARMY: 12,

    // Base building definitions
    BUILDINGS: [
        {
            id: 'keep',
            name: 'دژ سلطنتی',
            x: 0, y: 0,
            lvl: 1, w: 2, h: 2,
            emoji: '🏰',
            baseCost: 0,
            baseHp: 1200,
            type: 'core',
            maxLevel: 10,
            description: 'قلب امپراتوری شما. ارتقا ظرفیت جمعیت را افزایش می‌دهد.'
        },
        {
            id: 'farm',
            name: 'مزرعه گندم',
            x: -3, y: 1,
            lvl: 1, w: 2, h: 2,
            emoji: '🌾',
            baseCost: 250,
            baseHp: 300,
            type: 'resource',
            maxLevel: 10,
            production: { food: 8 },
            description: 'غذا تولید می‌کند. هر سطح: +8 غذا/چرخه.'
        },
        {
            id: 'mine',
            name: 'معدن طلا',
            x: 3, y: 1,
            lvl: 1, w: 2, h: 2,
            emoji: '⛏️',
            baseCost: 300,
            baseHp: 320,
            type: 'resource',
            maxLevel: 10,
            production: { gold: 6 },
            description: 'طلا تولید می‌کند. هر سطح: +6 طلا/چرخه.'
        },
        {
            id: 'barracks',
            name: 'سربازخانه',
            x: -3, y: -2,
            lvl: 1, w: 2, h: 2,
            emoji: '⚔️',
            baseCost: 400,
            baseHp: 400,
            type: 'military',
            maxLevel: 10,
            description: 'ظرفیت ارتش را افزایش می‌دهد. هر سطح: +4 سرباز.'
        },
        {
            id: 'tower',
            name: 'برج دیده‌بانی',
            x: 3, y: -2,
            lvl: 1, w: 2, h: 2,
            emoji: '🗼',
            baseCost: 450,
            baseHp: 500,
            type: 'defense',
            maxLevel: 10,
            defensePower: 24,
            description: 'قدرت دفاع را افزایش می‌دهد. هر سطح: +24 قدرت.'
        },
        {
            id: 'store',
            name: 'انبار سلطنتی',
            x: 0, y: 4,
            lvl: 1, w: 2, h: 2,
            emoji: '📦',
            baseCost: 350,
            baseHp: 450,
            type: 'storage',
            maxLevel: 10,
            capacityBonus: 300,
            description: 'ظرفیت ذخیره طلا و غذا را افزایش می‌دهد. هر سطح: +300.'
        },
        {
            id: 'wall1',
            name: 'دیوار سنگی',
            x: -5, y: 4,
            lvl: 1, w: 1, h: 1,
            emoji: '🧱',
            baseCost: 120,
            baseHp: 500,
            type: 'defense',
            maxLevel: 5,
            defensePower: 18,
            description: 'دیوار دفاعی. هر سطح: +18 قدرت دفاع.'
        },
        {
            id: 'wall2',
            name: 'دیوار سنگی',
            x: 5, y: 4,
            lvl: 1, w: 1, h: 1,
            emoji: '🧱',
            baseCost: 120,
            baseHp: 500,
            type: 'defense',
            maxLevel: 5,
            defensePower: 18,
            description: 'دیوار دفاعی. هر سطح: +18 قدرت دفاع.'
        },
        {
            id: 'workshop',
            name: 'کارگاه محاصره',
            x: -5, y: -3,
            lvl: 1, w: 2, h: 2,
            emoji: '🔨',
            baseCost: 600,
            baseHp: 350,
            type: 'special',
            maxLevel: 5,
            description: 'باز کردن واحدها و قابلیت‌های پیشرفته جنگی.'
        }
    ],

    // Buildable buildings (constructed by player)
    BUILDABLE: [
        {
            id: 'house',
            name: 'خانه دهقانان',
            emoji: '🏠',
            baseCost: 300,
            baseHp: 280,
            w: 2, h: 2,
            popBonus: 4,
            maxLevel: 1,
            description: 'ظرفیت جمعیت +4'
        },
        {
            id: 'farm',
            name: 'مزرعه گندم',
            emoji: '🌾',
            baseCost: 250,
            baseHp: 300,
            w: 2, h: 2,
            production: { food: 8 },
            maxLevel: 10,
            description: 'تولید غذا: +8/چرخه'
        },
        {
            id: 'mine',
            name: 'معدن طلا',
            emoji: '⛏️',
            baseCost: 300,
            baseHp: 320,
            w: 2, h: 2,
            production: { gold: 6 },
            maxLevel: 10,
            description: 'تولید طلا: +6/چرخه'
        },
        {
            id: 'barracks',
            name: 'سربازخانه',
            emoji: '⚔️',
            baseCost: 400,
            baseHp: 400,
            w: 2, h: 2,
            maxLevel: 10,
            description: 'ظرفیت ارتش: +4/سطح'
        },
        {
            id: 'tower',
            name: 'برج دیده‌بانی',
            emoji: '🗼',
            baseCost: 450,
            baseHp: 500,
            w: 2, h: 2,
            defensePower: 24,
            maxLevel: 10,
            description: 'قدرت دفاع: +24/سطح'
        },
        {
            id: 'store',
            name: 'انبار سلطنتی',
            emoji: '📦',
            baseCost: 350,
            baseHp: 450,
            w: 2, h: 2,
            capacityBonus: 300,
            maxLevel: 10,
            description: 'ظرفیت انبار: +300/سطح'
        },
        {
            id: 'wall',
            name: 'دیوار سنگی',
            emoji: '🧱',
            baseCost: 120,
            baseHp: 500,
            w: 1, h: 1,
            defensePower: 18,
            maxLevel: 5,
            description: 'قدرت دفاع: +18/سطح'
        }
    ],

    // Training
    TRAIN_COST: 40,
    BASE_ARMY_CAP: 8,
    ARMY_PER_BARRACKS: 4,
    BASE_POP_CAP: 50,
    POP_PER_KEEP_LVL: 10,
    POP_PER_HOUSE: 4,

    // Upgrade formula
    UPGRADE_BASE_COST: 180,
    UPGRADE_COST_MULT: 1.32,
    HP_MULT_PER_LEVEL: 0.35,

    // Combat
    MIN_RAID_ARMY: 5,
    BASE_SOLDIER_POWER: 2,
    BASE_ATTACK_DAMAGE: 75,
    ATTACK_DAMAGE_VARIANCE: 55,
    ENEMY_DEFENSE_DAMAGE_REDUCTION: 7,
    WIN_HONOR: 35,
    WIN_BONUS_MAX: 0.5,

    // Enemy generation
    ENEMY_BASE_HP: 850,
    ENEMY_HP_PER_DAY: 70,
    ENEMY_HP_PER_DIFF: 120,
    ENEMY_BASE_GOLD: 300,
    ENEMY_GOLD_PER_DAY: 45,
    ENEMY_GOLD_VARIANCE: 220,
    ENEMY_BASE_FOOD: 160,
    ENEMY_FOOD_PER_DAY: 25,
    ENEMY_FOOD_VARIANCE: 160,

    // Difficulty
    DIFFICULTY_PER_HONOR: 100,
    DEFENSE_PER_DAY: 4,
    DEFENSE_PER_HONOR: 150,
    MIN_DEFENSE: 2,
    MAX_DEFENSE: 5,

    // Visual
    GRASS_COLORS: ['#80ad70', '#75a264'],
    GRASS_STROKE: '#4d714a88',
    RIVER_COLOR: '#4d8eb0',
    RIVER_HIGHLIGHT: '#83bfd3',
    ROAD_COLOR: '#b99a68',
    ROAD_HIGHLIGHT: '#d4b77f',
    TREE_EMOJIS: ['🌳', '🌲'],
    BUILDING_SHADOW: '#182016aa',
    SELECTION_GLOW: '#ffe58a'
};

export const ENEMY_NAMES = [
    'دژ گرگ‌سنگ',
    'قلعه مه‌آلود',
    'سنگر شاه‌خائن',
    'قلعه آهنین',
    'کاخ سایه‌زنان',
    'دژ گمانه‌زن',
    'قلعه خروشان',
    'برج ناگهان'
];

export const QUESTS = [
    { id: 'upgrade', name: 'معمار ماهر', desc: 'ساختمان‌ها را ارتقا دهید', target: 10, reward: { gems: 10 } },
    { id: 'raidWin', name: 'فاتح دژها', desc: 'یورش‌ها را برنده شوید', target: 5, reward: { gems: 15 } },
    { id: 'trained', name: 'سرلشکر', desc: 'سرباز آموزش دهید', target: 20, reward: { gold: 500 } },
    { id: 'days', name: 'بازمانده', desc: 'روزهای طولانی بگذراند', target: 30, reward: { gems: 25 } }
];