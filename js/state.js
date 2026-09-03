/**
 * Crownforge: Taj Khakestar - State Management
 * Centralized game state with reactive updates
 */

import { CONFIG } from './config.js';

export class GameState {
    constructor() {
        this._state = {
            // Resources
            gold: CONFIG.START_GOLD,
            food: CONFIG.START_FOOD,
            gems: CONFIG.START_GEMS,

            // Time
            day: 1,
            honor: 0,

            // Population & Army
            pop: CONFIG.START_POP,
            popCap: CONFIG.BASE_POP_CAP,
            army: CONFIG.START_ARMY,
            armyCap: CONFIG.BASE_ARMY_CAP,

            // UI State
            mode: 'normal',           // normal, build, battle
            selectedBuilding: null,   // currently selected building
            battle: null,             // active battle data
            enemy: null,              // current enemy

            // Quests/Stats
            quests: {
                upgrade: 0,
                raidWin: 0,
                trained: 0,
                days: 0
            },

            // Timing
            lastTick: Date.now(),

            // Settings
            soundEnabled: true,
            animationsEnabled: true
        };

        this._listeners = new Map();
        this._buildings = [];
    }

    // Getters
    get gold() { return this._state.gold; }
    get food() { return this._state.food; }
    get gems() { return this._state.gems; }
    get day() { return this._state.day; }
    get honor() { return this._state.honor; }
    get pop() { return this._state.pop; }
    get popCap() { return this._state.popCap; }
    get army() { return this._state.army; }
    get armyCap() { return this._state.armyCap; }
    get mode() { return this._state.mode; }
    get selectedBuilding() { return this._state.selectedBuilding; }
    get battle() { return this._state.battle; }
    get enemy() { return this._state.enemy; }
    get quests() { return this._state.quests; }
    get buildings() { return this._buildings; }

    set buildings(value) {
        this._buildings = value;
        this.emit('buildingsChanged', this._buildings);
    }

    // Resource setters with clamping and events
    setGold(value) {
        const capped = Math.max(0, Math.min(value, this.getGoldCapacity()));
        if (capped !== this._state.gold) {
            this._state.gold = capped;
            this.emit('resourceChanged', { gold: capped });
        }
        return capped;
    }

    setFood(value) {
        const capped = Math.max(0, Math.min(value, this.getFoodCapacity()));
        if (capped !== this._state.food) {
            this._state.food = capped;
            this.emit('resourceChanged', { food: capped });
        }
        return capped;
    }

    setGems(value) {
        const capped = Math.max(0, value);
        if (capped !== this._state.gems) {
            this._state.gems = capped;
            this.emit('resourceChanged', { gems: capped });
        }
        return capped;
    }

    addGold(amount) { return this.setGold(this._state.gold + amount); }
    addFood(amount) { return this.setFood(this._state.food + amount); }
    addGems(amount) { return this.setGems(this._state.gems + amount); }

    spendGold(amount) { return this.setGold(this._state.gold - amount); }
    spendFood(amount) { return this.setFood(this._state.food - amount); }
    spendGems(amount) { return this.setGems(this._state.gems - amount); }

    // Capacity calculations
    getGoldCapacity() {
        const storeLevels = this.getBuildingLevelSum('store');
        return 1800 + storeLevels * 300;
    }

    getFoodCapacity() {
        const storeLevels = this.getBuildingLevelSum('store');
        return 1200 + storeLevels * 300;
    }

    // Population & Army capacity
    recalculateCapacities() {
        const keep = this.getBuilding('keep');
        const barracksLevels = this.getBuildingLevelSum('barracks');
        const houseCount = this.getBuildingCount('house');

        this._state.popCap = CONFIG.BASE_POP_CAP +
            (keep ? (keep.lvl - 1) * CONFIG.POP_PER_KEEP_LVL : 0) +
            houseCount * CONFIG.POP_PER_HOUSE;

        this._state.armyCap = CONFIG.BASE_ARMY_CAP + barracksLevels * CONFIG.ARMY_PER_BARRACKS;

        // Clamp current values
        this._state.pop = Math.min(this._state.pop, this._state.popCap);
        this._state.army = Math.min(this._state.army, this._state.armyCap);

        this.emit('capacityChanged', {
            popCap: this._state.popCap,
            armyCap: this._state.armyCap,
            pop: this._state.pop,
            army: this._state.army
        });
    }

    // Building queries
    getBuilding(id) {
        return this._buildings.find(b => b.id === id);
    }

    getBuildingCount(idPrefix) {
        return this._buildings.filter(b => b.id.startsWith(idPrefix)).length;
    }

    getBuildingLevelSum(idPrefix) {
        return this._buildings
            .filter(b => b.id.startsWith(idPrefix))
            .reduce((sum, b) => sum + (b.lvl || 1), 0);
    }

    getBuildingsByType(type) {
        return this._buildings.filter(b => b.type === type);
    }

    canAfford(goldCost = 0, foodCost = 0, gemCost = 0) {
        return this._state.gold >= goldCost &&
               this._state.food >= foodCost &&
               this._state.gems >= gemCost;
    }

    // Mode management
    setMode(mode) {
        if (this._state.mode !== mode) {
            this._state.mode = mode;
            this.emit('modeChanged', mode);
        }
    }

    setSelectedBuilding(building) {
        this._state.selectedBuilding = building;
        this.emit('selectionChanged', building);
    }

    // Battle management
    startBattle(enemy) {
        this._state.enemy = enemy;
        this._state.battle = {
            enemy,
            started: Date.now(),
            log: []
        };
        this.setMode('battle');
        this.emit('battleStarted', enemy);
    }

    endBattle(won, reason = '') {
        const enemy = this._state.enemy;
        this._state.battle = null;
        this._state.enemy = null;
        this.setMode('normal');
        this.setSelectedBuilding(null);
        this.emit('battleEnded', { won, enemy, reason });
    }

    recordBattleLog(message) {
        if (this._state.battle) {
            this._state.battle.log.push({
                time: Date.now(),
                message
            });
            this.emit('battleLog', message);
        }
    }

    // Quest progress
    incrementQuest(questId, amount = 1) {
        if (this._state.quests[questId] !== undefined) {
            this._state.quests[questId] += amount;
            this.emit('questProgress', { questId, value: this._state.quests[questId] });
        }
    }

    // Day progression
    nextDay() {
        this._state.day = Math.min(this._state.day + 1, CONFIG.MAX_DAY);
        this._state.quests.days = this._state.day;
        this.emit('dayChanged', this._state.day);
    }

    // Serialization
    toJSON() {
        return {
            version: 4,
            state: {
                ...this._state,
                selectedBuilding: null,
                battle: null,
                enemy: null
            },
            buildings: this._buildings
        };
    }

    static fromJSON(data) {
        const gameState = new GameState();
        if (data.state) {
            Object.assign(gameState._state, data.state);
        }
        if (Array.isArray(data.buildings)) {
            gameState._buildings = data.buildings;
        }
        gameState.recalculateCapacities();
        return gameState;
    }

    // Event system
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            const idx = listeners.indexOf(callback);
            if (idx > -1) listeners.splice(idx, 1);
        }
    }

    emit(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(cb => cb(data));
        }
    }

    // Debug
    debug() {
        console.log('GameState:', this._state);
        console.log('Buildings:', this._buildings.length);
    }
}

// Singleton instance
export const gameState = new GameState();