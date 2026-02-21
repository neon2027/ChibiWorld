import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// All positions are in Three.js space: center (0,0), range roughly -50 to +50
export function buildPlaza(scene) {
    // Sky + atmosphere
    scene.background = new THREE.Color(0x0d1a0d);
    scene.fog = new THREE.Fog(0x0d1a0d, 65, 115);

    // ── GROUND LAYERS ────────────────────────────────────────────────────
    // Base grass
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x2e6b2e, specular: 0x0d2a0d });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Darker corner grass patches for depth
    const darkGrassMat = new THREE.MeshPhongMaterial({ color: 0x1c4d1c });
    for (const [cx, cz] of [[-28, -28], [28, -28], [-28, 28], [28, 28]]) {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), darkGrassMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(cx, 0.01, cz);
        patch.receiveShadow = true;
        scene.add(patch);
    }

    // Stone path material
    const pathMat = new THREE.MeshPhongMaterial({ color: 0xa89880, specular: 0x554433 });
    const pathBorderMat = new THREE.MeshPhongMaterial({ color: 0x6a5a4a });

    // N–S path
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(6, 100), pathMat);
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.set(0, 0.02, 0);
    pathNS.receiveShadow = true;
    scene.add(pathNS);

    // E–W path
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(100, 6), pathMat);
    pathEW.rotation.x = -Math.PI / 2;
    pathEW.position.set(0, 0.02, 0);
    pathEW.receiveShadow = true;
    scene.add(pathEW);

    // Path edge borders (raised trim strips)
    for (const ox of [-3.1, 3.1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 100), pathBorderMat);
        b.position.set(ox, 0.04, 0);
        scene.add(b);
    }
    for (const oz of [-3.1, 3.1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(100, 0.08, 0.3), pathBorderMat);
        b.position.set(0, 0.04, oz);
        scene.add(b);
    }

    // Cobblestone detail (small alternating boxes along the path)
    const cobbleMat = new THREE.MeshPhongMaterial({ color: 0x998878 });
    const cobbleMat2 = new THREE.MeshPhongMaterial({ color: 0xb8a888 });
    for (let i = -9; i <= 9; i++) {
        for (const side of [-1, 1]) {
            const stone = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 1.4),
                (i + side) % 2 === 0 ? cobbleMat : cobbleMat2);
            stone.position.set(side * 1.5, 0.035, i * 4.5);
            scene.add(stone);
            const stone2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 1.4),
                (i + side) % 2 === 0 ? cobbleMat2 : cobbleMat);
            stone2.position.set(i * 4.5, 0.035, side * 1.5);
            scene.add(stone2);
        }
    }

    // Central plaza circle (stone disk)
    const plazaDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(13, 13, 0.1, 32),
        new THREE.MeshPhongMaterial({ color: 0xc4b49a, specular: 0x776655 })
    );
    plazaDisk.position.set(0, 0.05, 0);
    plazaDisk.receiveShadow = true;
    scene.add(plazaDisk);

    // Plaza ring accent
    const plazaRing = new THREE.Mesh(
        new THREE.TorusGeometry(13, 0.25, 6, 48),
        new THREE.MeshPhongMaterial({ color: 0x776655 })
    );
    plazaRing.rotation.x = Math.PI / 2;
    plazaRing.position.set(0, 0.1, 0);
    scene.add(plazaRing);

    // ── FOUNTAIN (center) ─────────────────────────────────────────────────
    _buildFountain(scene, 0, 0);

    // ── TREES ─────────────────────────────────────────────────────────────
    // Spread trees within bounds, avoiding the stone paths (±3 wide)
    const treePositions = [
        // Far corners
        [-40, -40], [-34, -38], [-38, -34],
        [ 40, -40], [ 34, -38], [ 38, -34],
        [-40,  40], [-34,  38], [-38,  34],
        [ 40,  40], [ 34,  38], [ 38,  34],
        // Mid-sides (offset off the path)
        [-10, -42], [10, -42],
        [-10,  42], [10,  42],
        [-42, -10], [-42, 10],
        [ 42, -10], [ 42, 10],
        // Inner ring (off paths)
        [-18, -18], [18, -18],
        [-18,  18], [18,  18],
        [-22, -8], [22, -8],
        [-22,  8], [22,  8],
        [-8, -22], [ 8, -22],
        [-8,  22], [ 8,  22],
    ];
    for (const [x, z] of treePositions) _buildTree(scene, x, z);

    // ── FLOWER BUSHES ─────────────────────────────────────────────────────
    const flowerColors = [0xff6b8a, 0xff9f43, 0xffd32a, 0x7bed9f, 0x70a1ff, 0xf368e0];
    // Around the plaza rim, in the 4 grass quadrants
    const flowerRing = [
        [-9, -9], [9, -9], [-9, 9], [9, 9],
        [-12, 0], [12, 0], [0, -12], [0, 12],
        [-7, -14], [7, -14], [-7, 14], [7, 14],
        [-14, -7], [14, -7], [-14, 7], [14, 7],
    ];
    for (let i = 0; i < flowerRing.length; i++) {
        const [x, z] = flowerRing[i];
        _buildFlowerBush(scene, x, z, flowerColors[i % flowerColors.length]);
    }

    // ── BENCHES (diagonal from fountain) ─────────────────────────────────
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        _buildBench(scene, Math.cos(angle) * 10, Math.sin(angle) * 10, angle + Math.PI / 2);
    }

    // ── LANTERNS ─────────────────────────────────────────────────────────
    // Near fountain (diagonal at plaza edge)
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        _buildLantern(scene, Math.cos(angle) * 14.5, Math.sin(angle) * 14.5);
    }
    // Along paths
    for (const [x, z] of [[-26, 0], [26, 0], [0, -26], [0, 26], [-40, 0], [40, 0], [0, -40], [0, 40]]) {
        _buildLantern(scene, x, z);
    }

    // ── DECORATIVE ROCKS ─────────────────────────────────────────────────
    for (const [x, z] of [[-16, -5], [16, -5], [-16, 5], [16, 5], [-5, -16], [5, -16], [-5, 16], [5, 16]]) {
        _buildRock(scene, x, z);
    }

    // ── STARS ────────────────────────────────────────────────────────────
    _buildStars(scene);

    // ── BARREL WITH SWORD (background props) ─────────────────────────────
    _loadBarrelProps(scene);
}

