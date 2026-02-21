import * as THREE from 'three';

const HAIR_NAMES = ['Short', 'Long', 'Pigtails', 'Spiky', 'Bun'];
const ACCESSORY_NAMES = ['None', 'Glasses', 'Bow', 'Cat Ears', 'Halo', 'Horns'];

export { HAIR_NAMES, ACCESSORY_NAMES };

export function buildChibi(options = {}) {
    const {
        skinTone    = '#f5c890',
        hairColor   = '#4a3728',
        hairStyle   = 0,
        outfitColor = '#ff7eb3',
        eyeColor    = '#3a2a1a',
        accessory   = 0
    } = options;

    const group = new THREE.Group();

    const mat = {
        skin:   new THREE.MeshPhongMaterial({ color: skinTone, specular: 0x444444, shininess: 30 }),
        hair:   new THREE.MeshPhongMaterial({ color: hairColor }),
        outfit: new THREE.MeshPhongMaterial({ color: outfitColor }),
        iris:   new THREE.MeshPhongMaterial({ color: eyeColor, specular: 0x88ccff, shininess: 90 }),
        eye:    new THREE.MeshBasicMaterial({ color: 0x0a0a0a }),
        white:  new THREE.MeshPhongMaterial({ color: '#ffffff' }),
        shoe:   new THREE.MeshPhongMaterial({ color: '#222222' }),
        blush:  new THREE.MeshBasicMaterial({ color: '#ff9999', transparent: true, opacity: 0.5 }),
        mouth:  new THREE.MeshPhongMaterial({ color: '#ff5577' }),
        lash:   new THREE.MeshBasicMaterial({ color: '#050505' }),
    };

    // === SHOES (slightly flattened for a cute sneaker look) ===
    for (const sx of [-0.5, 0.5]) {
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.44, 8, 6), mat.shoe);
        shoe.scale.set(1.25, 0.7, 1.4);
        shoe.position.set(sx, 0.22, 0.14);
        shoe.castShadow = true;
        group.add(shoe);
    }

    // === LEGS (shorter, chubbier chibi legs) ===
    for (const sx of [-0.46, 0.46]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 10), mat.outfit);
        leg.position.set(sx, 0.9, 0);
        leg.castShadow = true;
        group.add(leg);
    }

    // === BODY (slimmer, shorter — let the head dominate) ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.98, 0.9, 8, 16), mat.outfit);
    body.position.y = 2.15;
    body.castShadow = true;
    group.add(body);

    // === ARMS ===
    const arms = {};
    for (const [side, sx] of [['left', -1.28], ['right', 1.28]]) {
        const armGroup = new THREE.Group();
        armGroup.position.set(sx, 2.72, 0);

        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 6, 10), mat.outfit);
        arm.position.y = -0.48;
        arm.castShadow = true;
        armGroup.add(arm);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat.skin);
        hand.position.y = -0.95;
        armGroup.add(hand);

        group.add(armGroup);
        arms[side] = armGroup;
    }

    // === HEAD (big chibi head — ~45% of total height) ===
    const headGroup = new THREE.Group();
    headGroup.position.y = 4.35;

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 16), mat.skin);
    head.scale.set(1.05, 1.0, 1.0); // slightly wider
    head.castShadow = true;
    headGroup.add(head);

    // === EYES (large anime style: sclera → iris → pupil → eyelash → highlights) ===
    for (const [ex, sign] of [[-0.64, -1], [0.64, 1]]) {
        // Sclera (white)
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), mat.white);
        sclera.position.set(ex, 0.14, 1.62);
        sclera.scale.set(1.0, 1.85, 0.34);
        headGroup.add(sclera);

        // Iris (eye color)
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat.iris);
        iris.position.set(ex, 0.12, 1.71);
        iris.scale.set(1.0, 1.85, 0.32);
        headGroup.add(iris);

        // Pupil
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), mat.eye);
        pupil.position.set(ex, 0.1, 1.75);
        pupil.scale.set(1.0, 1.7, 0.28);
        headGroup.add(pupil);

        // Eyelash bar (thick top line)
        const lash = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.15, 0.08), mat.lash);
        lash.position.set(ex, 0.62, 1.64);
        lash.rotation.x = -0.1;
        headGroup.add(lash);

        // Main star highlight (top-inner)
        const shine1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat.white);
        shine1.position.set(ex + 0.15 * sign, 0.34, 1.77);
        headGroup.add(shine1);

        // Small secondary highlight (lower)
        const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 4, 4), mat.white);
        shine2.position.set(ex - 0.07 * sign, -0.06, 1.77);
        headGroup.add(shine2);
    }

    // === MOUTH (cute wide smile) ===
    const mouthGeo = new THREE.TorusGeometry(0.24, 0.065, 4, 12, Math.PI);
    const mouth = new THREE.Mesh(mouthGeo, mat.mouth);
    mouth.position.set(0, -0.48, 1.70);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);

    // === BLUSH (larger, softer) ===
    for (const bx of [-0.9, 0.9]) {
        const blush = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), mat.blush);
        blush.position.set(bx, -0.2, 1.54);
        headGroup.add(blush);
    }

    // Hair & accessory
    _buildHair(headGroup, hairStyle, mat.hair);
    _buildAccessory(headGroup, accessory);

    group.add(headGroup);

    // Store refs for animation
    group._parts = { body, headGroup, arms };
    group._walkPhase  = 0;
    group._idlePhase  = Math.random() * Math.PI * 2;
    group._dancePhase = 0;

    group.scale.setScalar(0.45);
    return group;
}

