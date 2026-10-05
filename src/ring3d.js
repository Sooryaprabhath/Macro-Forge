import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const MACRO_COLORS = { protein: '#c8ff2e', carbs: '#7b61ff', fat: '#eef1f8' };

// 3D macro donut: each macro is a torus arc whose length = share of calories
// and whose thickness/height hints at gram amount.
export function createMacroRing(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 5.4, 7.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.4;

  const root = new THREE.Group();
  scene.add(root);

  // base plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.75, 0.08, 96),
    new THREE.MeshBasicMaterial({ color: '#111320' })
  );
  plate.position.y = -0.45;
  root.add(plate);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(2.68, 0.012, 8, 200), new THREE.MeshBasicMaterial({ color: '#7b61ff' }));
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = -0.4;
  root.add(glowRing);

  scene.add(new THREE.AmbientLight('#ffffff', 0.4));
  const dl = new THREE.DirectionalLight('#ffffff', 1.5);
  dl.position.set(3, 6, 4);
  scene.add(dl);

  const arcs = {};
  Object.entries(MACRO_COLORS).forEach(([k, c]) => {
    const mat = new THREE.MeshBasicMaterial({ color: c });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const edge = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#05060a', side: THREE.BackSide }));
    edge.scale.setScalar(1.0);
    mesh.add(edge);
    mesh.rotation.x = Math.PI / 2;
    root.add(mesh);
    arcs[k] = { mesh, edge, cur: 0, target: 0, tube: 0.38, start: 0 };
  });

  const GAP = 0.08;
  let data = null;
  let t0 = 0;

  function rebuild(progress) {
    let start = 0;
    ['protein', 'carbs', 'fat'].forEach((k) => {
      const a = arcs[k];
      const len = Math.max(0.001, (a.target * Math.PI * 2 - GAP) * progress);
      a.mesh.geometry.dispose();
      a.mesh.geometry = new THREE.TorusGeometry(1.75, a.tube, 32, 160, len);
      a.edge.geometry.dispose();
      a.edge.geometry = new THREE.TorusGeometry(1.75, a.tube + 0.035, 32, 160, len);
      a.mesh.rotation.z = start * progress;
      a.mesh.position.y = a.lift * progress;
      start += a.target * Math.PI * 2;
    });
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(container);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (data) {
      if (data.pending) {
        t0 = t;
        data.pending = false;
      }
      const p = Math.min(1, (t - t0) / 1.6);
      if (p < 1 || !data.done) {
        rebuild(1 - Math.pow(1 - p, 3));
        if (p >= 1) data.done = true;
      }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  return {
    set(result) {
      const grams = { protein: result.protein, carbs: result.carbs, fat: result.fat };
      const maxG = Math.max(...Object.values(grams));
      Object.keys(arcs).forEach((k) => {
        arcs[k].target = result.pct[k];
        arcs[k].tube = 0.22 + (grams[k] / maxG) * 0.26;
        arcs[k].lift = (grams[k] / maxG) * 0.25;
      });
      data = { done: false, pending: true };
    },
  };
}
