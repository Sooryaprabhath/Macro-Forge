import * as THREE from 'three';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Flat two-colour palette: volt lime + electric violet
const LIME = '#c8ff2e', VIOLET = '#7b61ff';
export const PALETTES = {
  cut: { a: LIME, b: VIOLET, c: LIME },
  maintain: { a: LIME, b: VIOLET, c: LIME },
  bulk: { a: LIME, b: VIOLET, c: LIME },
};

export function createBackground(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05060a');
  scene.fog = new THREE.FogExp2('#05060a', 0.045);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const palette = PALETTES.maintain;
  const colA = new THREE.Color(palette.a), colB = new THREE.Color(palette.b), colC = new THREE.Color(palette.c);
  const tA = colA.clone(), tB = colB.clone(), tC = colC.clone();

  // ---------- Energy core (noise-displaced blob) ----------
  const uniforms = {
    uTime: { value: 0 },
    uA: { value: colA },
    uB: { value: colB },
    uC: { value: colC },
    uAmp: { value: 0.35 },
    uFreq: { value: 1.1 },
    uPulse: { value: 0 },
    uDim: { value: 1 },
  };
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 60),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uPulse;
        varying vec3 vN; varying vec3 vView; varying float vNoise;
        ${NOISE}
        void main(){
          float n = snoise(position * uFreq + vec3(0.0, uTime * 0.35, uTime * 0.2));
          float n2 = snoise(position * uFreq * 2.4 - uTime * 0.25) * 0.35;
          float d = (n + n2) * (uAmp + uPulse * 0.25);
          vNoise = n;
          vec3 p = position + normal * d;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vView = normalize(-mv.xyz);
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uDim;
        varying vec3 vN; varying vec3 vView; varying float vNoise;
        void main(){
          // flat two-tone patches with crisp contour lines (no gradients)
          vec3 col = vNoise > 0.05 ? uA : uB;
          float line = step(0.94, fract(vNoise * 4.0 + uTime * 0.15));
          col = mix(col, vec3(0.02, 0.024, 0.04), line);
          gl_FragColor = vec4(col * uDim, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  const group = new THREE.Group();
  group.add(core);

  // wireframe shell
  const shell = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.35, 2)),
    new THREE.LineBasicMaterial({ color: colA, transparent: true, opacity: 0.12 })
  );
  group.add(shell);

  // orbit rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.7 + i * 0.35, 0.008 + i * 0.002, 8, 220),
      new THREE.MeshBasicMaterial({ color: i === 1 ? colB : colA, transparent: true, opacity: 0.65 - i * 0.15 })
    );
    ring.rotation.set(Math.PI / 2 + (i - 1) * 0.5, i * 0.6, 0);
    group.add(ring);
    rings.push(ring);
  }

  // orbiting satellites on rings
  const sats = rings.map((ring, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: colC }));
    ring.add(s);
    return { s, r: 2.7 + i * 0.35, speed: 0.5 + i * 0.25, off: i * 2 };
  });

  scene.add(group);

  // ---------- Floating dumbbells ----------
  const metal = new THREE.MeshBasicMaterial({ color: VIOLET });
  const accent = new THREE.MeshBasicMaterial({ color: colA });
  function makeDumbbell() {
    const d = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 24), metal);
    bar.rotation.z = Math.PI / 2;
    d.add(bar);
    [-1, 1].forEach((side) => {
      [0, 1, 2].forEach((k) => {
        const r = 0.42 - k * 0.06;
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.13, 40), k === 0 ? accent : metal);
        plate.rotation.z = Math.PI / 2;
        plate.position.x = side * (0.62 + k * 0.15);
        d.add(plate);
      });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 24), metal);
      cap.rotation.z = Math.PI / 2;
      cap.position.x = side * 1.05;
      d.add(cap);
    });
    return d;
  }
  const dumbbells = [
    { pos: [-7.2, 3.6, -5], s: 0.75, spin: [0.3, 0.5, 0.15] },
    { pos: [6.6, -3.4, -3.5], s: 0.9, spin: [-0.2, 0.35, 0.25] },
    { pos: [-1.2, -4.6, -7], s: 0.6, spin: [0.4, -0.3, 0.2] },
  ].map((cfg) => {
    const d = makeDumbbell();
    d.position.set(...cfg.pos);
    d.scale.setScalar(cfg.s);
    d.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(d);
    return { d, ...cfg, base: new THREE.Vector3(...cfg.pos) };
  });

  // ---------- Particles ----------
  const COUNT = 2600;
  const pos = new Float32Array(COUNT * 3), seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = 4 + Math.random() * 14;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph) - 4], i * 3);
    seeds[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uA: uniforms.uA, uB: uniforms.uB, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uPR; varying float vSeed;
      void main(){
        vSeed = aSeed;
        vec3 p = position;
        p.y += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
        p.x += cos(uTime * 0.2 + aSeed * 30.0) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aSeed * 3.5) * uPR * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform float uTime; varying float vSeed;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = 1.0;
        float tw = 0.5 + 0.5 * sin(uTime * 2.0 + vSeed * 50.0);
        gl_FragColor = vec4(vSeed > 0.5 ? uA : uB, a * (0.25 + tw * 0.55));
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // grid floor
  const grid = new THREE.GridHelper(60, 60, colA, colA);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  grid.position.y = -4.5;
  scene.add(grid);

  scene.add(new THREE.AmbientLight('#ffffff', 0.2));
  const key = new THREE.PointLight(colA, 30, 20);
  key.position.set(3, 3, 4);
  scene.add(key);


  // ---------- Interaction ----------
  const mouse = new THREE.Vector2(), smooth = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  });
  let scroll = 0, scrollSmooth = 0;
  const onScroll = () => (scroll = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
  window.addEventListener('scroll', onScroll, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  let pulse = 0;
  const clock = new THREE.Clock();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = reduced ? t * 0.2 : t;
    smooth.lerp(mouse, 0.05);
    scrollSmooth += (scroll - scrollSmooth) * 0.06;

    colA.lerp(tA, 0.04);
    colB.lerp(tB, 0.04);
    colC.lerp(tC, 0.04);
    accent.color.copy(colA);
    key.color.copy(colA);
    grid.material.color.copy(colA);
    shell.material.color.copy(colA);
    rings.forEach((r, i) => r.material.color.copy(i === 1 ? colB : colA));

    const wide = window.innerWidth > 900;
    const dimTarget = (wide ? 0.85 : 0.5) * (1 - Math.min(0.55, scrollSmooth * 1.6));
    uniforms.uDim.value += (dimTarget - uniforms.uDim.value) * 0.08;
    pulse *= 0.95;
    uniforms.uPulse.value = pulse;

    const heroX = wide ? 2.4 : 0;
    const targetX = THREE.MathUtils.lerp(heroX, wide ? -2.8 : 0, Math.min(1, scrollSmooth * 2.2));
    group.position.x += (targetX - group.position.x) * 0.08;
    group.position.y = Math.sin(t * 0.6) * 0.12 + (wide ? 0 : 1.9) - scrollSmooth * 1.5;
    const sc = 1 - Math.min(0.35, scrollSmooth * 0.6) + pulse * 0.08;
    group.scale.setScalar(sc * (wide ? 1 : 0.75));
    group.rotation.y += dt * 0.15;
    group.rotation.x = smooth.y * 0.3;
    group.rotation.z = smooth.x * -0.15;
    core.rotation.y += dt * 0.1;
    shell.rotation.y -= dt * 0.08;
    shell.rotation.x += dt * 0.04;
    sats.forEach(({ s, r, speed, off }) => s.position.set(Math.cos(t * speed + off) * r, Math.sin(t * speed + off) * r, 0));

    dumbbells.forEach(({ d, spin, base }, i) => {
      d.rotation.x += dt * spin[0];
      d.rotation.y += dt * spin[1];
      d.rotation.z += dt * spin[2];
      d.position.y = base.y + Math.sin(t * 0.7 + i * 2) * 0.35 + scrollSmooth * (3 + i * 1.5);
      d.position.x = base.x + smooth.x * (0.4 + i * 0.2);
    });

    points.rotation.y = t * 0.02 + scrollSmooth * 1.2;
    camera.position.x += (smooth.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (smooth.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    setGoal(goal) {
      const p = PALETTES[goal];
      tA.set(p.a);
      tB.set(p.b);
      tC.set(p.c);
      uniforms.uAmp.value = goal === 'bulk' ? 0.45 : goal === 'cut' ? 0.25 : 0.35;
      uniforms.uFreq.value = goal === 'bulk' ? 0.9 : goal === 'cut' ? 1.5 : 1.1;
      pulse = 1;
    },
    pulse() {
      pulse = 1;
    },
  };
}
