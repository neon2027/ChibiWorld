import * as THREE from 'three';
import { threeToWorld } from './plazaWorld.js';

// Handles WASD + click-to-move and emits position to the server
export class InputController {
    constructor(canvas, camera, onMove) {
        this.canvas = canvas;
        this.camera = camera;
        this.onMove = onMove; // callback(worldX, worldZ)

        this._keys = {};
        this._target = null; // { x, z } in Three.js space
        this._pos = { x: 0, z: 0 }; // current Three.js position
        this._lastEmit = 0;
        this.camAzimuth = 0; // updated each frame from the view
        this._raycaster = new THREE.Raycaster();
        this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this._onKey = (e) => { this._keys[e.code] = e.type === 'keydown'; };
        this._onClick = (e) => this._handleClick(e);

        window.addEventListener('keydown', this._onKey);
        window.addEventListener('keyup', this._onKey);
        canvas.addEventListener('click', this._onClick);
    }

    setPosition(worldX, worldZ) {
        this._pos.x = worldX - 50;
        this._pos.z = worldZ - 50;
        this._target = null;
    }

    getWorldPosition() {
        return threeToWorld(this._pos.x, this._pos.z);
    }

    _handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
        const target = new THREE.Vector3();
        if (this._raycaster.ray.intersectPlane(this._groundPlane, target)) {
            // Clamp to plaza
            target.x = Math.max(-50, Math.min(50, target.x));
            target.z = Math.max(-50, Math.min(50, target.z));
            this._target = { x: target.x, z: target.z };
        }
    }

    get isRunning() {
        return !!(this._keys['ShiftLeft'] || this._keys['ShiftRight']);
    }

    update(dt, playerGroup) {
        const SPEED = this.isRunning ? 22 : 12; // Three.js units/sec (run = 22, walk = 12)
        let moved = false;

        // WASD movement (camera-relative)
        let rawDx = 0, rawDz = 0;
        if (this._keys['KeyW'] || this._keys['ArrowUp'])    rawDz -= 1;
        if (this._keys['KeyS'] || this._keys['ArrowDown'])  rawDz += 1;
        if (this._keys['KeyA'] || this._keys['ArrowLeft'])  rawDx -= 1;
        if (this._keys['KeyD'] || this._keys['ArrowRight']) rawDx += 1;

        if (rawDx !== 0 || rawDz !== 0) {
            this._target = null; // cancel click target
            const len = Math.sqrt(rawDx * rawDx + rawDz * rawDz);
            const nx = rawDx / len, nz = rawDz / len;

            // Rotate input by camera azimuth so W always moves toward camera facing direction
            const sinA = Math.sin(this.camAzimuth);
            const cosA = Math.cos(this.camAzimuth);
            const dx = nz * sinA + nx * cosA;
            const dz = nz * cosA - nx * sinA;

            this._pos.x = Math.max(-50, Math.min(50, this._pos.x + dx * SPEED * dt));
            this._pos.z = Math.max(-50, Math.min(50, this._pos.z + dz * SPEED * dt));
            moved = true;

            // Face direction
            if (playerGroup) {
                const angle = Math.atan2(dx, dz);
                playerGroup.rotation.y = lerpAngle(playerGroup.rotation.y, angle, 0.2);
            }
        }

        // Click-to-move (always walk speed for click navigation)
        if (this._target) {
            const tdx = this._target.x - this._pos.x;
            const tdz = this._target.z - this._pos.z;
            const dist = Math.sqrt(tdx * tdx + tdz * tdz);
            if (dist < 0.3) {
                this._target = null;
            } else {
                const step = Math.min(12 * dt, dist);
                this._pos.x += (tdx / dist) * step;
                this._pos.z += (tdz / dist) * step;
                moved = true;
                if (playerGroup) {
                    const angle = Math.atan2(tdx, tdz);
                    playerGroup.rotation.y = lerpAngle(playerGroup.rotation.y, angle, 0.15);
                }
            }
        }

        if (playerGroup) playerGroup.position.set(this._pos.x, 0, this._pos.z);

        // Emit to server at ~15Hz
        const now = Date.now();
        if (moved && now - this._lastEmit > 66) {
            this._lastEmit = now;
            const world = this.getWorldPosition();
            this.onMove(world.x, world.z);
        }

        return moved;
    }

    destroy() {
        window.removeEventListener('keydown', this._onKey);
        window.removeEventListener('keyup', this._onKey);
        this.canvas.removeEventListener('click', this._onClick);
    }
}

function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}
