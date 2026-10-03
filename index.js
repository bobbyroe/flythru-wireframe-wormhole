import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import spline from './spline.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import GUI from 'lil-gui';

const gui = new GUI()
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(95, w / h, 0.1, 1000);
camera.position.z = 10;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
//
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 1;
bloomPass.radius = 0.1;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// create a line geometry from the spline
const points = spline.getPoints(1000);
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const materialSpline = new THREE.LineBasicMaterial({ color: 0xff0000 });
const line = new THREE.Line(geometry, materialSpline);
scene.add(line);

// create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, 1, 16, true);

// particles
const params = {
  count: 20000,
  size: 0.05,
  spread: 60,
  autoRotate: false,
  autoRotateSpeed: 0.2,
}

let particles = null

const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}particles/1.png`)
texture.colorSpace = THREE.SRGBColorSpace

const materialParticle = new THREE.PointsMaterial({
  size: params.size,
  sizeAttenuation: true,
  map: texture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
})

function buildParticles() {
  if (particles) {
    particles.geometry.dispose()
    scene.remove(particles)
  }

  const positions = new Float32Array(params.count * 3)
  const colors = new Float32Array(params.count * 3)


  for (let i = 0; i < params.count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * params.spread
    colors[i] = Math.random()

  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  particles = new THREE.Points(geometry, materialParticle)
  scene.add(particles)
}

buildParticles()


// create edges geometry from the spline
const edges = new THREE.EdgesGeometry(tubeGeo, 0.001);
const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

// boxes
const numBoxes = 67;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
  const boxMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  box.position.copy(pos);
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  box.rotation.set(rote.x, rote.y, rote.z);
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);
  const color = new THREE.Color().setHSL(0.7 - p, 1, 0.5);
  const lineMat = new THREE.LineBasicMaterial({ color });
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  scene.add(box);
  // scene.add(boxLines);
}

function updateCamera(t) {
  const time = t * 0.15;
  const looptime = 10 * 1000;
  const p = (time % looptime) / looptime;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  updateCamera(t);
  composer.render(scene, camera);
  controls.update();
}
animate();

// resize

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
