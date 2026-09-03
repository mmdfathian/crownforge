/**
 * Crownforge: Taj Khakestar - UI Manager
 * Handles all DOM interactions, panels, messages, and user input
 */

import { gameState } from './state.js';
import { CONFIG, QUESTS } from './config.js';

export class UIManager {
    constructor(renderer, buildingManager, combatManager) {
        this.renderer = renderer;
        this.buildingManager = buildingManager;
        this.combatManager = combatManager;

        // DOM elements
        this.elements = {};
        this.cacheElements();

        // State
        this.messageTimeout = null;
        this.lastMessageTime = 0;

        // Bind events
        this.bindEvents();
        this.setupGameStateListeners();

        // Initial update
        this.updateAll();
    }

    cacheElements() {
        // Resources
        this.elements.gold = document.getElementById('gold');
        this.elements.food = document.getElementById('food');
        this.elements.gems = document.getElementById('gems');
        this.elements.day = document.getElementById('day');
        this.elements.honor = document.getElementById('honor');
        this.elements.pop = document.getElementById('pop');
        this.elements.power = document.getElementById('power');

        // Panels
        this.elements.panel = document.getElementById('panel');
        this.elements.ptitle = document.getElementById('ptitle');
        this.elements.pbody = document.getElementById('pbody');
        this.elements.upgradeBtn = document.getElementById('upgrade');
        this.elements.closeBtn = document.getElementById('close');

        // Buttons
        this.elements.buildBtn = document.getElementById('build');
        this.elements.armyBtn = document.getElementById('army');
        this.elements.raidBtn = document.getElementById('raid');
        this.elements.questsBtn = document.getElementById('quests');
        this.elements.saveBtn = document.getElementById('save');

        // Messages
        this.elements.msg = document.getElementById('msg');

        // Side panel
        this.elements.side = document.getElementById('side');
    }

