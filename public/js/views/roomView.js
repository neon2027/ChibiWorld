import * as THREE from 'three';
import { SceneManager } from '../three/sceneManager.js';
import { buildRoom, buildFurnitureMesh, FURNITURE_ICONS, ROOM_BOUNDS } from '../three/roomWorld.js';
import { buildChibi, animateChibi } from '../three/chibiBuilder.js';
import { PlayerManager } from '../three/playerManager.js';
import { getSocket } from '../socket.js';
import { api } from '../api.js';
import { showToast } from '../ui/toast.js';
import { VoiceUI } from '../voice/voiceUI.js';

let _scene = null;
let _playerGroup = null;
let _playerMgr = null;
let _furnitureMeshes = new Map(); // furnitureId -> THREE.Group
let _placingItem = null; // { itemType, color, ghostMesh }
let _currentRoomId = null;
let _isOwner = false;
let _placingColor = '#ff7eb3';
let _localRoomBubble = null;
let _localRoomBubbleTimer = null;
let _roomVoiceUI = null;
let _localRoomMicEl = null;

// Room camera orbit state
let _roomCamAzimuth = 0;
let _roomCamElevation = 0.832;
let _roomCamDistance = 16.28;
let _roomCamDragging = false;
let _roomCamDragX = 0;
let _roomCamDragY = 0;
let _roomCamCleanup = null;

