/**
 * Crownforge: Taj Khakestar - Combat System
 * Handles raid generation, battle mechanics, and combat resolution
 */

import { CONFIG, ENEMY_NAMES } from './config.js';

export class CombatManager {
    constructor(gameState, buildingManager) {
        this.gameState = gameState;
        this.buildingManager = buildingManager;
    }

    // Check if player can start a raid
    canStartRaid() {
        if (this.gameState.army < CONFIG.MIN_RAID_ARMY) {
            return { can: false, reason: `حداقل ${CONFIG.MIN_RAID_ARMY} سرباز برای یورش لازم است` };
        }
        if (this.gameState.battle) {
            return { can: false, reason: 'در حال حاضر در یک یورش هستید' };
        }
        return { can: true };
    }

    // Generate a new enemy for raid
    generateEnemy() {
        const day = this.gameState.day;
        const honor = this.gameState.honor;

        // Difficulty scaling
        const difficulty = 1 + Math.floor(honor / CONFIG.DIFFICULTY_PER_HONOR);

        // Enemy stats
        const maxHp = CONFIG.ENEMY_BASE_HP +
            day * CONFIG.ENEMY_HP_PER_DAY +
            difficulty * CONFIG.ENEMY_HP_PER_DIFF;

        const defense = Math.min(
            CONFIG.MAX_DEFENSE,
            Math.max(
                CONFIG.MIN_DEFENSE,
                2 + Math.floor(day / CONFIG.DEFENSE_PER_DAY) +
                Math.floor(honor / CONFIG.DEFENSE_PER_HONOR)
            )
        );

        const gold = Math.floor(
            CONFIG.ENEMY_BASE_GOLD +
            day * CONFIG.ENEMY_GOLD_PER_DAY +
            Math.random() * CONFIG.ENEMY_GOLD_VARIANCE
        );

        const food = Math.floor(
            CONFIG.ENEMY_BASE_FOOD +
            day * CONFIG.ENEMY_FOOD_PER_DAY +
            Math.random() * CONFIG.ENEMY_FOOD_VARIANCE
        );

        const name = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];

