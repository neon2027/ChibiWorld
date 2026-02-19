import * as THREE from 'three';
import { SceneManager } from '../three/sceneManager.js';
import { buildPlaza, worldToThree } from '../three/plazaWorld.js';
import { buildChibi, animateChibi } from '../three/chibiBuilder.js';
import { PlayerManager } from '../three/playerManager.js';
import { InputController } from '../three/inputController.js';
import { ChatPanel } from '../ui/chatPanel.js';
import { VoiceUI } from '../voice/voiceUI.js';
import { getSocket } from '../socket.js';

let _scene = null;
let _playerGroup = null;
let _playerMgr = null;
let _input = null;
let _chat = null;
let _voiceUI = null;
let _localBubble = null;
let _localBubbleTimer = null;
let _localMicEl = null;

// Camera orbit state
let _camAzimuth = 0;
let _camElevation = 0.69;
let _camDistance = 28;
let _camDragging = false;
let _camDragX = 0;
let _camDragY = 0;
let _camCleanup = null;

export function renderPlaza(container) {
    const user = window._currentUser;
    const socket = getSocket();

    container.innerHTML = `
        <div class="plaza-layout">
            <div class="plaza-canvas-wrap">
                <canvas id="plazaCanvas"></canvas>
                <div class="movement-hint">WASD or Click to move &nbsp;•&nbsp; Right-drag to rotate &nbsp;•&nbsp; Scroll to zoom</div>
            </div>
            <div class="plaza-sidebar" id="chatSidebar"></div>
        </div>
    `;

    const canvas = container.querySelector('#plazaCanvas');
    const sidebar = container.querySelector('#chatSidebar');

    // Init Three.js scene
    _scene = new SceneManager(canvas);
    _scene.addLights('plaza');
    buildPlaza(_scene.scene);

    // Camera: top-down isometric feel
    _scene.camera.position.set(0, 18, 22);
    _scene.camera.lookAt(0, 0, 0);

    // Camera orbit controls (right-click drag + scroll wheel)
    _camAzimuth = 0;
    _camElevation = 0.69;
    _camDistance = 28;
    _camDragging = false;

    const onContextMenu = (e) => e.preventDefault();
    const onMouseDown = (e) => {
        if (e.button === 2) { _camDragging = true; _camDragX = e.clientX; _camDragY = e.clientY; }
    };
    const onMouseUp = (e) => { if (e.button === 2) _camDragging = false; };
    const onMouseMove = (e) => {
        if (!_camDragging) return;
        const dx = e.clientX - _camDragX;
        const dy = e.clientY - _camDragY;
        _camDragX = e.clientX;
        _camDragY = e.clientY;
        _camAzimuth -= dx * 0.008;
        _camElevation = Math.max(0.2, Math.min(1.45, _camElevation + dy * 0.005));
    };
    const onWheel = (e) => {
        e.preventDefault();
        _camDistance = Math.max(8, Math.min(55, _camDistance + e.deltaY * 0.05));
    };

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    _camCleanup = () => {
        canvas.removeEventListener('contextmenu', onContextMenu);
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('wheel', onWheel);
    };

    // Local player chibi
    const av = user?.avatar || {};
    const avatarOpts = {
        skinTone:    av.skin_tone    || '#f5c890',
        hairColor:   av.hair_color   || '#4a3728',
        hairStyle:   av.hair_style   ?? 0,
        outfitColor: av.outfit_color || '#ff7eb3',
        eyeColor:    av.eye_color    || '#3a2a1a',
        accessory:   av.accessory    ?? 0
    };
    _playerGroup = buildChibi(avatarOpts);
    _scene.scene.add(_playerGroup);

    // Local name label
    const localLabel = document.createElement('div');
    localLabel.className = 'player-label';
    localLabel.textContent = user?.username + ' (you)';
    localLabel.style.color = '#7ec8e3';
    canvas.parentElement.appendChild(localLabel);

    // Local speech bubble (reused element)
    _localBubble = document.createElement('div');
    _localBubble.className = 'chat-bubble mine';
    _localBubble.style.display = 'none';
    canvas.parentElement.appendChild(_localBubble);

    // Remote players
    _playerMgr = new PlayerManager(_scene.scene);
    _playerMgr.setCamera(_scene.camera, canvas);

    // Input
    _input = new InputController(canvas, _scene.camera, (wx, wz) => {
        socket?.emit('plaza:move', { x: wx, z: wz });
    });
    _input.setPosition(50, 50);

    // Local mic icon (shown above local player's head when speaking)
    _localMicEl = document.createElement('div');
    _localMicEl.className = 'mic-indicator';
    _localMicEl.textContent = '🎤';
    _localMicEl.style.display = 'none';
    canvas.parentElement.appendChild(_localMicEl);

    // Chat panel
    _chat = new ChatPanel(sidebar, user);

    // Voice UI — mounts inside the sidebar below chat
    const voiceContainer = document.createElement('div');
    voiceContainer.className = 'voice-container';
    sidebar.appendChild(voiceContainer);
    _voiceUI = new VoiceUI(voiceContainer, user.id, (uid, speaking) => {
        if (uid === user.id) {
            // Toggle local mic icon
            _localMicEl.classList.toggle('speaking', speaking);
            _localMicEl.style.display = speaking ? 'flex' : 'none';
        } else {
            _playerMgr?.setMicSpeaking(uid, speaking);
        }
    });

    // Socket events
    if (socket) {
        socket.emit('plaza:join');

        socket.on('plaza:snapshot', ({ players }) => {
            for (const p of players) _playerMgr.addPlayer(p);
        });

        socket.on('plaza:playerJoined', (p) => {
            _playerMgr.addPlayer(p);
        });

        socket.on('plaza:playerLeft', ({ userId }) => {
            _playerMgr.removePlayer(userId);
        });

        socket.on('plaza:playerMoved', ({ userId, x, z }) => {
            _playerMgr.movePlayer(userId, x, z);
        });

        socket.on('avatar:updated', ({ userId, avatar }) => {
            _playerMgr.updateAvatar(userId, avatar);
        });

        // Chat bubbles above heads
        socket.on('chat:global', (msg) => {
            if (msg.senderId === user.id) {
                // Local player bubble
                _showLocalBubble(msg.content);
            } else {
                // Remote player bubble
                _playerMgr.showBubble(msg.senderId, msg.content);
            }
        });
    }

    // Game loop
    let moving = false;
    _scene.onUpdate((dt) => {
        if (!_input || !_playerGroup) return;

        moving = _input.update(dt, _playerGroup);
        animateChibi(_playerGroup, moving, dt);

        // Orbit camera around player
        const px = _playerGroup.position.x;
        const pz = _playerGroup.position.z;
        const sinA = Math.sin(_camAzimuth), cosA = Math.cos(_camAzimuth);
        const cosE = Math.cos(_camElevation), sinE = Math.sin(_camElevation);
        const camX = px + _camDistance * sinA * cosE;
        const camY = _camDistance * sinE;
        const camZ = pz + _camDistance * cosA * cosE;
        _scene.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.07);
        _scene.camera.lookAt(new THREE.Vector3(px, 0, pz));

        // Update local label + bubble
        {
            const pos3D = new THREE.Vector3(px, 8.5, pz);
            pos3D.project(_scene.camera);
            const w = canvas.clientWidth, h = canvas.clientHeight;
            const sx = (pos3D.x * 0.5 + 0.5) * w;
            const sy = (-pos3D.y * 0.5 + 0.5) * h;
            const visible = pos3D.z < 1;

            localLabel.style.left = `${sx}px`;
            localLabel.style.top = `${sy}px`;
            localLabel.style.display = visible ? 'block' : 'none';

            if (_localBubble && _localBubble.style.display !== 'none') {
                const bubblePos = new THREE.Vector3(px, 11, pz);
                bubblePos.project(_scene.camera);
                _localBubble.style.left = `${(bubblePos.x * 0.5 + 0.5) * w}px`;
                _localBubble.style.top = `${(-bubblePos.y * 0.5 + 0.5) * h}px`;
            }

            if (_localMicEl && _localMicEl.style.display !== 'none') {
                const micPos = new THREE.Vector3(px, 13, pz);
                micPos.project(_scene.camera);
                _localMicEl.style.left = `${(micPos.x * 0.5 + 0.5) * w}px`;
                _localMicEl.style.top = `${(-micPos.y * 0.5 + 0.5) * h}px`;
            }
        }

        _playerMgr.update(dt);
    });

    _scene.start();
}

