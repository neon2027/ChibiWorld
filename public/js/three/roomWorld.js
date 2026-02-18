import * as THREE from 'three';

const ROOM_W = 12, ROOM_H = 5, ROOM_D = 10;

const FURNITURE_ICONS = {
    couch: '🛋️', chair: '🪑', table: '🪵', lamp: '💡', plant: '🪴',
    rug: '🔲', bookshelf: '📚', bed: '🛏️', poster: '🖼️', clock: '🕐',
    tv: '📺', fish_tank: '🐟'
};
export { FURNITURE_ICONS };

export function buildRoom(scene, theme = 'default') {
    const themes = {
        default: { wall: 0x2a2a4a, floor: 0x1e1e3a, trim: 0xff7eb3 },
        sunset:  { wall: 0x4a2a2a, floor: 0x3a1a1a, trim: 0xff9966 },
        ocean:   { wall: 0x1a3a4a, floor: 0x1a2a3a, trim: 0x4488cc },
        forest:  { wall: 0x1a3a2a, floor: 0x1a2a1a, trim: 0x44aa55 },
        candy:   { wall: 0x4a1a4a, floor: 0x3a1a3a, trim: 0xff44ff }
    };
    const t = themes[theme] || themes.default;

    scene.background = new THREE.Color(0x0a0a1e);

    const wallMat  = new THREE.MeshPhongMaterial({ color: t.wall });
    const floorMat = new THREE.MeshPhongMaterial({ color: t.floor, specular: 0x111122 });
    const trimMat  = new THREE.MeshPhongMaterial({ color: t.trim, emissive: t.trim, emissiveIntensity: 0.15 });

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.3, ROOM_D), floorMat);
    floor.position.set(ROOM_W / 2, -0.15, ROOM_D / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.3), wallMat);
    backWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, ROOM_H, ROOM_D), wallMat);
    leftWall.position.set(0, ROOM_H / 2, ROOM_D / 2);
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, ROOM_H, ROOM_D), wallMat);
    rightWall.position.set(ROOM_W, ROOM_H / 2, ROOM_D / 2);
    scene.add(rightWall);

    // Ceiling trim line
    const trimLine = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.15, 0.15), trimMat);
    trimLine.position.set(ROOM_W / 2, ROOM_H - 0.1, 0.1);
    scene.add(trimLine);

    // Lighting
    const ambient = new THREE.AmbientLight(0x8888cc, 0.7);
    scene.add(ambient);

    const ceiling = new THREE.PointLight(0xffeedd, 1.2, 18);
    ceiling.position.set(ROOM_W / 2, ROOM_H - 0.3, ROOM_D / 2);
    ceiling.castShadow = true;
    scene.add(ceiling);
}

