/**
 * Crownforge: Taj Khakestar - Building Logic
 * Handles building placement, upgrades, production, and validation
 */

import { CONFIG } from './config.js';

export class BuildingManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.buildings = gameState.buildings;
    }

    // Initialize buildings from config
    initializeBuildings() {
        this.buildings = CONFIG.BUILDINGS.map(b => ({
            ...b,
            id: b.id,
            lvl: b.lvl || 1,
            hp: b.baseHp || 100
        }));
        this.gameState.buildings = this.buildings;
    }

    // Load buildings from save data
    loadBuildings(savedBuildings) {
        this.buildings = savedBuildings.map(b => ({
            ...b,
            lvl: b.lvl || 1
        }));
        this.gameState.buildings = this.buildings;
        this.gameState.recalculateCapacities();
    }

    // Check if a position is valid for placement
    canPlace(x, y, w = 2, h = 2) {
        // Check map bounds
        if (x < CONFIG.MAP_BOUNDS.minX || x > CONFIG.MAP_BOUNDS.maxX ||
            y < CONFIG.MAP_BOUNDS.minY || y > CONFIG.MAP_BOUNDS.maxY) {
            return false;
        }

        // Check collision with existing buildings
        for (const building of this.buildings) {
            const bx = building.x;
            const by = building.y;
            const bw = building.w || 2;
            const bh = building.h || 2;

            // AABB collision with padding
            const minDistX = Math.max(2, (bw + w) / 2);
            const minDistY = Math.max(2, (bh + h) / 2);

            if (Math.abs(bx - x) < minDistX && Math.abs(by - y) < minDistY) {
                return false;
            }
        }

        return true;
    }

    // Find valid placement positions near a coordinate
    findValidPositionsNear(x, y, w = 2, h = 2, radius = 3) {
        const positions = [];
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.canPlace(nx, ny, w, h)) {
                    positions.push({ x: nx, y: ny, dist: Math.abs(dx) + Math.abs(dy) });
                }
            }
        }
        return positions.sort((a, b) => a.dist - b.dist);
    }

    // Build a new building
    build(buildingType, x, y) {
        const def = CONFIG.BUILDABLE.find(b => b.id === buildingType);
        if (!def) {
            return { success: false, error: 'نوع ساختمان نامعتبر است' };
        }

        if (!this.canPlace(x, y, def.w, def.h)) {
            return { success: false, error: 'این مکان برای ساخت مناسب نیست' };
        }

        if (!this.gameState.canAfford(def.baseCost)) {
            return { success: false, error: `برای ساخت ${def.baseCost} طلا لازم است` };
        }

        // Spend resources
        this.gameState.spendGold(def.baseCost);

        // Create building
        const newBuilding = {
            id: `${buildingType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: def.name,
            x, y,
            lvl: 1,
            w: def.w,
            h: def.h,
            emoji: def.emoji,
            baseCost: def.baseCost,
            baseHp: def.baseHp,
            type: def.type || 'custom',
            hp: def.baseHp,
            maxLevel: def.maxLevel || 10
        };

        // Apply bonuses
        if (def.popBonus) {
            this.gameState._state.popCap += def.popBonus;
        }
        if (def.production) {
            // Production is calculated dynamically
        }

        this.buildings.push(newBuilding);
        this.gameState.buildings = this.buildings;
        this.gameState.recalculateCapacities();

        return { success: true, building: newBuilding };
    }

    // Upgrade a building
    upgrade(building) {
        const cost = this.getUpgradeCost(building);
        if (!this.gameState.canAfford(cost)) {
            return { success: false, error: `برای ارتقا ${cost} طلا لازم است` };
        }

        if (building.lvl >= (building.maxLevel || 10)) {
            return { success: false, error: 'این ساختمان به حداکثر سطح رسیده است' };
        }

        this.gameState.spendGold(cost);
        building.lvl++;

        // Apply level-up effects
        this.applyUpgradeEffects(building);

        this.gameState.recalculateCapacities();
        this.gameState.incrementQuest('upgrade');

        return { success: true, building };
    }

    getUpgradeCost(building) {
        return Math.floor(CONFIG.UPGRADE_BASE_COST * Math.pow(CONFIG.UPGRADE_COST_MULT, building.lvl - 1));
    }

    getMaxHp(building) {
        return Math.floor((building.baseHp || 100) * (1 + (building.lvl - 1) * CONFIG.HP_MULT_PER_LEVEL));
    }

    applyUpgradeEffects(building) {
        // Keep gives population capacity
        if (building.id === 'keep') {
            this.gameState._state.popCap += CONFIG.POP_PER_KEEP_LVL;
        }
        // Other effects are calculated dynamically via level sums
    }

    // Get production rates
    getProduction() {
        let food = 0;
        let gold = 0;

        for (const building of this.buildings) {
            if (building.id.startsWith('farm')) {
                food += building.lvl * 8;
            } else if (building.id.startsWith('mine')) {
                gold += building.lvl * 6;
            }
        }

        return { food, gold };
    }

    // Get defense power
    getDefensePower() {
        let power = 0;
        for (const building of this.buildings) {
            if (building.id.startsWith('tower')) {
                power += building.lvl * 24;
            } else if (building.id.startsWith('wall')) {
                power += building.lvl * 18;
            } else if (building.id === 'keep') {
                power += building.lvl * 8;
            }
        }
        return power;
    }

    // Get resource capacities
    getCapacities() {
        const storeLevels = this.gameState.getBuildingLevelSum('store');
        return {
            gold: 1800 + storeLevels * 300,
            food: 1200 + storeLevels * 300
        };
    }

    // Train a soldier
    trainSoldier() {
        const barracks = this.gameState.getBuilding('barracks');
        if (!barracks) {
            return { success: false, error: 'اول سربازخانه بسازید' };
        }

        if (this.gameState.army >= this.gameState.armyCap) {
            return { success: false, error: 'ظرفیت ارتش پر است' };
        }

        if (this.gameState.pop >= this.gameState.popCap) {
            return { success: false, error: 'جمعیت کافی برای نیروی جدید ندارید' };
        }

        if (!this.gameState.canAfford(0, CONFIG.TRAIN_COST)) {
            return { success: false, error: `برای آموزش ${CONFIG.TRAIN_COST} غذا لازم است` };
        }

        this.gameState.spendFood(CONFIG.TRAIN_COST);
        this.gameState._state.army++;
        this.gameState._state.pop++;
        this.gameState.incrementQuest('trained');

        this.gameState.emit('resourceChanged', {
            food: this.gameState.food,
            army: this.gameState.army,
            pop: this.gameState.pop
        });

        return { success: true };
    }

    // Find building at screen coordinates
    findBuildingAt(renderer, screenX, screenY) {
        const tile = renderer.screenToTile(screenX, screenY);
        return this.buildings.find(b => {
            const bw = b.w || 2;
            const bh = b.h || 2;
            return Math.abs(b.x - tile.x) < Math.max(1, bw) &&
                   Math.abs(b.y - tile.y) < Math.max(1, bh);
        });
    }

    // Get building info for UI panel
    getBuildingInfo(building) {
        const cost = this.getUpgradeCost(building);
        const maxHp = this.getMaxHp(building);

        let effect = 'ارتقا قدرت و بازده ساختمان را بهتر می‌کند.';
        if (building.id.startsWith('farm')) {
            effect = `تولید: +${building.lvl * 8} غذا/چرخه → سطح بعد: +${(building.lvl + 1) * 8}`;
        } else if (building.id.startsWith('mine')) {
            effect = `تولید: +${building.lvl * 6} طلا/چرخه → سطح بعد: +${(building.lvl + 1) * 6}`;
        } else if (building.id.startsWith('store')) {
            effect = `ظرفیت منابع: ${this.getCapacities().gold} طلا / ${this.getCapacities().food} غذا`;
        } else if (building.id.startsWith('barracks')) {
            effect = `ظرفیت ارتش: ${this.gameState.armyCap}`;
        } else if (building.id.startsWith('tower') || building.id.startsWith('wall')) {
            effect = `قدرت دفاع کل: ${this.getDefensePower()}`;
        } else if (building.id === 'keep') {
            effect = `ظرفیت جمعیت: ${this.gameState.popCap} | قدرت دفاع: +${building.lvl * 8}`;
        }

        return {
            name: building.name,
            level: building.lvl,
            maxHp,
            upgradeCost: cost,
            effect,
            canUpgrade: building.lvl < (building.maxLevel || 10),
            maxLevel: building.maxLevel || 10
        };
    }

    // Remove a building (for future use)
    removeBuilding(buildingId) {
        const index = this.buildings.findIndex(b => b.id === buildingId);
        if (index > -1) {
            const building = this.buildings[index];
            // Reverse bonuses
            if (building.id === 'keep') {
                this.gameState._state.popCap -= CONFIG.POP_PER_KEEP_LVL;
            }
            this.buildings.splice(index, 1);
            this.gameState.buildings = this.buildings;
            this.gameState.recalculateCapacities();
            return true;
        }
        return false;
    }

    // Get all buildings for saving
    getAllBuildings() {
        return this.buildings.map(b => ({
            id: b.id,
            name: b.name,
            x: b.x,
            y: b.y,
            lvl: b.lvl,
            w: b.w,
            h: b.h,
            emoji: b.emoji,
            baseCost: b.baseCost,
            baseHp: b.baseHp,
            type: b.type,
            hp: b.hp,
            maxLevel: b.maxLevel
        }));
    }
}