function _showLocalBubble(text) {
    if (!_localBubble) return;
    clearTimeout(_localBubbleTimer);

    const clipped = text.length > 60 ? text.slice(0, 58) + '…' : text;
    _localBubble.textContent = clipped;
    _localBubble.style.display = 'block';
    _localBubble.classList.remove('fading');
    // Force reflow to restart animation
    void _localBubble.offsetWidth;
    _localBubble.style.animation = 'none';
    void _localBubble.offsetWidth;
    _localBubble.style.animation = '';

    _localBubbleTimer = setTimeout(() => {
        if (_localBubble) {
            _localBubble.classList.add('fading');
            setTimeout(() => { if (_localBubble) _localBubble.style.display = 'none'; }, 500);
        }
    }, 3500);
}

export function destroyPlaza() {
    const socket = getSocket();
    if (socket) {
        socket.emit('plaza:leave');
        socket.off('plaza:snapshot');
        socket.off('plaza:playerJoined');
        socket.off('plaza:playerLeft');
        socket.off('plaza:playerMoved');
        socket.off('avatar:updated');
        socket.off('chat:global');
    }
    clearTimeout(_localBubbleTimer);
    _localBubble = null;
    _localBubbleTimer = null;
    _localMicEl = null;
    _camCleanup?.();
    _camCleanup = null;
    _voiceUI?.destroy();
    _voiceUI = null;
    _input?.destroy();
    _playerMgr?.destroy();
    if (_scene) { _scene.destroy(); _scene = null; }
    _playerGroup = null;
    _input = null;
    _playerMgr = null;
    _chat = null;
}
