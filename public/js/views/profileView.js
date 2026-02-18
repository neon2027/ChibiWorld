import * as THREE from 'three';
import { SceneManager } from '../three/sceneManager.js';
import { buildChibi, HAIR_NAMES, ACCESSORY_NAMES } from '../three/chibiBuilder.js';
import { api } from '../api.js';
import { showToast } from '../ui/toast.js';
import { getSocket } from '../socket.js';

let _scene = null;
let _chibi = null;

export function renderProfile(container) {
    const user = window._currentUser;
    const av = user?.avatar || {};
    const opts = {
        skinTone:    av.skin_tone    || '#f5c890',
        hairColor:   av.hair_color   || '#4a3728',
        hairStyle:   av.hair_style   ?? 0,
        outfitColor: av.outfit_color || '#ff7eb3',
        eyeColor:    av.eye_color    || '#3a2a1a',
        accessory:   av.accessory    ?? 0
    };

    container.innerHTML = `
        <div class="profile-layout">
            <div class="profile-preview">
                <canvas id="profileCanvas"></canvas>
            </div>
            <div class="profile-panel scrollbar">
                <h2>Avatar Customizer</h2>

                <div class="avatar-section">
                    <h3>Colors</h3>
                    <div class="color-row"><span class="color-label">Skin</span><input type="color" class="color-input" id="skinTone" value="${opts.skinTone}"></div>
                    <div class="color-row"><span class="color-label">Hair</span><input type="color" class="color-input" id="hairColor" value="${opts.hairColor}"></div>
                    <div class="color-row"><span class="color-label">Outfit</span><input type="color" class="color-input" id="outfitColor" value="${opts.outfitColor}"></div>
                    <div class="color-row"><span class="color-label">Eyes</span><input type="color" class="color-input" id="eyeColor" value="${opts.eyeColor}"></div>
                </div>

                <div class="avatar-section">
                    <h3>Hair Style</h3>
                    <div class="style-grid" id="hairGrid">
                        ${HAIR_NAMES.map((n, i) => `<button class="style-btn ${i === opts.hairStyle ? 'active' : ''}" data-hair="${i}">${n}</button>`).join('')}
                    </div>
                </div>

                <div class="avatar-section">
                    <h3>Accessory</h3>
                    <div class="style-grid" id="accessoryGrid">
                        ${ACCESSORY_NAMES.map((n, i) => `<button class="style-btn ${i === opts.accessory ? 'active' : ''}" data-acc="${i}">${n}</button>`).join('')}
                    </div>
                </div>

                <button class="btn btn-primary" id="saveAvatar" style="width:100%;margin-top:16px">Save Avatar</button>
                <div id="saveStatus" style="text-align:center;margin-top:8px;font-size:12px;color:#7ddf64"></div>
            </div>
        </div>
    `;

    // Init 3D scene
    const canvas = container.querySelector('#profileCanvas');
    _scene = new SceneManager(canvas);
    _scene.camera.position.set(0, 5, 14);
    _scene.camera.lookAt(0, 4, 0);
    _scene.addLights();

    // Light background
    _scene.scene.background = new THREE.Color(0x1e1e3e);

    // Ground plane
    const ground = new THREE.Mesh(
        new THREE.CircleGeometry(8, 32),
        new THREE.MeshPhongMaterial({ color: 0x16213e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    _scene.scene.add(ground);

    // Build initial chibi
    _chibi = buildChibi(opts);
    _scene.scene.add(_chibi);

    // Slow rotate
    let rotY = 0;
    _scene.onUpdate((dt) => {
        rotY += dt * 0.6;
        if (_chibi) _chibi.rotation.y = rotY;
    });

    _scene.start();

    function rebuildChibi() {
        if (_chibi) { _scene.scene.remove(_chibi); disposeGroup(_chibi); }
        _chibi = buildChibi(opts);
        _scene.scene.add(_chibi);
    }

    // Color inputs
    ['skinTone', 'hairColor', 'outfitColor', 'eyeColor'].forEach(id => {
        container.querySelector(`#${id}`).addEventListener('input', (e) => {
            const key = id === 'skinTone' ? 'skinTone' : id === 'hairColor' ? 'hairColor' : id === 'outfitColor' ? 'outfitColor' : 'eyeColor';
            opts[key] = e.target.value;
            rebuildChibi();
        });
    });

    // Hair buttons
    container.querySelector('#hairGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-hair]');
        if (!btn) return;
        opts.hairStyle = parseInt(btn.dataset.hair);
        container.querySelectorAll('[data-hair]').forEach(b => b.classList.toggle('active', b === btn));
        rebuildChibi();
    });

    // Accessory buttons
    container.querySelector('#accessoryGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-acc]');
        if (!btn) return;
        opts.accessory = parseInt(btn.dataset.acc);
        container.querySelectorAll('[data-acc]').forEach(b => b.classList.toggle('active', b === btn));
        rebuildChibi();
    });

    // Save
    container.querySelector('#saveAvatar').addEventListener('click', async () => {
        try {
            const saved = await api.updateAvatar({
                skinTone: opts.skinTone,
                hairColor: opts.hairColor,
                hairStyle: opts.hairStyle,
                outfitColor: opts.outfitColor,
                eyeColor: opts.eyeColor,
                accessory: opts.accessory
            });
            if (window._currentUser) window._currentUser.avatar = saved;
            // Notify socket
            const socket = getSocket();
            if (socket) socket.emit('avatar:update', opts);
            showToast('Saved!', 'Your avatar has been updated.', 'success');
        } catch (err) {
            showToast('Error', err.message);
        }
    });
}

export function destroyProfile() {
    if (_scene) { _scene.destroy(); _scene = null; }
    _chibi = null;
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