// ── HAIR STYLES ───────────────────────────────────────────────────────────────
function _buildHair(headGroup, style, material) {
    // Half-sphere cap sized for the new head radius (1.9)
    const cap = (r) => new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);

    switch (style) {
        case 0: { // Short — neat cap with side bangs
            const top = new THREE.Mesh(cap(2.0), material);
            top.position.y = 0.1;
            headGroup.add(top);
            // Side bangs
            for (const [bx, bz] of [[-1.55, 0.8], [1.55, 0.8]]) {
                const bang = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), material);
                bang.scale.set(0.6, 1.2, 0.65);
                bang.position.set(bx, -0.5, bz);
                headGroup.add(bang);
            }
            // Front fringe
            const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.88, 8, 6), material);
            fringe.scale.set(1.6, 0.55, 0.55);
            fringe.position.set(0, -0.55, 1.62);
            headGroup.add(fringe);
            break;
        }
        case 1: { // Long — flowing hair down the back
            const top = new THREE.Mesh(cap(2.0), material);
            top.position.y = 0.1;
            headGroup.add(top);
            // Drape down back
            const drape = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.5), material);
            drape.position.set(0, -1.2, -1.5);
            headGroup.add(drape);
            // Rounded bottom of drape
            const drapeBottom = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), material);
            drapeBottom.position.set(0, -2.7, -1.5);
            headGroup.add(drapeBottom);
            // Side pieces framing face
            for (const sx of [-1.3, 1.3]) {
                const side = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.5, 0.42), material);
                side.position.set(sx, -1.0, 0.4);
                headGroup.add(side);
            }
            break;
        }
        case 2: { // Pigtails — twin poofy buns
            const top = new THREE.Mesh(cap(2.0), material);
            top.position.y = 0.1;
            headGroup.add(top);
            for (const [px, rz] of [[-2.1, 0.35], [2.1, -0.35]]) {
                const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 10, 8), material);
                ball1.position.set(px, 0.5, -0.2);
                headGroup.add(ball1);
                const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), material);
                ball2.position.set(px * 1.05, -0.3, -0.25);
                headGroup.add(ball2);
            }
            break;
        }
        case 3: { // Spiky — sharp wild spikes all around
            const top = new THREE.Mesh(cap(1.92), material);
            top.position.y = 0.06;
            headGroup.add(top);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.35, 5), material);
                spike.position.set(Math.cos(angle) * 1.2, 1.4, Math.sin(angle) * 1.2);
                spike.rotation.z =  Math.cos(angle) * 0.5;
                spike.rotation.x = -Math.sin(angle) * 0.5;
                headGroup.add(spike);
            }
            // Top spike
            const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 5), material);
            topSpike.position.set(0, 2.1, 0);
            headGroup.add(topSpike);
            break;
        }
        case 4: { // Bun — elegant top knot + side pieces
            const top = new THREE.Mesh(cap(2.0), material);
            top.position.y = 0.1;
            headGroup.add(top);
            const bun = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), material);
            bun.position.set(0, 1.98, -0.22);
            headGroup.add(bun);
            // Bun wrap ring
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 6, 16), material);
            ring.position.set(0, 1.98, -0.22);
            ring.rotation.x = Math.PI / 2;
            headGroup.add(ring);
            break;
        }
    }
}