    bindEvents() {
        // Building panel
        this.elements.upgradeBtn.addEventListener('click', () => this.handleUpgrade());
        this.elements.closeBtn.addEventListener('click', () => this.hidePanel());

        // Main buttons
        this.elements.buildBtn.addEventListener('click', () => this.toggleBuildMode());
        this.elements.armyBtn.addEventListener('click', () => this.handleTrain());
        this.elements.raidBtn.addEventListener('click', () => this.handleRaid());
        this.elements.questsBtn.addEventListener('click', () => this.showQuests());
        this.elements.saveBtn.addEventListener('click', () => this.handleSave());

        // Canvas click
        this.renderer.canvas.addEventListener('pointerdown', (e) => this.handleCanvasClick(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Prevent context menu on canvas
        this.renderer.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setupGameStateListeners() {
        // Resource changes
        gameState.on('resourceChanged', (data) => this.updateResources(data));

        // Capacity changes
        gameState.on('capacityChanged', (data) => this.updateCapacities(data));

        // Mode changes
        gameState.on('modeChanged', (mode) => this.updateModeButtons(mode));

        // Selection changes
        gameState.on('selectionChanged', (building) => this.onSelectionChanged(building));

        // Battle events
        gameState.on('battleStarted', (enemy) => this.onBattleStarted(enemy));
        gameState.on('battleEnded', (data) => this.onBattleEnded(data));
        gameState.on('battleUpdate', (data) => this.onBattleUpdate(data));
        gameState.on('battleLog', (message) => this.showMessage(message));
        gameState.on('battleVictory', (data) => this.onBattleVictory(data));
        gameState.on('battleDefeat', (data) => this.onBattleDefeat(data));

        // Building changes
        gameState.on('buildingsChanged', () => this.renderer.draw(gameState._state, gameState.buildings));

        // Day changes
        gameState.on('dayChanged', (day) => this.updateDay(day));

        // Quest progress
        gameState.on('questProgress', (data) => this.updateQuestUI(data));
    }

    // Resource updates
    updateResources(data) {
        if (data.gold !== undefined) this.animateValue(this.elements.gold, data.gold);
        if (data.food !== undefined) this.animateValue(this.elements.food, data.food);
        if (data.gems !== undefined) this.animateValue(this.elements.gems, data.gems);
        if (data.army !== undefined) this.animateValue(this.elements.pop, gameState.pop);
        if (data.honor !== undefined) this.animateValue(this.elements.honor, data.honor);
    }

    updateCapacities(data) {
        if (data.popCap !== undefined) {
            this.elements.pop.textContent = `${gameState.pop}/${data.popCap}`;
        }
        if (data.armyCap !== undefined) {
            // Army capacity shown in battle
        }
    }

    updateAll() {
        this.updateResources({
            gold: gameState.gold,
            food: gameState.food,
            gems: gameState.gems,
            honor: gameState.honor
        });
        this.elements.day.textContent = gameState.day;
        this.elements.pop.textContent = `${gameState.pop}/${gameState.popCap}`;
        this.elements.power.textContent = this.buildingManager.getDefensePower();
        this.updateModeButtons(gameState.mode);
    }

    animateValue(element, newValue) {
        if (!element) return;
        const oldValue = parseInt(element.textContent) || 0;
        if (oldValue === newValue) return;

        element.textContent = newValue;
        element.style.transform = 'scale(1.2)';
        element.style.color = newValue > oldValue ? '#9ee37d' : '#ff6b6b';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 200);
    }

    updateDay(day) {
        this.elements.day.textContent = day;
    }

    // Mode buttons
    updateModeButtons(mode) {
        this.elements.buildBtn.classList.toggle('active', mode === 'build');
        this.elements.buildBtn.textContent = mode === 'build' ? '✅ ساخت' : '🏗️ ساخت';

        const inBattle = mode === 'battle';
        this.elements.armyBtn.disabled = inBattle;
        this.elements.raidBtn.disabled = inBattle;
        this.elements.buildBtn.disabled = inBattle;
        this.elements.questsBtn.disabled = inBattle;
    }

    // Build mode toggle
    toggleBuildMode() {
        if (gameState.mode === 'battle') return;

        const newMode = gameState.mode === 'build' ? 'normal' : 'build';
        gameState.setMode(newMode);
        this.showMessage(newMode === 'build' ? 'حالت ساخت فعال شد. روی زمین خالی بزنید.' : 'حالت ساخت خاموش شد.');
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    // Train soldier
    handleTrain() {
        if (gameState.mode === 'battle') return;

        const result = this.buildingManager.trainSoldier();
        if (result.success) {
            this.showMessage('یک سرباز آموزش دید ⚔️');
            this.renderer.draw(gameState._state, gameState.buildings);
        } else {
            this.showMessage(result.error);
        }
    }

    // Start raid
    handleRaid() {
        if (gameState.mode === 'battle') return;

        const result = this.combatManager.startRaid();
        if (result.success) {
            this.showMessage(`یورش به ${result.enemy.name} آغاز شد!`);
        } else {
            this.showMessage(result.error);
        }
    }

    // Show quests
    showQuests() {
        const q = gameState.quests;
        let msg = '📜 مأموریت‌ها:\n';
        QUESTS.forEach(quest => {
            const current = q[quest.id] || 0;
            const status = current >= quest.target ? '✅' : '⏳';
            msg += `${status} ${quest.name}: ${current}/${quest.target}\n`;
        });
        this.showMessage(msg, 5000);
    }

    // Handle save
    handleSave() {
        this.saveGame();
        this.showMessage('بازی ذخیره شد 💾');
    }

    // Upgrade building
    handleUpgrade() {
        const building = gameState.selectedBuilding;
        if (!building) return;

        const result = this.buildingManager.upgrade(building);
        if (result.success) {
            this.showMessage(`${building.name} به سطح ${building.lvl} رسید!`);
            this.showPanel(building); // Refresh panel
            this.renderer.draw(gameState._state, gameState.buildings);
        } else {
            this.showMessage(result.error);
        }
    }

    // Canvas click handler
    handleCanvasClick(e) {
        if (gameState.mode === 'battle') {
            this.handleBattleClick();
            return;
        }

        if (gameState.mode === 'build') {
            this.handleBuildClick(e);
            return;
        }

        // Normal mode - select building
        const building = this.buildingManager.findBuildingAt(this.renderer, e.clientX, e.clientY);
        if (building) {
            this.showPanel(building);
        } else {
            this.hidePanel();
        }
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    // Build mode click
    handleBuildClick(e) {
        const tile = this.renderer.screenToTile(e.clientX, e.clientY);

        if (!this.buildingManager.canPlace(tile.x, tile.y)) {
            this.showMessage('این زمین برای ساخت مناسب نیست.');
            return;
        }

        // For now, build a house (could be expanded to show build menu)
        const result = this.buildingManager.build('house', tile.x, tile.y);
        if (result.success) {
            this.showMessage(`خانه دهقانان ساخته شد؛ ظرفیت جمعیت +${CONFIG.POP_PER_HOUSE}.`);
            gameState.setMode('normal');
            this.updateModeButtons('normal');
        } else {
            this.showMessage(result.error);
        }

        this.renderer.draw(gameState._state, gameState.buildings);
    }

    // Battle click
    handleBattleClick() {
        const result = this.combatManager.attack();
        if (result.success) {
            if (result.victory) {
                // Victory handled by event
            } else {
                this.showMessage(`ضربه ${result.damage} آسیب زد؛ ${gameState.army} سرباز باقی مانده.`);
            }
            this.renderer.draw(gameState._state, gameState.buildings);
        }
    }

    // Panel management
    showPanel(building) {
        gameState.setSelectedBuilding(building);
        const info = this.buildingManager.getBuildingInfo(building);

        this.elements.ptitle.textContent = info.name;
        this.elements.pbody.innerHTML = `
            <div class="row"><span>سطح</span><b>${info.level}/${info.maxLevel}</b></div>
            <div class="row"><span>جان</span><b>${info.maxHp}</b></div>
            <div class="row"><span>هزینه ارتقا</span><b class="gold">🪙 ${info.upgradeCost}</b></div>
            <div class="small">${info.effect}</div>
        `;

        this.elements.upgradeBtn.disabled = !info.canUpgrade;
        if (!info.canUpgrade) {
            this.elements.upgradeBtn.textContent = 'حداکثر سطح';
        } else {
            this.elements.upgradeBtn.textContent = 'ارتقا';
        }

        this.elements.panel.style.display = 'block';
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    hidePanel() {
        this.elements.panel.style.display = 'none';
        gameState.setSelectedBuilding(null);
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    onSelectionChanged(building) {
        if (building) {
            this.showPanel(building);
        } else {
            this.hidePanel();
        }
    }

    // Battle events
    onBattleStarted(enemy) {
        this.hidePanel();
        this.showMessage(`⚔️ یورش به ${enemy.name} آغاز شد!`);
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    onBattleEnded(data) {
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    onBattleUpdate(data) {
        this.renderer.draw(gameState._state, gameState.buildings);
    }

    onBattleVictory(data) {
        this.showMessage(`🏆 پیروزی! +${data.gold} طلا، +${data.food} غذا، +${data.honor} افتخار`, 4000);
    }

    onBattleDefeat(data) {
        this.showMessage(`💥 شکست: ${data.reason}`, 4000);
    }

    // Messages
    showMessage(text, duration = 2500) {
        const now = Date.now();
        // Prevent spam
        if (now - this.lastMessageTime < 300) return;
        this.lastMessageTime = now;

        this.elements.msg.textContent = text;
        this.elements.msg.classList.add('show');

        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.elements.msg.classList.remove('show');
        }, duration);
    }

    // Keyboard shortcuts
    handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'Escape':
                this.hidePanel();
                if (gameState.mode === 'build') {
                    gameState.setMode('normal');
                    this.updateModeButtons('normal');
                }
                break;
            case 'b':
            case 'B':
                if (gameState.mode !== 'battle') this.toggleBuildMode();
                break;
            case 'a':
            case 'A':
                if (gameState.mode !== 'battle') this.handleTrain();
                break;
            case 'r':
            case 'R':
                if (gameState.mode !== 'battle') this.handleRaid();
                break;
            case 's':
            case 'S':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleSave();
                }
                break;
            case ' ':
                if (gameState.mode === 'battle') {
                    e.preventDefault();
                    this.handleBattleClick();
                }
                break;
        }
    }

    // Quest UI updates
    updateQuestUI(data) {
        // Could update quest panel if visible
    }

    // Save/Load
    saveGame() {
        try {
            const data = gameState.toJSON();
            localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            this.showMessage('خطا در ذخیره بازی');
            return false;
        }
    }

    loadGame() {
        try {
            const raw = localStorage.getItem(CONFIG.SAVE_KEY);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (data.version < 4) {
                // Migration from old version
                this.migrateSave(data);
            }

            const loadedState = GameState.fromJSON(data);
            Object.assign(gameState._state, loadedState._state);
            gameState.buildings = loadedState.buildings;
            gameState.recalculateCapacities();

            this.updateAll();
            this.renderer.draw(gameState._state, gameState.buildings);
            this.showMessage('بازی بارگذاری شد');
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.showMessage('خطا در بارگذاری بازی');
            return false;
        }
    }

    migrateSave(oldData) {
        // Handle version migrations
        console.log('Migrating save from version', oldData.version);
    }
}

// Need to import GameState for static method
import { GameState } from './state.js';