        return {
            name,
            maxHp,
            hp: maxHp,
            defense,
            gold,
            food,
            difficulty,
            type: this.getEnemyType(defense)
        };
    }

    getEnemyType(defense) {
        if (defense <= 2) return 'weak';
        if (defense <= 3) return 'normal';
        if (defense <= 4) return 'strong';
        return 'elite';
    }

    // Start a new raid
    startRaid() {
        const check = this.canStartRaid();
        if (!check.can) {
            return { success: false, error: check.reason };
        }

        const enemy = this.generateEnemy();
        this.gameState.startBattle(enemy);

        return { success: true, enemy };
    }

    // Process a battle attack
    attack() {
        const enemy = this.gameState.enemy;
        const state = this.gameState._state;

        if (!enemy || state.army < 1) {
            this.finishBattle(false, 'تمام نیروهایتان از بین رفتند');
            return { success: false, error: 'هیچ نفری برای حمله باقی نمانده' };
        }

        // Calculate damage
        const soldierPower = state.army * CONFIG.BASE_SOLDIER_POWER;
        const baseDamage = CONFIG.BASE_ATTACK_DAMAGE + Math.floor(Math.random() * CONFIG.ATTACK_DAMAGE_VARIANCE);
        const defenseReduction = Math.floor(enemy.defense * CONFIG.ENEMY_DEFENSE_DAMAGE_REDUCTION);
        const damage = Math.max(1, baseDamage + soldierPower - defenseReduction);

        // Apply damage
        enemy.hp = Math.max(0, enemy.hp - damage);

        // Lose one soldier (represents casualties)
        state.army--;

        // Record in battle log
        this.gameState.recordBattleLog(`ضربه ${damage} آسیب زد (نیرو: ${state.army + 1} → ${state.army})`);

        // Check victory
        if (enemy.hp <= 0) {
            this.finishBattle(true);
            return { success: true, victory: true, damage, enemy };
        }

        // Update UI
        this.gameState.emit('resourceChanged', { army: state.army });
        this.gameState.emit('battleUpdate', { enemy });

        return { success: true, victory: false, damage, enemy };
    }

    // Finish battle (victory or defeat)
    finishBattle(won, reason = '') {
        const enemy = this.gameState.enemy;
        const state = this.gameState._state;

        if (won) {
            // Calculate loot bonus based on remaining army
            const bonus = 1 + Math.min(CONFIG.WIN_BONUS_MAX, state.army / 20);
            const goldGain = Math.floor(enemy.gold * bonus);
            const foodGain = Math.floor(enemy.food * bonus);

            state.gold += goldGain;
            state.food += foodGain;
            state.honor += CONFIG.WIN_HONOR;
            this.gameState.incrementQuest('raidWin');

            this.gameState.recordBattleLog(`پیروزی! +${goldGain} طلا، +${foodGain} غذا، +${CONFIG.WIN_HONOR} افتخار`);

            this.gameState.emit('battleVictory', { gold: goldGain, food: foodGain, honor: CONFIG.WIN_HONOR });
        } else {
            this.gameState.recordBattleLog(`شکست: ${reason || 'یورش شکست خورد'}`);
            this.gameState.emit('battleDefeat', { reason });
        }

        // Apply resource caps
        const caps = this.buildingManager.getCapacities();
        state.gold = Math.min(state.gold, caps.gold);
        state.food = Math.min(state.food, caps.food);

        this.gameState.endBattle(won, reason);
        this.gameState.recalculateCapacities();
        this.gameState.emit('resourceChanged', {
            gold: state.gold,
            food: state.food,
            honor: state.honor,
            army: state.army
        });
    }

    // Auto-resolve battle (for testing or skip)
    autoResolve() {
        const enemy = this.gameState.enemy;
        const state = this.gameState._state;

        if (!enemy) return { success: false };

        let currentArmy = state.army;
        let currentEnemyHp = enemy.hp;
        let rounds = 0;
        const maxRounds = 100;

        while (currentEnemyHp > 0 && currentArmy > 0 && rounds < maxRounds) {
            const soldierPower = currentArmy * CONFIG.BASE_SOLDIER_POWER;
            const baseDamage = CONFIG.BASE_ATTACK_DAMAGE + Math.floor(Math.random() * CONFIG.ATTACK_DAMAGE_VARIANCE);
            const defenseReduction = Math.floor(enemy.defense * CONFIG.ENEMY_DEFENSE_DAMAGE_REDUCTION);
            const damage = Math.max(1, baseDamage + soldierPower - defenseReduction);

            currentEnemyHp = Math.max(0, currentEnemyHp - damage);
            currentArmy--;
            rounds++;
        }

        const won = currentEnemyHp <= 0;
        state.army = currentArmy;

        this.finishBattle(won, won ? '' : 'نیروها در یورش خودکار از بین رفتند');

        return { success: true, won, rounds, remainingArmy: currentArmy };
    }

    // Get battle preview (for UI)
    getBattlePreview() {
        const enemy = this.gameState.enemy;
        if (!enemy) return null;

        const state = this.gameState._state;
        const estimatedRounds = Math.ceil(enemy.hp / (state.army * 3 + 50)); // rough estimate

        return {
            enemyName: enemy.name,
            enemyHp: enemy.hp,
            enemyMaxHp: enemy.maxHp,
            enemyDefense: enemy.defense,
            estimatedGold: enemy.gold,
            estimatedFood: enemy.food,
            yourArmy: state.army,
            yourArmyCap: state.armyCap,
            estimatedRounds: Math.min(estimatedRounds, state.army),
            canWin: state.army >= CONFIG.MIN_RAID_ARMY
        };
    }

    // Get enemy defense display data
    getEnemyDefenses() {
        const enemy = this.gameState.enemy;
        if (!enemy) return [];

        const defenses = [
            { id: 'wall', emoji: '🧱', name: 'دیوار' },
            { id: 'archer', emoji: '🏹', name: 'تیرانداز' },
            { id: 'tower', emoji: '🗼', name: 'برج' },
            { id: 'fire', emoji: '🔥', name: 'آتش' },
            { id: 'shield', emoji: '🛡️', name: 'مهر' }
        ];

        return defenses.map((d, i) => ({
            ...d,
            active: i < enemy.defense
        }));
    }
}