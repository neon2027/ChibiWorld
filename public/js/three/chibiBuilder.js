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
        eye:    new THREE.MeshPhongMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.2 }),
        white:  new THREE.MeshPhongMaterial({ color: '#ffffff' }),
        shoe:   new THREE.MeshPhongMaterial({ color: '#222222' }),
        blush:  new THREE.MeshBasicMaterial({ color: '#ff9999', transparent: true, opacity: 0.45 }),
        mouth:  new THREE.MeshPhongMaterial({ color: '#ff9999' }),
    };

    // === SHOES ===
    for (const sx of [-0.55, 0.55]) {
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), mat.shoe);
        shoe.position.set(sx, 0.28, 0.12);
        shoe.castShadow = true;
        group.add(shoe);
    }

    // === LEGS ===
    for (const sx of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.7, 6, 10), mat.outfit);
        leg.position.set(sx, 1.05, 0);
        leg.castShadow = true;
        group.add(leg);
    }

    // === BODY ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 1.3, 8, 16), mat.outfit);
    body.position.y = 2.55;
    body.castShadow = true;
    group.add(body);

    // === ARMS ===
    const arms = {};
    for (const [side, sx] of [['left', -1.5], ['right', 1.5]]) {
        const armGroup = new THREE.Group();
        armGroup.position.set(sx, 3.1, 0);

        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.85, 6, 10), mat.outfit);
        arm.position.y = -0.55;
        arm.castShadow = true;
        armGroup.add(arm);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), mat.skin);
        hand.position.y = -1.1;
        armGroup.add(hand);

        group.add(armGroup);
        arms[side] = armGroup;
    }

    // === HEAD ===
    const headGroup = new THREE.Group();
    headGroup.position.y = 4.7;

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.58, 20, 14), mat.skin);
    head.castShadow = true;
    headGroup.add(head);

    // Eyes (left -0.52, right 0.52)
    for (const [ex, sign] of [[-0.52, -1], [0.52, 1]]) {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat.white);
        eyeWhite.position.set(ex, 0.12, 1.38);
        eyeWhite.scale.set(1, 1.25, 0.45);
        headGroup.add(eyeWhite);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat.eye);
        pupil.position.set(ex, 0.12, 1.52);
        pupil.scale.set(1, 1.25, 0.45);
        headGroup.add(pupil);

        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), mat.white);
        shine.position.set(ex + 0.1 * sign, 0.22, 1.57);
        headGroup.add(shine);
    }

    // Mouth (small smile arc)
    const mouthGeo = new THREE.TorusGeometry(0.19, 0.055, 4, 8, Math.PI);
    const mouth = new THREE.Mesh(mouthGeo, mat.mouth);
    mouth.position.set(0, -0.38, 1.43);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);

    // Blush circles
    for (const bx of [-0.72, 0.72]) {
        const blush = new THREE.Mesh(new THREE.CircleGeometry(0.23, 10), mat.blush);
        blush.position.set(bx, -0.12, 1.41);
        headGroup.add(blush);
    }

    // Hair
    _buildHair(headGroup, hairStyle, mat.hair);

    // Accessory
    _buildAccessory(headGroup, accessory);

    group.add(headGroup);

    // Store refs for animation
    group._parts = { body, headGroup, arms, legs: group.children.filter(c => c !== body && c !== headGroup && c.position?.y > 0.5 && c.position?.y < 2) };
    group._walkPhase = 0;
    group._idlePhase = Math.random() * Math.PI * 2;

    return group;
}

function _buildHair(headGroup, style, material) {
    const geo = (s) => new THREE.SphereGeometry(s, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);

    switch (style) {
        case 0: { // Short
            const cap = new THREE.Mesh(geo(1.65), material);
            cap.position.y = 0.12;
            headGroup.add(cap);
            break;
        }
        case 1: { // Long
            const cap = new THREE.Mesh(geo(1.65), material);
            cap.position.y = 0.12;
            headGroup.add(cap);
            const drape = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.4, 0.55), material);
            drape.position.set(0, -0.9, -1.2);
            headGroup.add(drape);
            break;
        }
        case 2: { // Pigtails
            const cap = new THREE.Mesh(geo(1.65), material);
            cap.position.y = 0.12;
            headGroup.add(cap);
            for (const [px, rz] of [[-1.7, 0.4], [1.7, -0.4]]) {
                const tail = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 7), material);
                tail.position.set(px, 0.2, -0.5);
                tail.rotation.z = rz;
                headGroup.add(tail);
            }
            break;
        }
        case 3: { // Spiky
            const cap = new THREE.Mesh(geo(1.62), material);
            cap.position.y = 0.05;
            headGroup.add(cap);
            for (let i = 0; i < 7; i++) {
                const angle = (i / 7) * Math.PI * 2;
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 5), material);
                spike.position.set(Math.cos(angle) * 1.05, 1.2, Math.sin(angle) * 1.05);
                spike.rotation.z = Math.cos(angle) * 0.45;
                spike.rotation.x = -Math.sin(angle) * 0.45;
                headGroup.add(spike);
            }
            break;
        }
        case 4: { // Bun
            const cap = new THREE.Mesh(geo(1.65), material);
            cap.position.y = 0.12;
            headGroup.add(cap);
            const bun = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), material);
            bun.position.set(0, 1.65, -0.3);
            headGroup.add(bun);
            break;
        }
    }
}