// ── BUILDERS ─────────────────────────────────────────────────────────────────

function _buildFountain(scene, x, z) {
    // Outer base ring
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(4.2, 4.8, 0.9, 24),
        new THREE.MeshPhongMaterial({ color: 0x7788aa, specular: 0x9999cc, shininess: 60 })
    );
    base.position.set(x, 0.45, z);
    base.castShadow = true;
    scene.add(base);

    // Inner water basin
    const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(3.8, 3.8, 0.6, 24),
        new THREE.MeshPhongMaterial({ color: 0x556688 })
    );
    basin.position.set(x, 0.7, z);
    scene.add(basin);

    // Water surface
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.6, 0.05, 24),
        new THREE.MeshPhongMaterial({ color: 0x55aaee, transparent: true, opacity: 0.75, specular: 0xaaddff, shininess: 120 })
    );
    water.position.set(x, 1.02, z);
    scene.add(water);

    // Center pillar
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 3.2, 10),
        new THREE.MeshPhongMaterial({ color: 0x7788aa })
    );
    pillar.position.set(x, 1.6, z);
    pillar.castShadow = true;
    scene.add(pillar);

    // Upper bowl (torus)
    const bowl = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.3, 8, 20),
        new THREE.MeshPhongMaterial({ color: 0x8899bb })
    );
    bowl.position.set(x, 3.3, z);
    scene.add(bowl);

    // Water droplets arcing outward
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const drop = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0x99ddff })
        );
        const r = 0.8 + (i % 3) * 0.3;
        drop.position.set(x + Math.cos(angle) * r, 3.6 + Math.sin(i * 1.3) * 0.4, z + Math.sin(angle) * r);
        scene.add(drop);
    }

    // Fountain glow
    const light = new THREE.PointLight(0x44aaff, 2.0, 18);
    light.position.set(x, 2.5, z);
    scene.add(light);
}

