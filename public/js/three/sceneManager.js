import * as THREE from 'three';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this._animId = null;
        this._callbacks = [];
        this._init();
    }

    _init() {
        const w = this.canvas.clientWidth || 800;
        const h = this.canvas.clientHeight || 600;

        // Camera
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
        this.camera.position.set(0, 12, 20);
        this.camera.lookAt(0, 3, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x0d1a0d);

        // Resize
        this._ro = new ResizeObserver(() => this._resize());
        this._ro.observe(this.canvas.parentElement || document.body);
    }

    _resize() {
        const el = this.canvas.parentElement;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    addLights(type = 'plaza') {
        const ambient = new THREE.AmbientLight(0x88aa88, 0.7);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        this.scene.add(sun);
    }

    onUpdate(cb) {
        this._callbacks.push(cb);
    }

    start() {
        let last = performance.now();
        const loop = (now) => {
            this._animId = requestAnimationFrame(loop);
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            for (const cb of this._callbacks) cb(dt);
            this.renderer.render(this.scene, this.camera);
        };
        this._animId = requestAnimationFrame(loop);
    }

    destroy() {
        cancelAnimationFrame(this._animId);
        this._ro?.disconnect();
        this.renderer.dispose();
    }
}
