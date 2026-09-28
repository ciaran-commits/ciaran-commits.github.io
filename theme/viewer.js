// Interactive 3D viewer for project pages.
// Made automatically from lines like ![Hook tip](models/hook-tip.glb) in project.md.
// Nothing loads until the viewer scrolls near the screen, so pages stay fast.

// The 3D library itself is loaded from the address in base.njk's import map.

document.querySelectorAll(".viewer").forEach((box) => {
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    start(box).catch((err) => {
      console.error(err);
      box.querySelector(".viewer-status").textContent = "The 3D model couldn't load.";
    });
  }, { rootMargin: "300px" });
  io.observe(box);
});

async function start(box) {
  const [THREE, { GLTFLoader }, { OrbitControls }, { toCreasedNormals }, { MeshoptDecoder }] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/controls/OrbitControls.js"),
    import("three/addons/utils/BufferGeometryUtils.js"),
    import("three/addons/libs/meshopt_decoder.module.js"),
  ]);

  const stage = box.querySelector(".viewer-stage");
  const status = box.querySelector(".viewer-status");
  const models = JSON.parse(box.dataset.models);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b9c0, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(2.5, 5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 12 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.1);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // Printed nylon: dark grey and matte.
  const material = new THREE.MeshStandardMaterial({ color: 0x35383d, roughness: 0.92, metalness: 0 });

  // A soft shadow on an invisible floor, so the parts sit on something.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const group = new THREE.Group();
  scene.add(group);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotateSpeed = 1.3;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.52;
  let touching = false, resume;
  controls.addEventListener("start", () => { touching = true; controls.autoRotate = false; clearTimeout(resume); });
  controls.addEventListener("end", () => {
    resume = setTimeout(() => { touching = false; controls.autoRotate = mode !== "all" && !reduce; }, 2500);
  });

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  function load(i) {
    if (!cache.has(i)) {
      cache.set(i, loader.loadAsync(models[i].src).then((gltf) => {
        gltf.scene.updateMatrixWorld(true);
        let mesh;
        gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
        // Unpack the compressed positions into plain numbers at real size (millimetres).
        const p = mesh.geometry.attributes.position;
        const arr = new Float32Array(p.count * 3);
        for (let k = 0; k < p.count; k++) arr.set([p.getX(k), p.getY(k), p.getZ(k)], k * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        geo.setIndex(mesh.geometry.index);
        geo.applyMatrix4(mesh.matrixWorld);
        const g = toCreasedNormals(geo, Math.PI / 5);   // smooth curves, crisp edges
        g.computeBoundingBox();
        const b = g.boundingBox;
        g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); // stand it on the floor
        g.computeBoundingBox();
        return g;
      }));
    }
    return cache.get(i);
  }

  let mode = "all", request = 0, appear = 1;

  async function show(part) {
    const mine = ++request;
    status.hidden = false;
    const picks = part === "all" ? models.map((_, i) => i) : [Number(part)];
    const geos = await Promise.all(picks.map(load));
    if (mine !== request) return;                       // a newer choice arrived while loading
    status.hidden = true;
    mode = part;

    group.clear();
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(1);
    // Parts stand side by side at their true relative sizes.
    const gap = 16;
    const widths = geos.map((g) => g.boundingBox.max.x - g.boundingBox.min.x);
    let cursor = -(widths.reduce((a, w) => a + w, 0) + gap * (widths.length - 1)) / 2;
    geos.forEach((g, i) => {
      const m = new THREE.Mesh(g, material);
      m.castShadow = true;
      m.position.x = cursor + widths[i] / 2;
      cursor += widths[i] + gap;
      group.add(m);
    });

    // Scale everything to a common size and centre it in the frame.
    const sphere = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());
    const s = 1 / sphere.radius;
    group.scale.setScalar(s);
    group.position.set(-sphere.center.x * s, -sphere.center.y * s, -sphere.center.z * s);
    floor.position.y = group.position.y - 0.001;

    const dir = part === "all" && models.length > 1 ? new THREE.Vector3(0, 0.32, 1) : new THREE.Vector3(2.6, 1.2, 3.6);
    camera.position.copy(dir.normalize());
    controls.target.set(0, 0, 0);
    controls.autoRotate = (part !== "all" || models.length === 1) && !reduce && !touching;
    fit();
    appear = reduce ? 1 : 0;
  }

  function fit() {
    const { clientWidth: w, clientHeight: h } = stage;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const margin = mode === "all" && models.length > 1 ? 1.12 : 1.3;
    const dist = margin / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
    camera.position.setLength(dist);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(fit).observe(stage);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    if (appear < 1) {
      appear = Math.min(1, appear + 0.05);
      const e = 1 - Math.pow(1 - appear, 3);
      group.children.forEach((m) => m.scale.setScalar(0.94 + 0.06 * e));
      material.transparent = e < 1;
      material.opacity = e;
    }
    // A row of parts sways gently instead of spinning, so they never hide each other.
    if (mode === "all" && models.length > 1 && !touching && !reduce) group.rotation.y = Math.sin(t * 0.45) * 0.42;
    controls.update();
    renderer.render(scene, camera);
  });

  const buttons = box.querySelectorAll(".viewer-parts button");
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      show(b.dataset.part);
    })
  );

  await show("all");
}