function _buildTree(scene, x, z) {
    const trunkH = 1.8 + Math.random() * 1.2;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.32, trunkH, 8),
        new THREE.MeshPhongMaterial({ color: 0x5c3d1e })
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Three layered cones (pine tree shape)
    const leafColors = [0x1e5c30, 0x2d7a40, 0x3d9a52];
    for (let i = 0; i < 3; i++) {
        const r = 2.0 - i * 0.45;
        const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(r, 2.0, 8),
            new THREE.MeshPhongMaterial({ color: leafColors[i] })
        );
        leaf.position.set(x, trunkH + i * 1.3 + 0.7, z);
        leaf.castShadow = true;
        scene.add(leaf);
    }
}

function _buildFlowerBush(scene, x, z, color) {
    // Green bush base
    const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 7, 5),
        new THREE.MeshPhongMaterial({ color: 0x3a7a3a })
    );
    bush.position.set(x, 0.4, z);
    bush.castShadow = true;
    scene.add(bush);

    // Flower blooms on top
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const bloom = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 6, 5),
            new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
        );
        bloom.position.set(
            x + Math.cos(angle) * 0.4,
            0.75 + Math.random() * 0.15,
            z + Math.sin(angle) * 0.4
        );
        scene.add(bloom);
    }
    // Center bloom
    const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 6, 5),
        new THREE.MeshPhongMaterial({ color: 0xffff88, emissive: 0xaaaa00, emissiveIntensity: 0.2 })
    );
    center.position.set(x, 0.85, z);
    scene.add(center);
}

function _buildBench(scene, x, z, rotY = 0) {
    const mat = new THREE.MeshPhongMaterial({ color: 0x8b6914 });
    const legMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

    // Seat slats
    for (let s = -1; s <= 1; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.18), mat);
        slat.position.set(x, 0.68, z);
        slat.rotation.y = rotY;
        slat.translateZ(s * 0.2);
        slat.castShadow = true;
        scene.add(slat);
    }

    // Back rest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.12), mat);
    back.position.set(x, 1.12, z);
    back.rotation.y = rotY;
    back.castShadow = true;
    scene.add(back);

    // Legs
    for (const lx of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.5), legMat);
        leg.position.set(x, 0.32, z);
        leg.rotation.y = rotY;
        leg.translateX(lx * 1.0);
        leg.castShadow = true;
        scene.add(leg);
    }
}

function _buildLantern(scene, x, z) {
    // Base plate
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.15, 8),
        new THREE.MeshPhongMaterial({ color: 0x2a3344 })
    );
    base.position.set(x, 0.075, z);
    scene.add(base);

    // Pole
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8),
        new THREE.MeshPhongMaterial({ color: 0x2a3344 })
    );
    pole.position.set(x, 2.25, z);
    scene.add(pole);

    // Lamp housing
    const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8),
        new THREE.MeshPhongMaterial({ color: 0x223355 })
    );
    housing.position.set(x, 4.55, z);
    scene.add(housing);

    // Lamp glow sphere
    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe4a0 })
    );
    lamp.position.set(x, 4.55, z);
    scene.add(lamp);

    // Cap
    const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.35, 8),
        new THREE.MeshPhongMaterial({ color: 0x2a3344 })
    );
    cap.position.set(x, 4.97, z);
    scene.add(cap);

    const light = new THREE.PointLight(0xffe4a0, 0.9, 12);
    light.position.set(x, 4.5, z);
    scene.add(light);
}