export async function renderRoom(container, params) {
    const user = window._currentUser;
    const socket = getSocket();

    // Determine room to load
    let roomId;
    if (params.id === 'mine' || !params.id) {
        const room = await api.getMyRoom();
        roomId = room.id;
    } else {
        roomId = parseInt(params.id);
    }
    _currentRoomId = roomId;

    // Load catalog
    const catalog = await api.getFurnitureCatalog();
    const byCategory = {};
    for (const item of catalog) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
    }

    container.innerHTML = `
        <div class="room-layout">
            <div class="room-canvas-wrap">
                <canvas id="roomCanvas"></canvas>
                <div class="movement-hint">WASD or Click to move &nbsp;•&nbsp; Right-drag to rotate &nbsp;•&nbsp; Scroll to zoom</div>
            </div>
            <div class="room-sidebar">
                <div class="room-info-bar">
                    <span class="room-name" id="roomNameEl">Loading...</span>
                    <button class="btn btn-sm btn-outline" id="roomSettingsBtn">⚙</button>
                </div>

                <div id="ownerCtrls" class="hidden">
                    <div class="room-color-row">
                        <span>Furniture color:</span>
                        <input type="color" id="placingColorInput" value="${_placingColor}" style="width:36px;height:26px;padding:2px;background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer">
                        <button class="btn btn-sm btn-secondary" id="cancelPlaceBtn" style="display:none">Cancel</button>
                    </div>
                    <div class="furniture-catalog scrollbar" id="catalogEl">
                        ${Object.entries(byCategory).map(([cat, items]) => `
                            <div class="furniture-category">
                                <div class="furniture-category-title">${cat}</div>
                                <div class="furniture-grid">
                                    ${items.map(it => `
                                        <div class="furniture-item" data-type="${it.item_type}" data-color="${it.default_color}">
                                            <div class="furniture-icon">${FURNITURE_ICONS[it.item_type] || '📦'}</div>
                                            <div>${it.display_name}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div id="visitorCtrls" style="padding:16px;color:var(--text-muted);font-size:13px">
                    You are visiting this room.
                </div>
            </div>
        </div>

        <!-- Room settings modal -->
        <div id="roomSettingsModal" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:250;display:flex;align-items:center;justify-content:center">
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:340px">
                <h3 style="color:var(--pink);margin-bottom:16px">Room Settings</h3>
                <div class="form-group"><label class="form-label">Room Name</label><input class="form-input" id="roomNameInput" maxlength="30"></div>
                <div class="form-group">
                    <label class="form-label">Theme</label>
                    <select class="form-input" id="roomThemeInput" style="cursor:pointer">
                        <option value="default">Default (Purple)</option>
                        <option value="sunset">Sunset (Red)</option>
                        <option value="ocean">Ocean (Blue)</option>
                        <option value="forest">Forest (Green)</option>
                        <option value="candy">Candy (Pink)</option>
                    </select>
                </div>
                <div class="form-group" style="display:flex;align-items:center;gap:10px">
                    <input type="checkbox" id="roomPublicInput" style="width:16px;height:16px">
                    <label for="roomPublicInput">List room publicly</label>
                </div>
                <div style="display:flex;gap:10px;margin-top:16px">
                    <button class="btn btn-primary" id="saveRoomSettings" style="flex:1">Save</button>
                    <button class="btn btn-secondary" id="closeRoomSettings">Cancel</button>
                </div>
            </div>
        </div>
    `;

    const canvas = container.querySelector('#roomCanvas');
    _scene = new SceneManager(canvas);
    _scene.camera.position.set(ROOM_BOUNDS.w / 2, 12, ROOM_BOUNDS.d + 6);
    _scene.camera.lookAt(ROOM_BOUNDS.w / 2, 0, ROOM_BOUNDS.d / 2);

    // Camera orbit controls (right-click drag + scroll wheel)
    _roomCamAzimuth = 0;
    _roomCamElevation = 0.832;
    _roomCamDistance = 16.28;
    _roomCamDragging = false;

    const onRoomContextMenu = (e) => e.preventDefault();
    const onRoomMouseDown = (e) => {
        if (e.button === 2) { _roomCamDragging = true; _roomCamDragX = e.clientX; _roomCamDragY = e.clientY; }
    };
    const onRoomMouseUp = (e) => { if (e.button === 2) _roomCamDragging = false; };
    const onRoomMouseMove = (e) => {
        if (!_roomCamDragging) return;
        const dx = e.clientX - _roomCamDragX;
        const dy = e.clientY - _roomCamDragY;
        _roomCamDragX = e.clientX;
        _roomCamDragY = e.clientY;
        _roomCamAzimuth -= dx * 0.008;
        _roomCamElevation = Math.max(0.2, Math.min(1.45, _roomCamElevation + dy * 0.005));
    };
    const onRoomWheel = (e) => {
        e.preventDefault();
        _roomCamDistance = Math.max(6, Math.min(30, _roomCamDistance + e.deltaY * 0.04));
    };

    canvas.addEventListener('contextmenu', onRoomContextMenu);
    canvas.addEventListener('mousedown', onRoomMouseDown);
    window.addEventListener('mouseup', onRoomMouseUp);
    window.addEventListener('mousemove', onRoomMouseMove);
    canvas.addEventListener('wheel', onRoomWheel, { passive: false });

    _roomCamCleanup = () => {
        canvas.removeEventListener('contextmenu', onRoomContextMenu);
        canvas.removeEventListener('mousedown', onRoomMouseDown);
        window.removeEventListener('mouseup', onRoomMouseUp);
        window.removeEventListener('mousemove', onRoomMouseMove);
        canvas.removeEventListener('wheel', onRoomWheel);
    };

    // Local speech bubble
    _localRoomBubble = document.createElement('div');
    _localRoomBubble.className = 'chat-bubble mine';
    _localRoomBubble.style.display = 'none';
    canvas.parentElement.appendChild(_localRoomBubble);

    // Local mic icon
    _localRoomMicEl = document.createElement('div');
    _localRoomMicEl.className = 'mic-indicator';
    _localRoomMicEl.textContent = '🎤';
    _localRoomMicEl.style.display = 'none';
    canvas.parentElement.appendChild(_localRoomMicEl);

    // Voice UI — appended to the room sidebar
    const voiceContainer = document.createElement('div');
    voiceContainer.className = 'voice-container';
    container.querySelector('.room-sidebar').appendChild(voiceContainer);
    _roomVoiceUI = new VoiceUI(voiceContainer, user.id, (uid, speaking) => {
        if (uid === user.id) {
            _localRoomMicEl.classList.toggle('speaking', speaking);
            _localRoomMicEl.style.display = speaking ? 'flex' : 'none';
        } else {
            _playerMgr?.setMicSpeaking(uid, speaking);
        }
    });

    // Build local player chibi
    const av = user?.avatar || {};
    _playerGroup = buildChibi({
        skinTone: av.skin_tone || '#f5c890', hairColor: av.hair_color || '#4a3728',
        hairStyle: av.hair_style ?? 0, outfitColor: av.outfit_color || '#ff7eb3',
        eyeColor: av.eye_color || '#3a2a1a', accessory: av.accessory ?? 0
    });
    _playerGroup.position.set(ROOM_BOUNDS.w / 2, 0, ROOM_BOUNDS.d / 2);
    _scene.scene.add(_playerGroup);

    _playerMgr = new PlayerManager(_scene.scene);
    _playerMgr.setCamera(_scene.camera, canvas);

    // Raycaster for furniture placement
    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let ghostMesh = null;

    canvas.addEventListener('mousemove', (e) => {
        if (!_placingItem || !_isOwner || _roomCamDragging) return;
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), _scene.camera);
        const pt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(floorPlane, pt)) {
            pt.x = Math.max(0.5, Math.min(ROOM_BOUNDS.w - 0.5, pt.x));
            pt.z = Math.max(0.5, Math.min(ROOM_BOUNDS.d - 0.5, pt.z));
            if (ghostMesh) ghostMesh.position.set(pt.x, 0, pt.z);
        }
    });

    canvas.addEventListener('click', (e) => {
        if (!_placingItem || !_isOwner || !ghostMesh) return;
        const { x, z } = ghostMesh.position;
        socket?.emit('room:placeFurniture', {
            itemType: _placingItem.type,
            posX: x, posY: 0, posZ: z,
            rotY: 0, color: _placingColor
        });
        _cancelPlacement(canvas, container);
    });

    // Socket events
    if (socket) {
        socket.emit('room:join', { roomId });

        socket.on('room:snapshot', ({ room, furniture, players }) => {
            _isOwner = room.ownerId === user.id;
            container.querySelector('#roomNameEl').textContent = room.name;
            container.querySelector('#ownerCtrls').classList.toggle('hidden', !_isOwner);
            container.querySelector('#visitorCtrls').classList.toggle('hidden', _isOwner);

            // Build room world
            buildRoom(_scene.scene, room.theme);

            // Place existing furniture
            for (const f of furniture) _spawnFurniture(f);

            // Add remote players
            for (const p of players) _playerMgr.addPlayer(p);
        });

        socket.on('room:playerJoined', (p) => _playerMgr.addPlayer(p));
        socket.on('room:playerLeft', ({ userId }) => _playerMgr.removePlayer(userId));
        socket.on('room:playerMoved', ({ userId, x, z }) => _playerMgr.movePlayer(userId, x, z));

        socket.on('room:furniturePlaced', (f) => _spawnFurniture(f));
        socket.on('room:furnitureMoved', ({ furnitureId, posX, posZ }) => {
            const mesh = _furnitureMeshes.get(furnitureId);
            if (mesh) mesh.position.set(posX, 0, posZ);
        });
        socket.on('room:furnitureRemoved', ({ furnitureId }) => {
            const mesh = _furnitureMeshes.get(furnitureId);
            if (mesh) { _scene.scene.remove(mesh); _furnitureMeshes.delete(furnitureId); }
        });

        socket.on('room:invited', ({ roomId: rid, roomName, inviterName }) => {
            showToast('Room Invite!', `${inviterName} invited you to "${roomName}"`, 'info');
            if (confirm(`${inviterName} invited you to "${roomName}". Visit now?`)) {
                api.acceptRoomInvite(rid).then(() => {
                    window.location.hash = `#/room/${rid}`;
                });
            }
        });

        // Chat bubbles above heads in room
        socket.on('chat:global', (msg) => {
            if (msg.senderId === user.id) {
                _showRoomLocalBubble(msg.content, canvas);
            } else {
                _playerMgr.showBubble(msg.senderId, msg.content);
            }
        });
    }

    // Furniture catalog interaction
    container.querySelector('#catalogEl')?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-type]');
        if (!item) return;
        _startPlacement(item.dataset.type, canvas, container);
    });

    container.querySelector('#placingColorInput')?.addEventListener('input', (e) => {
        _placingColor = e.target.value;
    });

    container.querySelector('#cancelPlaceBtn')?.addEventListener('click', () => {
        _cancelPlacement(canvas, container);
    });

    // Room settings
    container.querySelector('#roomSettingsBtn').addEventListener('click', async () => {
        if (!_isOwner) return;
        const room = await api.getMyRoom();
        container.querySelector('#roomNameInput').value = room.name;
        container.querySelector('#roomThemeInput').value = room.theme;
        container.querySelector('#roomPublicInput').checked = !!room.is_public;
        container.querySelector('#roomSettingsModal').classList.remove('hidden');
    });
    container.querySelector('#closeRoomSettings').addEventListener('click', () => {
        container.querySelector('#roomSettingsModal').classList.add('hidden');
    });
    container.querySelector('#saveRoomSettings').addEventListener('click', async () => {
        await api.updateMyRoom({
            name: container.querySelector('#roomNameInput').value,
            theme: container.querySelector('#roomThemeInput').value,
            isPublic: container.querySelector('#roomPublicInput').checked
        });
        container.querySelector('#roomSettingsModal').classList.add('hidden');
        showToast('Saved!', 'Room settings updated.', 'success');
        container.querySelector('#roomNameEl').textContent = container.querySelector('#roomNameInput').value;
    });

    // Simple WASD movement
    const keys = {};
    const onKey = (e) => { keys[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    let lastEmit = 0;
    _scene.onUpdate((dt) => {
        if (!_playerGroup) return;
        const SPEED = 6;
        let rawDx = 0, rawDz = 0;
        if (keys['KeyW'] || keys['ArrowUp'])    rawDz -= 1;
        if (keys['KeyS'] || keys['ArrowDown'])  rawDz += 1;
        if (keys['KeyA'] || keys['ArrowLeft'])  rawDx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) rawDx += 1;

        const moved = rawDx !== 0 || rawDz !== 0;
        if (moved) {
            const len = Math.sqrt(rawDx * rawDx + rawDz * rawDz);
            const nx = rawDx / len, nz = rawDz / len;
            const sinA = Math.sin(_roomCamAzimuth);
            const cosA = Math.cos(_roomCamAzimuth);
            const dx = (nz * sinA + nx * cosA) * SPEED * dt;
            const dz = (nz * cosA - nx * sinA) * SPEED * dt;
            _playerGroup.position.x = Math.max(0.5, Math.min(ROOM_BOUNDS.w - 0.5, _playerGroup.position.x + dx));
            _playerGroup.position.z = Math.max(0.5, Math.min(ROOM_BOUNDS.d - 0.5, _playerGroup.position.z + dz));
            const now = Date.now();
            if (now - lastEmit > 66) {
                lastEmit = now;
                socket?.emit('room:move', { x: _playerGroup.position.x, z: _playerGroup.position.z });
            }
        }
        animateChibi(_playerGroup, moved, dt);
        _playerMgr.update(dt);

        // Update room camera from orbit state
        {
            const cx = ROOM_BOUNDS.w / 2, cz = ROOM_BOUNDS.d / 2;
            const sinA = Math.sin(_roomCamAzimuth), cosA = Math.cos(_roomCamAzimuth);
            const cosE = Math.cos(_roomCamElevation), sinE = Math.sin(_roomCamElevation);
            const targetPos = new THREE.Vector3(
                cx + _roomCamDistance * sinA * cosE,
                _roomCamDistance * sinE,
                cz + _roomCamDistance * cosA * cosE
            );
            _scene.camera.position.lerp(targetPos, 0.12);
            _scene.camera.lookAt(cx, 0, cz);
        }

        // Update local bubble + mic positions
        {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            const px = _playerGroup.position.x, pz = _playerGroup.position.z;
            if (_localRoomBubble && _localRoomBubble.style.display !== 'none') {
                const bp = new THREE.Vector3(px, 11, pz);
                bp.project(_scene.camera);
                _localRoomBubble.style.left = `${(bp.x * 0.5 + 0.5) * w}px`;
                _localRoomBubble.style.top = `${(-bp.y * 0.5 + 0.5) * h}px`;
            }
            if (_localRoomMicEl && _localRoomMicEl.style.display !== 'none') {
                const mp = new THREE.Vector3(px, 13, pz);
                mp.project(_scene.camera);
                _localRoomMicEl.style.left = `${(mp.x * 0.5 + 0.5) * w}px`;
                _localRoomMicEl.style.top = `${(-mp.y * 0.5 + 0.5) * h}px`;
            }
        }
    });

    container._roomCleanup = () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };

    _scene.start();
}