// Build a single furniture mesh from item_type and color
export function buildFurnitureMesh(itemType, color = '#ffffff') {
    const mat = new THREE.MeshPhongMaterial({ color, specular: 0x333333, shininess: 20 });
    const darkMat = new THREE.MeshPhongMaterial({ color: darken(color, 0.4) });

    const group = new THREE.Group();
    group.userData.itemType = itemType;

    switch (itemType) {
        case 'couch': {
            const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.0), mat);
            base.position.y = 0.25;
            group.add(base);
            const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.3), mat);
            back.position.set(0, 0.75, -0.35);
            group.add(back);
            for (const ax of [-1.0, 1.0]) {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 1.0), mat);
                arm.position.set(ax, 0.55, 0);
                group.add(arm);
            }
            break;
        }
        case 'chair': {
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), mat);
            seat.position.y = 0.8;
            group.add(seat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.1), mat);
            back.position.set(0, 1.25, -0.4);
            group.add(back);
            for (const [lx, lz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), darkMat);
                leg.position.set(lx, 0.4, lz);
                group.add(leg);
            }
            break;
        }
        case 'table': {
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), mat);
            top.position.y = 0.85;
            group.add(top);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.85, 8), darkMat);
            leg.position.y = 0.425;
            group.add(leg);
            break;
        }
        case 'lamp': {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.1, 8), darkMat);
            group.add(base);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), darkMat);
            pole.position.y = 0.8;
            group.add(pole);
            const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 10, 1, true), mat);
            shade.position.y = 1.7;
            group.add(shade);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffeeaa }));
            bulb.position.y = 1.55;
            group.add(bulb);
            const light = new THREE.PointLight(0xffeeaa, 0.8, 5);
            light.position.y = 1.6;
            group.add(light);
            break;
        }
        case 'plant': {
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
            pot.position.y = 0.225;
            group.add(pot);
            const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 10), new THREE.MeshPhongMaterial({ color: 0x3a2000 }));
            soil.position.y = 0.45;
            group.add(soil);
            for (const [px, py, pz, r] of [[0, 0.9, 0, 0.38], [-0.2, 0.75, 0.1, 0.25], [0.2, 0.7, -0.1, 0.25]]) {
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
                leaf.position.set(px, py, pz);
                group.add(leaf);
            }
            break;
        }
        case 'rug': {
            const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.04, 20), mat);
            rug.position.y = 0.02;
            group.add(rug);
            const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.05, 20), darkMat);
            inner.position.y = 0.025;
            group.add(inner);
            break;
        }
        case 'bookshelf': {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.4), darkMat);
            frame.position.y = 1.0;
            group.add(frame);
            const bookColors = [0xff6b6b, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xf72585];
            for (let s = 0; s < 3; s++) {
                for (let i = 0; i < 4; i++) {
                    const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.32), new THREE.MeshPhongMaterial({ color: bookColors[(s * 4 + i) % bookColors.length] }));
                    book.position.set(-0.42 + i * 0.26, 0.3 + s * 0.6, 0);
                    group.add(book);
                }
            }
            break;
        }
        case 'bed': {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.6), darkMat);
            frame.position.y = 0.3;
            group.add(frame);
            const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 2.2), mat);
            mattress.position.y = 0.575;
            group.add(mattress);
            const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.15), darkMat);
            headboard.position.set(0, 0.75, -1.3);
            group.add(headboard);
            const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshPhongMaterial({ color: 0xffffff }));
            pillow.position.set(0, 0.75, -0.9);
            pillow.scale.set(1.5, 0.5, 1.0);
            group.add(pillow);
            break;
        }
        case 'poster': {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.06), darkMat);
            frame.position.y = 1.5;
            group.add(frame);
            const art = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.4, 0.07), mat);
            art.position.y = 1.5;
            group.add(art);
            break;
        }
        case 'clock': {
            const face = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), mat);
            face.rotation.x = Math.PI / 2;
            face.position.y = 1.2;
            group.add(face);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), darkMat);
            rim.position.y = 1.2;
            group.add(rim);
            break;
        }
        case 'tv': {
            const screen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.1), new THREE.MeshPhongMaterial({ color: 0x111111 }));
            screen.position.y = 1.2;
            group.add(screen);
            const display = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.88, 0.11), new THREE.MeshBasicMaterial({ color: 0x1a1a4a }));
            display.position.y = 1.2;
            group.add(display);
            const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.15), darkMat);
            stand.position.y = 0.5;
            group.add(stand);
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), darkMat);
            base.position.y = 0.3;
            group.add(base);
            break;
        }
        case 'fish_tank': {
            const tank = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.5), new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35, specular: 0xffffff, shininess: 100 }));
            tank.position.y = 0.7;
            group.add(tank);
            const stand2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.6, 0.55), darkMat);
            stand2.position.y = 0.3;
            group.add(stand2);
            const water = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.4), new THREE.MeshPhongMaterial({ color: 0x1166aa, transparent: true, opacity: 0.5 }));
            water.position.y = 0.7;
            group.add(water);
            break;
        }
        default: {
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat);
            box.position.y = 0.4;
            group.add(box);
        }
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
}

function darken(hex, amount) {
    const c = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (c >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((c >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (c & 0xff) - Math.round(255 * amount));
    return (r << 16) | (g << 8) | b;
}

export const ROOM_BOUNDS = { w: ROOM_W, d: ROOM_D };
