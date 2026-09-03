/**
 * Crownforge: Taj Khakestar - Main Entry Point
 * Initializes all systems and starts the game loop
 */

import { gameState } from './state.js';
import { Renderer } from './renderer.js';
import { BuildingManager } from './buildings.js';
import { CombatManager } from './combat.js';
import { UIManager } from './ui.js';
import { CONFIG } from './config.js';

// Global instances (for debugging)
let renderer;
let buildingManager;
let combatManager;
let uiManager;

async function init() {
    console.log('🏰 Crownforge: Taj Khakestar - Initializing...');

    // Get canvas
    const canvas = document.getElementById('game');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Initialize renderer
    renderer = new Renderer(canvas);
    renderer.resize();
    window.addEventListener('resize', () => renderer.resize());

    // Initialize managers
    buildingManager = new BuildingManager(gameState);
    combatManager = new CombatManager(gameState, buildingManager);
    uiManager = new UIManager(renderer, buildingManager, combatManager);

    // Load saved game or initialize new
    const loaded = uiManager.loadGame();
    if (!loaded) {
        buildingManager.initializeBuildings();
        gameState.recalculateCapacities();
    }

    // Make globals available for debugging
    window.gameState = gameState;
    window.renderer = renderer;
    window.buildingManager = buildingManager;
    window.combatManager = combatManager;
    window.uiManager = uiManager;

    // Initial draw
    renderer.draw(gameState._state, gameState.buildings);

    // Start game loop
    startGameLoop();

    console.log('✅ Game initialized successfully!');
    console.log('💡 Commands: gameState.debug(), buildingManager.getAllBuildings()');
}

function startGameLoop() {
    let lastTick = Date.now();

    // Resource production loop
    setInterval(() => {
        if (gameState.mode === 'battle') return;

        const now = Date.now();
        const elapsed = Math.min(CONFIG.MAX_ELAPSED_TICK, (now - lastTick) / CONFIG.TICK_INTERVAL);
        lastTick = now;

        const production = buildingManager.getProduction();
        const caps = buildingManager.getCapacities();

        gameState.addFood(production.food * elapsed);
        gameState.addGold(production.gold * elapsed);

        // Clamp to capacities
        const state = gameState._state;
        state.food = Math.min(state.food, caps.food);
        state.gold = Math.min(state.gold, caps.gold);

        gameState.emit('resourceChanged', {
            food: state.food,
            gold: state.gold
        });

        renderer.draw(gameState._state, gameState.buildings);
    }, CONFIG.TICK_INTERVAL);

    // Day progression loop
    setInterval(() => {
        if (gameState.mode === 'battle') return;

        gameState.nextDay();
        uiManager.saveGame();
        renderer.draw(gameState._state, gameState.buildings);
    }, CONFIG.DAY_INTERVAL);

    // Auto-save every 30 seconds
    setInterval(() => {
        if (gameState.mode !== 'battle') {
            uiManager.saveGame();
        }
    }, 30000);
}

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Game paused (tab hidden)');
    } else {
        console.log('Game resumed');
        // Force a tick update
        renderer.draw(gameState._state, gameState.buildings);
    }
});

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module usage
export { renderer, buildingManager, combatManager, uiManager };