/**
 * Crownforge: Taj Khakestar - Renderer
 * Handles all canvas drawing operations
 */

import { CONFIG } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = 0;
        this.H = 0;
        this.dpr = 1;
        this.scale = 1;
        this.ox = 0;
        this.oy = 0;

        // Visual constants from config
        this.TILE = CONFIG.TILE_SIZE;

        // Cached gradients
        this._gradients = new Map();
    }

    // Resize handling
    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth;
        this.H = window.innerHeight;

        this.canvas.width = this.W * this.dpr;
        this.canvas.height = this.H * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        this.scale = Math.min(this.W / 700, this.H / 700);
        this.ox = this.W / 2;
        this.oy = this.H * 0.46;
    }

    // Coordinate conversion
    iso(x, y) {
        return [
            this.ox + (x - y) * this.TILE * this.scale,
            this.oy + (x + y) * this.TILE * 0.5 * this.scale
        ];
    }

    screenToTile(px, py) {
        const X = (px - this.ox) / (this.TILE * this.scale);
        const Y = (py - this.oy) / (this.TILE * 0.5 * this.scale);
        return {
            x: Math.round((X + Y) / 2),
            y: Math.round((Y - X) / 2)
        };
    }

    // Drawing primitives
    diamond(x, y, w, h, fill, stroke = '#0004') {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x, y - h / 2);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x, y + h / 2);
        ctx.lineTo(x - w / 2, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }

    // Main draw function
    draw(state, buildings) {
        this.ctx.clearRect(0, 0, this.W, this.H);

        // Background
        this.drawBackground();

        // Grid
        this.drawGrid();

        // Map features (river, road, trees)
        this.drawMapFeatures();

        // Buildings (sorted by depth)
        const sortedBuildings = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));
        sortedBuildings.forEach(b => this.drawBuilding(b, state));

        // Mode indicators
        if (state.mode === 'build' && !state.battle) {
            this.drawBuildModeHint();
        }

        // Battle overlay
        if (state.battle) {
            this.drawBattle(state);
        }
    }

    drawBackground() {
        const bg = this.ctx.createLinearGradient(0, 0, 0, this.H);
        bg.addColorStop(0, '#a8d88e');
        bg.addColorStop(0.4, '#6eb07a');
        bg.addColorStop(1, '#4f7449');
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(0, 0, this.W, this.H);
    }

    drawGrid() {
        const { GRASS_COLORS, GRASS_STROKE } = CONFIG;
        const s = this.scale;

        for (let y = -10; y <= 10; y++) {
            for (let x = -10; x <= 10; x++) {
                const [sx, sy] = this.iso(x, y);
                const even = ((x + y) & 1) === 0;
                this.diamond(
                    sx, sy,
                    this.TILE * s,
                    this.TILE * 0.5 * s,
                    even ? GRASS_COLORS[0] : GRASS_COLORS[1],
                    GRASS_STROKE
                );
            }
        }
    }

    drawMapFeatures() {
        const s = this.scale;
        const ctx = this.ctx;

        // River
        ctx.save();
        ctx.strokeStyle = CONFIG.RIVER_COLOR;
        ctx.lineWidth = 20 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(...this.iso(-8, -5));
        ctx.quadraticCurveTo(...this.iso(-3, 0), ...this.iso(1, 7));
        ctx.stroke();

        ctx.strokeStyle = CONFIG.RIVER_HIGHLIGHT;
        ctx.lineWidth = 5 * s;
        ctx.beginPath();
        ctx.moveTo(...this.iso(-8, -5));
        ctx.quadraticCurveTo(...this.iso(-3, 0), ...this.iso(1, 7));
        ctx.stroke();
        ctx.restore();

        // Road
        ctx.save();
        ctx.strokeStyle = CONFIG.ROAD_COLOR;
        ctx.lineWidth = 12 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(...this.iso(-7, 0));
        ctx.lineTo(...this.iso(7, 0));
        ctx.stroke();

        ctx.strokeStyle = CONFIG.ROAD_HIGHLIGHT;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(...this.iso(-7, 0));
        ctx.lineTo(...this.iso(7, 0));
        ctx.stroke();
        ctx.restore();

        // Trees
        ctx.font = `${22 * s}px serif`;
        ctx.textAlign = 'center';
        for (let i = -8; i <= 8; i += 2) {
            for (let j = -7; j <= 7; j += 3) {
                if (Math.abs(i - j) < 3) continue;
                const [x, y] = this.iso(i, j);
                ctx.shadowColor = '#0006';
                ctx.shadowBlur = 4 * s;
                ctx.fillText(CONFIG.TREE_EMOJIS[(i + j) % 2], x, y - 4 * s);
                ctx.shadowBlur = 0;
            }
        }
    }

    drawBuilding(building, state) {
        const [sx, sy] = this.iso(building.x, building.y);
        const s = this.scale;
        const bw = this.TILE * building.w * s;
        const bh = this.TILE * building.h * 0.5 * s;

        // Shadow/base
        this.ctx.save();
        this.ctx.shadowColor = CONFIG.BUILDING_SHADOW;
        this.ctx.shadowBlur = 10 * s;
        this.ctx.shadowOffsetY = 5 * s;
        this.diamond(sx, sy, bw + 12 * s, bh + 12 * s, '#556b4d', '#31442f');
        this.ctx.restore();

        // Building body
        const body = this.getGradient('body', sx - 20 * s, sy - 45 * s, sx + 20 * s, sy, [
            { stop: 0, color: building.id === 'keep' ? '#c9a46f' : '#c79a62' },
            { stop: 1, color: building.id === 'keep' ? '#72503a' : '#815a38' }
        ]);
        this.ctx.fillStyle = body;
        this.ctx.fillRect(sx - 19 * s, sy - 27 * s, 38 * s, 27 * s);

        // Roof
        this.ctx.fillStyle = building.id === 'keep' ? '#552d31' : '#6d3e2b';
        this.ctx.beginPath();
        this.ctx.moveTo(sx - 25 * s, sy - 27 * s);
        this.ctx.lineTo(sx, sy - 50 * s);
        this.ctx.lineTo(sx + 25 * s, sy - 27 * s);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#d6a66a';
        this.ctx.lineWidth = 1.5 * s;
        this.ctx.stroke();

        // Door
        this.ctx.fillStyle = '#32251d';
        this.ctx.fillRect(sx - 5 * s, sy - 17 * s, 10 * s, 17 * s);

        // Windows
        this.ctx.fillStyle = '#f4c96a';
        this.ctx.fillRect(sx - 14 * s, sy - 20 * s, 6 * s, 7 * s);
        this.ctx.fillRect(sx + 8 * s, sy - 20 * s, 6 * s, 7 * s);

        // Emoji badge
        this.ctx.fillStyle = '#182018cc';
        this.ctx.beginPath();
        this.ctx.arc(sx, sy - 34 * s, 13 * s, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.font = `${25 * s}px serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.emoji, sx, sy - 27 * s);

        // Name and level
        this.ctx.font = `bold ${11 * s}px Tahoma, Vazirmatn`;
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = '#000';
        this.ctx.shadowBlur = 3 * s;
        this.ctx.fillText(`${building.name} • سطح ${building.lvl}`, sx, sy + 16 * s);
        this.ctx.shadowBlur = 0;

        // HP bar
        const maxLvl = building.id === 'keep' ? 8 : 6;
        const hp = Math.max(0.08, Math.min(1, building.lvl / maxLvl));
        this.ctx.fillStyle = '#202820';
        this.ctx.fillRect(sx - 24 * s, sy + 22 * s, 48 * s, 4 * s);
        this.ctx.fillStyle = '#d8b45a';
        this.ctx.fillRect(sx - 24 * s, sy + 22 * s, 48 * s * hp, 4 * s);

        // Selection highlight
        if (state.selectedBuilding === building) {
            this.ctx.save();
            this.ctx.strokeStyle = CONFIG.SELECTION_GLOW;
            this.ctx.lineWidth = 3 * s;
            this.ctx.shadowColor = CONFIG.SELECTION_GLOW;
            this.ctx.shadowBlur = 10 * s;
            this.diamond(sx, sy, bw + 18 * s, bh + 18 * s, 'transparent', CONFIG.SELECTION_GLOW);
            this.ctx.restore();
        }

        // Level indicator on building
        if (building.lvl > 1) {
            this.ctx.fillStyle = '#ffd65a';
            this.ctx.font = `bold ${10 * s}px Tahoma`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`+${building.lvl - 1}`, sx + 20 * s, sy - 30 * s);
        }
    }

    drawBuildModeHint() {
        const s = this.scale;
        this.ctx.fillStyle = '#ffe58a';
        this.ctx.font = `bold ${14 * s}px Tahoma, Vazirmatn`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('حالت ساخت: روی زمین خالی بزن', this.W / 2, 86);
    }

    drawBattle(state) {
        const enemy = state.enemy;
        const ctx = this.ctx;
        const s = this.scale;

        // Battle header
        ctx.fillStyle = '#12181ddd';
        ctx.fillRect(0, 0, this.W, 64 * s);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${15 * s}px Tahoma, Vazirmatn`;
        ctx.textAlign = 'center';
        ctx.fillText(
            `⚔️ ${enemy.name} | دژ ${enemy.hp}/${enemy.maxHp} | نیرو ${state.army}/${state.armyCap}`,
            this.W / 2, 27 * s
        );
        ctx.font = `${12 * s}px Tahoma`;
        ctx.fillText(
            `غنیمت تقریبی: 🪙 ${enemy.gold}  🌾 ${enemy.food}`,
            this.W / 2, 49 * s
        );

        // Enemy defenses
        const cx = this.W / 2;
        const cy = this.H * 0.55;
        const panelW = 360 * s;
        const panelH = 110 * s;

        ctx.fillStyle = '#3b2b23';
        ctx.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

        const slotW = 50 * s;
        const slotH = 55 * s;
        const startX = cx - 160 * s;
        const slotY = cy - 30 * s;

        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i < enemy.defense ? '#79533a' : '#5c4334';
            ctx.fillRect(startX + i * 70 * s, slotY, slotW, slotH);

            const emojis = ['🧱', '🏹', '🗼', '🔥', '🛡️'];
            ctx.font = `${25 * s}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(emojis[i], startX + i * 70 * s + 25 * s, slotY + 35 * s);
        }

        // Attack prompt
        ctx.fillStyle = '#ffd65a';
        ctx.font = `bold ${18 * s}px Tahoma, Vazirmatn`;
        ctx.textAlign = 'center';
        ctx.fillText('روی دژ ضربه بزن', cx, cy + 92 * s);
    }

    // Gradient cache
    getGradient(key, x0, y0, x1, y1, stops) {
        const cacheKey = `${key}:${x0}:${y0}:${x1}:${y1}:${stops.map(s => `${s.stop}:${s.color}`).join(',')}`;
        if (this._gradients.has(cacheKey)) {
            return this._gradients.get(cacheKey);
        }
        const grad = this.ctx.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(s => grad.addColorStop(s.stop, s.color));
        this._gradients.set(cacheKey, grad);
        return grad;
    }

    // Utility
    clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }
}