function _buildRock(scene, x, z) {
    const mat = new THREE.MeshPhongMaterial({ color: 0x6a6a5a, specular: 0x333322 });
    const scale = 0.3 + Math.random() * 0.3;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), mat);
    rock.position.set(x, scale * 0.5, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    scene.add(rock);
}

function _buildStars(scene) {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    for (let i = 0; i < 400; i++) {
        verts.push(
            (Math.random() - 0.5) * 220,
            22 + Math.random() * 50,
            (Math.random() - 0.5) * 220
        );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.7 }));
    scene.add(stars);
}

function _loadBarrelProps(scene) {
    // Scatter barrel-with-sword props around the outer plaza edges as atmosphere.
    // Positions [x, z, rotY] — kept well outside the play area.
    const placements = [
        [ 38, -36,  0.4],
        [-38, -36, -0.4],
        [ 38,  36,  2.8],
        [-38,  36,  2.4],
        [  0, -44,  0.0],
        [  0,  44,  Math.PI],
    ];

    const loader = new GLTFLoader();
    loader.load('/assets/barrel-with-sword.glb', (gltf) => {
        placements.forEach(([x, z, rotY]) => {
            const clone = gltf.scene.clone(true);
            clone.position.set(x, 0, z);
            clone.rotation.y = rotY;
            clone.scale.setScalar(0.7);
            clone.traverse((node) => {
                if (node.isMesh) node.castShadow = true;
            });
            scene.add(clone);
        });
    });
}

// ── COORDINATE UTILITIES ──────────────────────────────────────────────────────
// World coords (0–100)  ↔  Three.js coords (–50…+50)
export function worldToThree(wx, wz) {
    return { x: wx - 50, z: wz - 50 };
}

export function threeToWorld(tx, tz) {
    return { x: tx + 50, z: tz + 50 };
}

// ── COLLISION CIRCLES ─────────────────────────────────────────────────────────
// Returns an array of { x, z, r } circles in Three.js space covering every
// static object in the plaza. Used by InputController for push-out collision.
export function getPlazaColliders() {
    const c = [];

    // Fountain base (outer ring radius 4.8)
    c.push({ x: 0, z: 0, r: 5.0 });

    // Trees
    const treePts = [
        [-40,-40],[-34,-38],[-38,-34],
        [ 40,-40],[ 34,-38],[ 38,-34],
        [-40, 40],[-34, 38],[-38, 34],
        [ 40, 40],[ 34, 38],[ 38, 34],
        [-10,-42],[10,-42],[-10,42],[10,42],
        [-42,-10],[-42,10],[42,-10],[42,10],
        [-18,-18],[18,-18],[-18,18],[18,18],
        [-22,-8],[22,-8],[-22,8],[22,8],
        [-8,-22],[8,-22],[-8,22],[8,22],
    ];
    for (const [x, z] of treePts) c.push({ x, z, r: 1.3 });

    // Lanterns — 4 diagonal near fountain
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        c.push({ x: Math.cos(a) * 14.5, z: Math.sin(a) * 14.5, r: 0.45 });
    }
    // Lanterns along paths
    for (const [x, z] of [[-26,0],[26,0],[0,-26],[0,26],[-40,0],[40,0],[0,-40],[0,40]]) {
        c.push({ x, z, r: 0.45 });
    }

    // Benches (diagonal from fountain, radius ~10)
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        c.push({ x: Math.cos(a) * 10, z: Math.sin(a) * 10, r: 1.4 });
    }

    // Decorative rocks
    for (const [x, z] of [[-16,-5],[16,-5],[-16,5],[16,5],[-5,-16],[5,-16],[-5,16],[5,16]]) {
        c.push({ x, z, r: 0.7 });
    }

    // Barrel props (outer edges)
    for (const [x, z] of [[38,-36],[-38,-36],[38,36],[-38,36],[0,-44],[0,44]]) {
        c.push({ x, z, r: 1.2 });
    }

    return c;
}