function _showRoomLocalBubble(text, canvas) {
    if (!_localRoomBubble) return;
    clearTimeout(_localRoomBubbleTimer);
    _localRoomBubble.textContent = text.length > 60 ? text.slice(0, 58) + '…' : text;
    _localRoomBubble.style.display = 'block';
    _localRoomBubble.classList.remove('fading');
    void _localRoomBubble.offsetWidth;
    _localRoomBubble.style.animation = 'none';
    void _localRoomBubble.offsetWidth;
    _localRoomBubble.style.animation = '';
    _localRoomBubbleTimer = setTimeout(() => {
        if (_localRoomBubble) {
            _localRoomBubble.classList.add('fading');
            setTimeout(() => { if (_localRoomBubble) _localRoomBubble.style.display = 'none'; }, 500);
        }
    }, 3500);
}

function _spawnFurniture(f) {
    const mesh = buildFurnitureMesh(f.item_type, f.color);
    mesh.position.set(f.pos_x, f.pos_y, f.pos_z);
    mesh.rotation.y = f.rotation_y;
    mesh.userData.furnitureId = f.id;
    _scene.scene.add(mesh);
    _furnitureMeshes.set(f.id, mesh);

    // Right-click to remove (owner only)
    if (_isOwner) {
        // Use raycaster click in canvas to detect — handled separately
    }
}

