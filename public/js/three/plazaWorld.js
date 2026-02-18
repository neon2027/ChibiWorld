import * as THREE from 'three';

export function buildPlaza(scene) {
    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100, 20, 20),
        new THREE.MeshPhongMaterial({ color: 0x1e2a4a, specular: 0x111133 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid lines on ground
    const gridHelper = new THREE.GridHelper(100, 20, 0x2a3a6a, 0x1e2a5a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Background sky
    scene.background = new THREE.Color(0x0d0d1a);
    scene.fog = new THREE.Fog(0x0d0d1a, 60, 120);

    // Central fountain
    _buildFountain(scene, 50, 50);

    // Trees around perimeter
    const treePositions = [
        [30, 30], [70, 30], [30, 70], [70, 70],
        [50, 20], [50, 80], [20, 50], [80, 50],
        [25, 45], [75, 45], [25, 55], [75, 55]
    ];
    for (const [x, z] of treePositions) _buildTree(scene, x, z);

    // Benches near fountain
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        _buildBench(scene, 50 + Math.cos(angle) * 8, 50 + Math.sin(angle) * 8, angle);
    }

    // Star/light particles
    _buildStars(scene);

    // Street lanterns
    const lanternPositions = [[35, 35], [65, 35], [35, 65], [65, 65]];
    for (const [x, z] of lanternPositions) _buildLantern(scene, x, z);
}

function _buildFountain(scene, x, z) {
    // Base ring
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4.5, 0.8, 20),
        new THREE.MeshPhongMaterial({ color: 0x445588, specular: 0x8888cc, shininess: 60 })
    );
    base.position.set(x, 0.4, z);
    base.castShadow = true;
    scene.add(base);

    // Water surface
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.6, 0.1, 20),
        new THREE.MeshPhongMaterial({ color: 0x4488cc, transparent: true, opacity: 0.7, specular: 0xaaddff, shininess: 100 })
    );
    water.position.set(x, 0.85, z);
    scene.add(water);

    // Center pillar
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 3, 10),
        new THREE.MeshPhongMaterial({ color: 0x556699 })
    );
    pillar.position.set(x, 1.5, z);
    pillar.castShadow = true;
    scene.add(pillar);

    // Top bowl
    const bowl = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.35, 8, 20),
        new THREE.MeshPhongMaterial({ color: 0x6677aa })
    );
    bowl.position.set(x, 3.2, z);
    scene.add(bowl);

    // Water sparkle spheres
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const drop = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0x88ccff })
        );
        drop.position.set(x + Math.cos(angle) * 1.4, 3.5 + Math.sin(i) * 0.3, z + Math.sin(angle) * 1.4);
        scene.add(drop);
    }

    // Fountain point light
    const light = new THREE.PointLight(0x4499ff, 1.5, 15);
    light.position.set(x, 2, z);
    scene.add(light);
}

function _buildTree(scene, x, z) {
    const trunkH = 2 + Math.random() * 1.5;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, trunkH, 8),
        new THREE.MeshPhongMaterial({ color: 0x5c3d1e })
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Layered leaves
    const leafColors = [0x2d6a4f, 0x40916c, 0x52b788];
    for (let i = 0; i < 3; i++) {
        const r = 1.8 - i * 0.4;
        const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(r, 1.8, 8),
            new THREE.MeshPhongMaterial({ color: leafColors[i] })
        );
        leaf.position.set(x, trunkH + i * 1.2 + 0.6, z);
        leaf.castShadow = true;
        scene.add(leaf);
    }
}

function _buildBench(scene, x, z, rotY = 0) {
    const mat = new THREE.MeshPhongMaterial({ color: 0x8b6914 });
    const legMat = new THREE.MeshPhongMaterial({ color: 0x555555 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), mat);
    seat.position.set(x, 0.65, z);
    seat.rotation.y = rotY;
    seat.castShadow = true;
    scene.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.14), mat);
    back.position.set(x, 1.1, z);
    back.rotation.y = rotY;
    back.castShadow = true;
    scene.add(back);
}

function _buildLantern(scene, x, z) {
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x334455 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 8), poleMat);
    pole.position.set(x, 2, z);
    scene.add(pole);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe4b5 }));
    lamp.position.set(x, 4.2, z);
    scene.add(lamp);

    const light = new THREE.PointLight(0xffe4b5, 0.8, 10);
    light.position.set(x, 4, z);
    scene.add(light);
}

function _buildStars(scene) {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    for (let i = 0; i < 300; i++) {
        verts.push(
            (Math.random() - 0.5) * 200,
            20 + Math.random() * 40,
            (Math.random() - 0.5) * 200
        );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.6 }));
    scene.add(stars);
}

// World<->3D coordinate conversion (world is 0-100, three is centered around 50,50 mapped to 0,0)
export function worldToThree(wx, wz) {
    return { x: wx - 50, z: wz - 50 };
}

export function threeToWorld(tx, tz) {
    return { x: tx + 50, z: tz + 50 };
}