// ── ACCESSORIES ───────────────────────────────────────────────────────────────
function _buildAccessory(headGroup, type) {
    switch (type) {
        case 1: { // Glasses
            const glassMat = new THREE.MeshPhongMaterial({ color: '#2a2a2a' });
            for (const gx of [-0.64, 0.64]) {
                const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 14), glassMat);
                rim.position.set(gx, 0.12, 1.74);
                headGroup.add(rim);
            }
            const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 4), glassMat);
            bridge.position.set(0, 0.12, 1.74);
            bridge.rotation.z = Math.PI / 2;
            headGroup.add(bridge);
            break;
        }
        case 2: { // Bow
            const bowMat = new THREE.MeshPhongMaterial({ color: '#ff3366' });
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), bowMat);
            center.position.set(1.6, 1.0, 0.25);
            headGroup.add(center);
            for (const [wx, wy] of [[-0.45, 0.18], [0.45, 0.18]]) {
                const wing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), bowMat);
                wing.position.set(1.6 + wx, 1.0 + wy, 0.25);
                wing.scale.set(1.3, 0.6, 0.5);
                headGroup.add(wing);
            }
            break;
        }
        case 3: { // Cat ears
            const earMat   = new THREE.MeshPhongMaterial({ color: '#ffccaa' });
            const innerMat = new THREE.MeshPhongMaterial({ color: '#ffaaaa' });
            for (const [cx, rz] of [[-0.88, -0.2], [0.88, 0.2]]) {
                const ear = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), earMat);
                ear.position.set(cx, 2.2, 0.22);
                ear.rotation.z = rz;
                headGroup.add(ear);
                const inner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4), innerMat);
                inner.position.set(cx, 2.2, 0.24);
                inner.rotation.z = rz;
                headGroup.add(inner);
            }
            break;
        }
        case 4: { // Halo
            const haloMat = new THREE.MeshBasicMaterial({ color: '#ffe44a' });
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.09, 6, 22), haloMat);
            halo.position.set(0, 2.7, 0);
            halo.rotation.x = 0.2;
            headGroup.add(halo);
            break;
        }
        case 5: { // Horns
            const hornMat = new THREE.MeshPhongMaterial({ color: '#cc2222' });
            for (const [hx, rz] of [[-0.78, -0.3], [0.78, 0.3]]) {
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 5), hornMat);
                horn.position.set(hx, 2.1, 0.3);
                horn.rotation.z = rz;
                headGroup.add(horn);
            }
            break;
        }
    }
}

