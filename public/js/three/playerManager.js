import * as THREE from 'three';
import { buildChibi, animateChibi } from './chibiBuilder.js';
import { worldToThree } from './plazaWorld.js';

// Manages all remote player chibi instances in the scene
export class PlayerManager {
    constructor(scene) {
        this.scene = scene;
        this._players = new Map(); // userId -> { group, targetX, targetZ, currentX, currentZ, username, moving }
        this._labels = new Map();  // userId -> DOM element
        this._camera = null;
        this._canvas = null;
    }

    setCamera(camera, canvas) {
        this._camera = camera;
        this._canvas = canvas;
    }

    addPlayer({ id, username, x, z, avatar }) {
        if (this._players.has(id)) return;
        const pos = worldToThree(x, z);
        const group = buildChibi(avatar || {});
        group.position.set(pos.x, 0, pos.z);
        this.scene.add(group);
        
        this._players.set(id, {
            group,
            targetX: pos.x, targetZ: pos.z,
            currentX: pos.x, currentZ: pos.z,
            username, moving: false
        });
    }

    removePlayer(userId) {
        const p = this._players.get(userId);
        if (p) {
            this.scene.remove(p.group);
            disposeGroup(p.group);
            this._players.delete(userId);
        }
        const label = this._labels.get(userId);
        if (label) { label.remove(); this._labels.delete(userId); }
    }

    movePlayer(userId, wx, wz) {
        const p = this._players.get(userId);
        if (!p) return;
        const pos = worldToThree(wx, wz);
        p.targetX = pos.x;
        p.targetZ = pos.z;
    }

    updateAvatar(userId, avatar) {
        const p = this._players.get(userId);
        if (!p) return;
        const { currentX, currentZ, username } = p;
        this.scene.remove(p.group);
        disposeGroup(p.group);
        p.group = buildChibi(avatar);
        p.group.position.set(currentX, 0, currentZ);
        this.scene.add(p.group);
    }

    update(dt) {
        const LERP = 0.12;
        const MOVE_THRESHOLD = 0.05;

        for (const [id, p] of this._players) {
            const dx = p.targetX - p.currentX;
            const dz = p.targetZ - p.currentZ;
            p.moving = Math.abs(dx) + Math.abs(dz) > MOVE_THRESHOLD;

            if (p.moving) {
                p.currentX += dx * LERP;
                p.currentZ += dz * LERP;
                // Face direction of movement
                if (Math.abs(dx) + Math.abs(dz) > 0.01) {
                    const targetAngle = Math.atan2(dx, dz);
                    p.group.rotation.y = lerpAngle(p.group.rotation.y, targetAngle, 0.15);
                }
            }

            p.group.position.set(p.currentX, 0, p.currentZ);
            animateChibi(p.group, p.moving, dt);
        }

        // Update nametag positions if camera available
        if (this._camera && this._canvas) this._updateLabels();
    }

    _updateLabels() {
        for (const [id, p] of this._players) {
            let label = this._labels.get(id);
            if (!label) {
                label = document.createElement('div');
                label.className = 'player-label';
                label.textContent = p.username;
                this._canvas.parentElement?.appendChild(label);
                this._labels.set(id, label);
            }

            // Project 3D position to screen
            const pos3D = new THREE.Vector3(p.currentX, 8.5, p.currentZ);
            pos3D.project(this._camera);

            const w = this._canvas.clientWidth;
            const h = this._canvas.clientHeight;
            const sx = (pos3D.x * 0.5 + 0.5) * w;
            const sy = (-pos3D.y * 0.5 + 0.5) * h;

            if (pos3D.z < 1) {
                label.style.display = 'block';
                label.style.left = `${sx}px`;
                label.style.top = `${sy}px`;
            } else {
                label.style.display = 'none';
            }
        }
    }

    clearLabels() {
        for (const label of this._labels.values()) label.remove();
        this._labels.clear();
    }

    destroy() {
        for (const [id] of this._players) this.removePlayer(id);
        this.clearLabels();
    }
}

function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}

function disposeGroup(group) {
    group.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
}