function _buildAccessory(headGroup, type) {
    switch (type) {
        case 1: { // Glasses
            const glassMat = new THREE.MeshPhongMaterial({ color: '#2a2a2a' });
            for (const gx of [-0.52, 0.52]) {
                const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 12), glassMat);
                rim.position.set(gx, 0.12, 1.54);
                headGroup.add(rim);
            }
            const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 4), glassMat);
            bridge.position.set(0, 0.12, 1.54);
            bridge.rotation.z = Math.PI / 2;
            headGroup.add(bridge);
            break;
        }
        case 2: { // Bow
            const bowMat = new THREE.MeshPhongMaterial({ color: '#ff3366' });
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), bowMat);
            center.position.set(1.3, 0.9, 0.2);
            headGroup.add(center);
            for (const [wx, wy] of [[-0.4, 0.15], [0.4, 0.15]]) {
                const wing = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), bowMat);
                wing.position.set(1.3 + wx, 0.9 + wy, 0.2);
                wing.scale.set(1.3, 0.65, 0.5);
                headGroup.add(wing);
            }
            break;
        }
        case 3: { // Cat ears
            const earMat = new THREE.MeshPhongMaterial({ color: '#ffccaa' });
            const innerMat = new THREE.MeshPhongMaterial({ color: '#ffaaaa' });
            for (const [cx, rz] of [[-0.75, -0.2], [0.75, 0.2]]) {
                const ear = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.82, 4), earMat);
                ear.position.set(cx, 1.85, 0.2);
                ear.rotation.z = rz;
                headGroup.add(ear);
                const inner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), innerMat);
                inner.position.set(cx, 1.85, 0.22);
                inner.rotation.z = rz;
                headGroup.add(inner);
            }
            break;
        }
        case 4: { // Halo
            const haloMat = new THREE.MeshBasicMaterial({ color: '#ffe44a' });
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.08, 6, 20), haloMat);
            halo.position.set(0, 2.25, 0);
            halo.rotation.x = 0.2;
            headGroup.add(halo);
            break;
        }
        case 5: { // Horns
            const hornMat = new THREE.MeshPhongMaterial({ color: '#cc2222' });
            for (const [hx, rz] of [[-0.65, -0.3], [0.65, 0.3]]) {
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.72, 5), hornMat);
                horn.position.set(hx, 1.72, 0.3);
                horn.rotation.z = rz;
                headGroup.add(horn);
            }
            break;
        }
    }
}

export function animateChibi(group, isMoving, dt, isRunning = false) {
    const parts = group._parts;
    if (!parts) return;

    if (isMoving) {
        const phaseSpeed = isRunning ? 15 : 8;
        const armSwing   = isRunning ? 0.85 : 0.55;
        const bodyBob    = isRunning ? 0.20 : 0.12;
        const headBob    = isRunning ? 0.10 : 0.06;

        group._walkPhase += dt * phaseSpeed;
        const p = group._walkPhase;
        if (parts.arms.left)  parts.arms.left.rotation.x  =  Math.sin(p) * armSwing;
        if (parts.arms.right) parts.arms.right.rotation.x = -Math.sin(p) * armSwing;
        parts.body.position.y = 2.55 + Math.abs(Math.sin(p * 2)) * bodyBob;
        parts.headGroup.position.y = 4.7 + Math.abs(Math.sin(p * 2)) * headBob;
    } else {
        group._idlePhase += dt * 1.8;
        const p = group._idlePhase;
        parts.body.scale.y = 1 + Math.sin(p) * 0.018;
        parts.headGroup.position.y = 4.7 + Math.sin(p) * 0.045;
    }
}

export function updateChibiAvatar(group, options) {
    // For live preview updates — dispose and rebuild
    // (simple approach: rebuild the chibi in place)
    // Caller should replace the old group with a new buildChibi() call
}