// ── ANIMATION ─────────────────────────────────────────────────────────────────
export function animateChibi(group, isMoving, dt, isRunning = false, isJumping = false, danceId = 0) {
    const parts = group._parts;
    if (!parts) return;

    // Helper: reset arm z-rotation (used when leaving dance states)
    const resetArmZ = () => {
        if (parts.arms.left)  parts.arms.left.rotation.z  = 0;
        if (parts.arms.right) parts.arms.right.rotation.z = 0;
    };

    if (isJumping) {
        // ── JUMP POSE ──
        if (parts.arms.left)  { parts.arms.left.rotation.x  = -0.4; parts.arms.left.rotation.z  = -1.1; }
        if (parts.arms.right) { parts.arms.right.rotation.x = -0.4; parts.arms.right.rotation.z  =  1.1; }
        parts.body.position.y = 2.15;
        parts.body.scale.y    = 0.92;
        parts.body.rotation.z = 0;
        parts.headGroup.position.y = 4.35;
        parts.headGroup.rotation.x = -0.15;
        parts.headGroup.rotation.z = 0;

    } else if (danceId === 1) {
        // ── FLOSS DANCE ──
        // Arms swing forward/back alternately; hips sway opposite
        group._dancePhase += dt * 5.2;
        const p = group._dancePhase;
        if (parts.arms.left)  { parts.arms.left.rotation.x  =  Math.sin(p) * 1.15; parts.arms.left.rotation.z  = -0.35 + Math.cos(p) * 0.3; }
        if (parts.arms.right) { parts.arms.right.rotation.x = -Math.sin(p) * 1.15; parts.arms.right.rotation.z =  0.35 - Math.cos(p) * 0.3; }
        parts.body.rotation.z      =  Math.sin(p) * 0.24;
        parts.body.position.y      = 2.15 + Math.abs(Math.sin(p * 2)) * 0.14;
        parts.body.scale.y         = 1;
        parts.headGroup.rotation.z = -Math.sin(p) * 0.09;
        parts.headGroup.rotation.x = 0;
        parts.headGroup.position.y = 4.35;

    } else if (danceId === 2) {
        // ── GANGNAM STYLE ──
        // Rapid bounce + one arm circles overhead (lasso), other holds rein
        group._dancePhase += dt * 7.5;
        const p = group._dancePhase;
        if (parts.arms.left)  { parts.arms.left.rotation.x  = -0.85 + Math.sin(p) * 0.35;        parts.arms.left.rotation.z  = -0.7; }
        if (parts.arms.right) { parts.arms.right.rotation.x = -1.35 + Math.sin(p + 1.0) * 0.35;  parts.arms.right.rotation.z =  0.7 + Math.cos(p) * 0.45; }
        parts.body.position.y      = 2.15 + Math.abs(Math.sin(p)) * 0.32;
        parts.body.rotation.z      = Math.sin(p * 0.5) * 0.14;
        parts.body.scale.y         = 1;
        parts.headGroup.position.y = 4.35 + Math.abs(Math.sin(p)) * 0.14;
        parts.headGroup.rotation.z = 0;
        parts.headGroup.rotation.x = 0;

    } else if (danceId === 3) {
        // ── MACARENA ──
        // 8-beat arm sequence with hip shake on final two beats
        group._dancePhase += dt * 3.2;
        const p = group._dancePhase;
        const beat = Math.floor(p / (Math.PI * 0.5)) % 8;
        // [leftX, leftZ, rightX, rightZ] per beat
        const poses = [
            [-0.18,  0.0,  -1.3,  0.5],   // 0: right arm extends forward
            [-1.3,  -0.5,  -0.18, 0.0],   // 1: left arm extends forward
            [-0.18,  0.0,  -1.3,  0.5],   // 2: right palm turns (visual repeat)
            [-1.3,  -0.5,  -0.18, 0.0],   // 3: left palm turns
            [-0.5,  -0.65, -1.3,  0.6],   // 4: right hand to left shoulder
            [-1.3,  -0.6,  -0.5,  0.65],  // 5: left hand to right shoulder
            [-0.45, -0.85, -0.45, 0.85],  // 6: both hands behind head + hip shake
            [-0.45, -0.85, -0.45, 0.85],  // 7: hip shake continues
        ];
        const [lx, lz, rx, rz] = poses[beat];
        if (parts.arms.left)  { parts.arms.left.rotation.x  = lx; parts.arms.left.rotation.z  = lz; }
        if (parts.arms.right) { parts.arms.right.rotation.x = rx; parts.arms.right.rotation.z = rz; }
        parts.body.rotation.z      = (beat >= 6) ? Math.sin(p * 4) * 0.3 : Math.sin(p * 2) * 0.1;
        parts.body.position.y      = 2.15;
        parts.body.scale.y         = 1;
        parts.headGroup.position.y = 4.35;
        parts.headGroup.rotation.z = Math.sin(p * 2) * 0.05;
        parts.headGroup.rotation.x = 0;

    } else if (isMoving) {
        // ── WALK / RUN ──
        const phaseSpeed = isRunning ? 15 : 8;
        const armSwing   = isRunning ? 0.85 : 0.55;
        const bodyBob    = isRunning ? 0.20 : 0.12;
        const headBob    = isRunning ? 0.10 : 0.06;

        group._walkPhase += dt * phaseSpeed;
        const p = group._walkPhase;
        if (parts.arms.left)  { parts.arms.left.rotation.x  =  Math.sin(p) * armSwing; parts.arms.left.rotation.z  = 0; }
        if (parts.arms.right) { parts.arms.right.rotation.x = -Math.sin(p) * armSwing; parts.arms.right.rotation.z = 0; }
        parts.body.position.y      = 2.15 + Math.abs(Math.sin(p * 2)) * bodyBob;
        parts.body.scale.y         = 1;
        parts.body.rotation.z      = 0;
        parts.headGroup.position.y = 4.35 + Math.abs(Math.sin(p * 2)) * headBob;
        parts.headGroup.rotation.x = 0;
        parts.headGroup.rotation.z = 0;

    } else {
        // ── IDLE ──
        group._idlePhase += dt * 1.8;
        const p = group._idlePhase;
        resetArmZ();
        if (parts.arms.left)  parts.arms.left.rotation.x  = 0;
        if (parts.arms.right) parts.arms.right.rotation.x = 0;
        parts.body.scale.y         = 1 + Math.sin(p) * 0.018;
        parts.body.position.y      = 2.15;
        parts.body.rotation.z      = 0;
        parts.headGroup.position.y = 4.35 + Math.sin(p) * 0.045;
        parts.headGroup.rotation.x = 0;
        parts.headGroup.rotation.z = 0;
    }
}

export function updateChibiAvatar(group, options) {
    // Caller should replace the old group with a new buildChibi() call
}