function _startPlacement(itemType, canvas, container) {
    _placingItem = { type: itemType };
    const mesh = buildFurnitureMesh(itemType, _placingColor);
    mesh.traverse(c => { if (c.material) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.6; } });
    _scene.scene.add(mesh);
    _placingItem.ghost = mesh;

    container.querySelectorAll('.furniture-item').forEach(el => el.classList.toggle('placing', el.dataset.type === itemType));
    const cancelBtn = container.querySelector('#cancelPlaceBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function _cancelPlacement(canvas, container) {
    if (_placingItem?.ghost) { _scene.scene.remove(_placingItem.ghost); }
    _placingItem = null;
    container.querySelectorAll('.furniture-item').forEach(el => el.classList.remove('placing'));
    const cancelBtn = container.querySelector('#cancelPlaceBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

export function destroyRoom() {
    const socket = getSocket();
    if (socket) {
        socket.emit('room:leave');
        socket.off('room:snapshot');
        socket.off('room:playerJoined');
        socket.off('room:playerLeft');
        socket.off('room:playerMoved');
        socket.off('room:furniturePlaced');
        socket.off('room:furnitureMoved');
        socket.off('room:furnitureRemoved');
        socket.off('room:invited');
        socket.off('chat:global');
    }
    clearTimeout(_localRoomBubbleTimer);
    _localRoomBubble = null;
    _localRoomBubbleTimer = null;
    _localRoomMicEl = null;
    _roomCamCleanup?.();
    _roomCamCleanup = null;
    _roomVoiceUI?.destroy();
    _roomVoiceUI = null;
    _playerMgr?.destroy();
    if (_scene) { _scene.destroy(); _scene = null; }
    _furnitureMeshes.clear();
    _placingItem = null;
    _playerGroup = null;
    _playerMgr = null;
    _currentRoomId = null;
}
