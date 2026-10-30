import * as THREE from './vendor/three.module.min.js';

const cube = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 16, 12);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const mat = (color, roughness = .85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function texture(kind, base) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = base; c.fillRect(0, 0, 256, 256);
  let seed = 473;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 5000; i++) {
    const v = rand() * 100; c.fillStyle = `rgba(${v},${v + 6},${v},${rand() * .14})`;
    c.fillRect(rand() * 256, rand() * 256, rand() * 10 + 1, rand() * 7 + 1);
  }
  if (kind === 'tile') {
    c.strokeStyle = '#263329'; c.lineWidth = 2;
    for (let n = 0; n <= 256; n += 64) { c.beginPath(); c.moveTo(n, 0); c.lineTo(n, 256); c.moveTo(0, n); c.lineTo(256, n); c.stroke(); }
    c.fillStyle = '#131f1812'; c.fillRect(0, 0, 64, 64); c.fillRect(64, 64, 64, 64); c.fillRect(128, 128, 64, 64); c.fillRect(192, 192, 64, 64);
  } else {
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(23,32,18,${rand() * .09})`; c.fillRect(rand() * 256, rand() * 256, rand() * 18, rand() * 70); }
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function label(text, width = 512, height = 256, background = '#bec2a6', ink = '#343f32', small = '') {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d'); c.fillStyle = background; c.fillRect(0, 0, width, height);
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${height * .28}px Georgia`;
  c.fillText(text, width / 2, height * .43, width * .9);
  if (small) { c.font = `${height * .085}px monospace`; c.fillText(small, width / 2, height * .78, width * .9); }
  c.strokeStyle = ink + '55'; c.lineWidth = 2; c.strokeRect(9, 9, width - 18, height - 18);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function builders(scene, obstacles = []) {
  const box = (w, h, d, x, y, z, material, solid = false, parent = scene) => {
    const mesh = new THREE.Mesh(cube, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    if (solid) obstacles.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, height: h });
    return mesh;
  };
  const ellipsoid = (x, y, z, sx, sy, sz, material, parent = scene) => { const m = new THREE.Mesh(sphere, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
  const tube = (x, y, z, radius, height, material, parent = scene) => { const m = new THREE.Mesh(cylinder, material); m.position.set(x, y, z); m.scale.set(radius, height, radius); m.castShadow = true; parent.add(m); return m; };
  const plane = (w, h, x, y, z, material, rx = 0, ry = 0, parent = scene) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; parent.add(m); return m; };
  const sign = (text, small, w, h, x, y, z, rotation = 0, colors = []) => plane(w, h, x, y, z, mat(0xffffff, 1, { map: label(text, 512, 256, colors[0] || '#bec2a6', colors[1] || '#343f32', small), side: THREE.DoubleSide, emissive: 0x45523b, emissiveIntensity: .12 }), 0, rotation);
  return { box, ellipsoid, tube, plane, sign };
}

export function person(scene, position, ghost = false, rotation = 0) {
  const group = new THREE.Group(); group.position.copy(position); group.rotation.y = rotation; scene.add(group);
  const b = builders(group); const coat = mat(ghost ? 0x757e6b : 0x363f37), dark = mat(0x080f0b), skin = mat(0x92957c);
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(.17, .25, .97, 18, 1, true), coat); dress.position.y = .86; dress.castShadow = true; group.add(dress);
  b.ellipsoid(0, 1.3, 0, .245, .16, .2, coat);
  b.ellipsoid(0, 1.55, -.025, .11, .17, .105, skin);
  b.ellipsoid(0, 1.6, .018, .135, .19, .128, dark);
  for (const side of [-1, 1]) b.ellipsoid(side * .11, 1.43, -.015, .047, .25, .125, dark);
  const hairCanvas = document.createElement('canvas'); hairCanvas.width = 128; hairCanvas.height = 256;
  const hairContext = hairCanvas.getContext('2d');
  for (let i = 0; i < 95; i++) {
    const x = i / 94 * 128; hairContext.strokeStyle = i % 3 ? '#080e0b' : '#111a12'; hairContext.lineWidth = 2.5;
    hairContext.beginPath(); hairContext.moveTo(x, 0); hairContext.bezierCurveTo(x - 3, 70, x + Math.sin(i) * 9, 150, x + Math.cos(i) * 4, 205 + Math.sin(i * 2) * 40); hairContext.stroke();
  }
  const hairTexture = new THREE.CanvasTexture(hairCanvas); hairTexture.colorSpace = THREE.SRGBColorSpace;
  const hair = new THREE.Mesh(new THREE.PlaneGeometry(.26, .49, 6, 10), mat(0x788777, 1, { map: hairTexture, transparent: true, alphaTest: .15, side: THREE.DoubleSide }));
  const hairVertices = hair.geometry.attributes.position;
  for (let i = 0; i < hairVertices.count; i++) {
    const x = hairVertices.getX(i), y = hairVertices.getY(i);
    hairVertices.setX(i, x * (y > .14 ? .8 : 1)); hairVertices.setZ(i, x * x * 3.5);
  }
  hair.geometry.computeVertexNormals();
  hair.position.set(0, 1.48, -.145); hair.rotation.x = -.07; hair.castShadow = true; group.add(hair);
  for (const side of [-1, 1]) {
    const arm = b.tube(side * .245, 1.04, -.015, .058, .53, coat); arm.rotation.z = side * .09;
    b.ellipsoid(side * .23, 1.31, -.015, .063, .075, .065, coat);
    b.ellipsoid(side * .27, .73, -.025, .034, .075, .033, skin);
    b.box(.13, .43, .13, side * .12, .26, 0, dark);
    b.ellipsoid(side * .12, .07, -.05, .08, .06, .16, dark);
  }
  // Hair conceals the face; no facial reveal or sudden lunge.
  if (ghost) group.rotation.z = .035;
  group.userData.baseY = group.position.y;
  return group;
}

export function createShop(renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07110e); scene.fog = new THREE.FogExp2(0x101c15, .027);
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .045, 60);
  const obstacles = []; const { box, plane, tube, ellipsoid, sign } = builders(scene, obstacles);
  const wallTexture = texture('wall', '#a8ac8d'); wallTexture.repeat.set(3, 1.2);
  const floorTexture = texture('tile', '#6b7560'); floorTexture.repeat.set(7, 10);
  const wall = mat(0xc2c3a7, 1, { map: wallTexture }), lower = mat(0x536a57), wood = mat(0x3a4130), black = mat(0x121c18), metal = mat(0x5c6858, .4, { metalness: .5 }), paper = mat(0xb7b49a);
  const floor = mat(0x9aa68e, .62, { map: floorTexture });
  plane(8.8, 14, 0, 0, 0, floor, -Math.PI / 2);
  box(9, .12, 14, 0, 3.12, 0, mat(0x313e32));
  box(.2, 3.2, 14, -4.5, 1.6, 0, wall); box(.2, 3.2, 14, 4.5, 1.6, 0, wall); box(9, 3.2, .2, 0, 1.6, -7.1, wall);
  box(.025, 1.1, 14, -4.385, .55, 0, lower); box(.025, 1.1, 14, 4.385, .55, 0, lower); box(8.8, 1.1, .025, 0, .55, -6.985, lower);
  // The partition has one walkable doorway, 1.7 m wide, on the right.
  box(6.1, 3.1, .22, -1.35, 1.55, -1.45, wall, true); box(1.1, 3.1, .22, 3.85, 1.55, -1.45, wall, true); box(1.6, .55, .22, 2.5, 2.825, -1.45, wall);
  box(6.1, 1.1, .25, -1.35, .55, -1.45, lower); box(.08, 2.55, .3, 1.72, 1.275, -1.45, wood); box(.08, 2.55, .3, 3.28, 1.275, -1.45, wood);
  sign('DARKROOM', 'STAFF ONLY', 1.3, .32, 2.5, 2.83, -1.30);
  const curtain = mat(0x17271d, 1); for (let i = 0; i < 9; i++) box(.045, .35 + i * .023, .1, 1.82 + i * .04, 2.31, -1.45, curtain);
  // Front desk, display cabinets, and waiting chairs.
  box(3.9, .95, .85, -.85, .475, 3.1, wood, true); box(4.03, .075, .97, -.85, .99, 3.1, mat(0x77765b, .55));
  box(3.55, .58, .025, -.85, .53, 3.54, mat(0x6f775e));
  sign('MORI', 'PHOTO LAB · SINCE 1986', 2.2, .46, -.85, .58, 3.565, Math.PI);
  for (let i = 0; i < 3; i++) box(.015, .7, .05, -2.1 + i * 1.25, .5, 3.55, wood);
  const film = box(.46, .016, .34, -.55, 1.04, 3.07, paper);
  const filmLabel = plane(.43, .28, -.55, 1.051, 3.07, mat(0xffffff, 1, { map: label('047', 256, 160, '#c4bc9f', '#44463b', '3 EXPOSURES') }), -Math.PI / 2);
  tube(-.62, 1.09, 3.35, .045, .07, black);
  const bell = ellipsoid(.45, 1.075, 3.02, .105, .055, .105, metal); tube(.45, 1.15, 3.02, .017, .06, metal);
  box(.43, .075, .32, -2.15, 1.065, 3.09, black); box(.39, .07, .09, -2.15, 1.14, 3.2, black);
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) box(.045, .008, .04, -2.23 + x * .065, 1.108, 2.99 + z * .055, mat(0x829078));
  box(.52, .38, .42, .72, 1.22, 3.23, mat(0x4b5748));
  plane(.37, .25, .72, 1.24, 3.008, new THREE.MeshBasicMaterial({ map: label('23:47', 256, 160, '#162e21', '#85965a', 'MORI / REGISTER'), side: THREE.DoubleSide }), 0, Math.PI);
  for (const x of [-3.5, -2.75]) {
    box(.58, .1, .55, x, .48, 5.3, mat(0x54604b), true); box(.58, .55, .09, x, .83, 5.58, mat(0x54604b));
    for (const dx of [-.22, .22]) for (const dz of [-.2, .2]) box(.035, .45, .035, x + dx, .23, 5.3 + dz, metal);
  }
  box(.7, 1.8, 2.2, -3.9, .9, .3, wood, true);
  for (const y of [.45, 1.05, 1.65]) { box(.8, .04, 2.25, -3.86, y, .3, mat(0x969378)); for (let i = 0; i < 7; i++) box(.25, .22 + i % 2 * .08, .11, -3.77, y + .16, -.55 + i * .27, mat([0x6e7148, 0x666942, 0x848d68][i % 3])); }
  sign('COLOR', 'DEVELOPING · PRINTING', 1.55, 1.05, -4.36, 2.15, 3.7, Math.PI / 2, ['#adb799', '#334534']);
  sign('KEEP YOUR', 'MEMORIES CLOSE', 1.35, .9, -4.36, 2.2, .6, Math.PI / 2, ['#938e72', '#3a4034']);
  for (let i = 0; i < 4; i++) { const y = i % 2 ? 1.75 : 2.05, z = -.3 + i * 1.12; box(.05, .76, .58, 4.35, y, z, wood); plane(.47, .64, 4.31, y, z, mat(0xffffff, 1, { map: label(['SUMMER', 'HOME', '1986', 'STILL'][i], 256, 300, ['#7c8f75', '#8d9777', '#6b7d70', '#98987c'][i], '#394b38', 'MORI COLOR') }), 0, -Math.PI / 2); }
  // A wall clock and a cheap oscillating fan.
  const clockFace = plane(.42, .42, -.7, 2.52, -1.305, mat(0xffffff, 1, { map: label('11 : 47', 256, 256, '#b1b59b', '#303c30', 'QUARTZ') }));
  tube(3.83, .85, 2, .09, 1.7, metal); const fan = new THREE.Group(); fan.position.set(3.83, 1.85, 2); scene.add(fan);
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(.29, .015, 5, 32), metal); fan.add(fanRing); for (let i = 0; i < 6; i++) { const blade = box(.025, .58, .02, 0, 0, 0, metal, false, fan); blade.rotation.z = i * Math.PI / 6; }
  // Front glass, locked door, and street beyond.
  box(8.8, .55, .18, 0, .275, 7, lower); box(8.8, .4, .18, 0, 2.95, 7, wood);
  for (const x of [-4.4, 1.8, 3.6, 4.4]) box(.07, 2.7, .1, x, 1.7, 6.98, metal);
  const glass = new THREE.MeshStandardMaterial({ color: 0x587968, transparent: true, opacity: .12, roughness: .3, side: THREE.DoubleSide, depthWrite: false });
  plane(8.7, 2.3, 0, 1.65, 6.99, glass);
  const rainCanvas = document.createElement('canvas'); rainCanvas.width = rainCanvas.height = 512; const rc = rainCanvas.getContext('2d');
  for (let i = 0; i < 260; i++) { const x = Math.random() * 512, y = Math.random() * 512; rc.strokeStyle = `rgba(182,213,191,${Math.random() * .2})`; rc.lineWidth = .5 + Math.random(); rc.beginPath(); rc.moveTo(x, y); rc.lineTo(x - 2, y + 15 + Math.random() * 60); rc.stroke(); }
  const rainTexture = new THREE.CanvasTexture(rainCanvas); rainTexture.wrapS = rainTexture.wrapT = THREE.RepeatWrapping; rainTexture.repeat.set(3, 1);
  plane(8.7, 2.3, 0, 1.65, 6.97, new THREE.MeshBasicMaterial({ map: rainTexture, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  sign('CLOSED', 'PLEASE COLLECT YOUR PHOTOS', .84, .42, 2.7, 1.86, 6.92, Math.PI, ['#9d9f85', '#343e30']);
  box(.035, .35, .08, 1.97, 1.17, 6.85, metal); box(.15, .08, .07, 1.97, 1.12, 6.8, metal);
  sign('MORI', 'FILM · COLOR · PRINTS', 3.5, .64, -1.2, 2.48, 6.89, Math.PI, ['#c2c5a1', '#354f3b']);
  plane(30, 22, 0, -.03, 14, mat(0x1e302a, .3), -Math.PI / 2);
  box(19, 8, 1, 0, 3, 17.5, mat(0x23332c));
  for (let i = 0; i < 7; i++) { box(1.1, 2.3, .1, -8 + i * 2.6, 1.2, 16.9, mat(0x14241c)); box(1.1, .05, .12, -8 + i * 2.6, 2.4, 16.8, mat(0x657654)); }
  sign('HOTEL', 'VACANCY', 1.2, 2.4, 3, 3, 16.8, 0, ['#2e3428', '#90946a']);
  tube(-2, 2.65, 11, .065, 5.3, black); box(.8, .09, .3, -2, 5.2, 11, mat(0xc0c5a3, .4, { emissive: 0xaabb8a, emissiveIntensity: 1 }));
  const street = new THREE.PointLight(0x95bba1, 65, 17); street.position.set(-2, 4.9, 11); scene.add(street);
  plane(2.4, 8, -2, -.015, 11, new THREE.MeshBasicMaterial({ color: 0xa4bf86, transparent: true, opacity: .055, depthWrite: false }), -Math.PI / 2);
  // Darkroom workbench, enlarger, sink, chemical bottles, and drying prints.
  box(7.5, .88, 1.15, -.25, .44, -6.27, wood, true); box(7.6, .08, 1.23, -.25, .92, -6.27, mat(0x696f5c, .5));
  const tray = (x, color) => {
    const trayMat = mat(color, .4); box(.92, .04, .69, x, .99, -5.98, trayMat);
    for (const dx of [-.45, .45]) box(.035, .09, .69, x + dx, 1.02, -5.98, trayMat);
    for (const dz of [-.33, .33]) box(.92, .09, .035, x, 1.02, -5.98 + dz, trayMat);
    plane(.84, .6, x, 1.025, -5.98, mat(0x233029, .15), -Math.PI / 2);
  };
  tray(-.65, 0xa9ac91); tray(.55, 0x7a8c73); tray(1.75, 0x535d4e);
  const developingMat = new THREE.MeshBasicMaterial({ color: 0xd5d0b4, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const developingPaper = plane(.71, .48, -.65, 1.035, -5.98, developingMat, -Math.PI / 2);
  box(.8, .07, .7, -2.9, 1.01, -6.1, black); tube(-2.9, 1.72, -6.48, .035, 1.4, metal); box(.4, .32, .38, -2.9, 2.19, -6.13, black); tube(-2.9, 1.95, -6.13, .095, .17, black);
  const enlargerBulb = new THREE.PointLight(0xbbc9a0, 1.5, 1.5); enlargerBulb.position.set(-2.9, 1.8, -6.13); scene.add(enlargerBulb);
  for (let i = 0; i < 6; i++) { const x = -.7 + i * .47; tube(x, 1.13, -6.7, .075, .32, mat(i % 2 ? 0x3e4626 : 0x475b42, .3)); tube(x, 1.32, -6.7, .05, .065, black); sign(String(i + 1), 'MORI', .1, .13, x, 1.14, -6.62); }
  sign('DEVELOPER', 'DO NOT SWITCH ON THE WHITE LIGHT', 1.55, .35, -.6, 1.65, -6.98);
  sign('WASH HANDS', 'AFTER HANDLING CHEMICALS', 1.2, .32, 2.7, 2.2, -6.98, 0, ['#a4a88d', '#49563c']);
  box(1, .85, .7, -3.86, .425, -3.2, mat(0x647766), true); box(1.05, .08, .8, -3.86, .9, -3.2, mat(0x7f8b78, .35)); tube(-4, 1.08, -3.52, .025, .3, metal); const tap = tube(-4, 1.21, -3.41, .025, .2, metal); tap.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const z = -2.4 - i * .47; plane(.25, .32, -4.3, 2.25, z, mat(0xacae94), 0, Math.PI / 2); box(.02, .06, .025, -4.29, 2.43, z, wood); }
  box(.015, .015, 4.2, -4.28, 2.45, -4.25, black);
  tube(3.7, .28, -3.6, .23, .56, black); box(.38, .02, .25, 3.68, .57, -3.6, paper);
  // Pool lighting; no full-screen strobing or surprise loud impacts.
  scene.add(new THREE.HemisphereLight(0x8ba88a, 0x111b15, .7));
  const key = new THREE.SpotLight(0xc0d4aa, 68, 15, Math.PI / 2.9, .6, 2); key.position.set(-.6, 2.97, 2.1); key.target.position.set(-.5, 0, 2.1); scene.add(key, key.target); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0005;
  const frontLight = new THREE.PointLight(0xa7c29a, 17, 13); frontLight.position.set(-.5, 2.8, 1.8); scene.add(frontLight);
  box(1.8, .08, .26, -.5, 3, 2, metal); box(1.65, .035, .16, -.5, 2.945, 2, mat(0xc5d8af, .5, { emissive: 0xb6d4a4, emissiveIntensity: 2 }));
  const backLight = new THREE.PointLight(0xb5bc84, 14, 8); backLight.position.set(-1.6, 2.7, -4.6); scene.add(backLight);
  const redLight = new THREE.PointLight(0xe05332, 5.5, 6); redLight.position.set(2.7, 2.55, -5.8); scene.add(redLight);
  box(.38, .17, .2, 2.7, 2.64, -6.96, black); plane(.29, .1, 2.7, 2.61, -6.84, mat(0xa3321f, .5, { emissive: 0xe04123, emissiveIntensity: 1.8 }));
  const hallwayLight = new THREE.PointLight(0xa3bd8a, 5, 6); hallwayLight.position.set(2.5, 2.65, -1.2); scene.add(hallwayLight);
  const lady = person(scene, new THREE.Vector3(-1.45, 0, 8.15), true, 0);
  const ghost = person(scene, new THREE.Vector3(1, 0, -4), true, Math.PI); ghost.visible = false;
  const rainPositions = new Float32Array(600 * 6);
  for (let i = 0; i < 600; i++) { const x = (Math.random() - .5) * 24, y = Math.random() * 9, z = 7.7 + Math.random() * 11; rainPositions.set([x, y, z, x - .04, y - .22, z], i * 6); }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0x8eaf9c, transparent: true, opacity: .23 })); scene.add(rain);
  const targets = [
    { action: 'film', position: new THREE.Vector3(-.55, 1.08, 3.07), label: 'Take the envelope' },
    { action: 'bell', position: new THREE.Vector3(.45, 1.1, 3.02), label: 'Check the counter' },
    { action: 'phone', position: new THREE.Vector3(-2.15, 1.15, 3.09), label: 'Answer the telephone' },
    { action: 'delivery', position: new THREE.Vector3(-.55, 1.08, 3.07), label: 'Leave the photographs' },
    { action: 'tray', position: new THREE.Vector3(-.65, 1.1, -5.98), label: 'Develop the photograph' },
    { action: 'door', position: new THREE.Vector3(1.97, 1.2, 6.85), label: 'Try the door', passive: true },
  ];
  const photos = makeApartmentPhotos(renderer);
  const captureFinal = player => {
    const body = person(scene, new THREE.Vector3(player.x, 0, player.z), false, 0);
    ghost.position.set(player.x + .72, 0, player.z + .2); ghost.rotation.y = Math.PI; ghost.visible = false;
    const shotCamera = new THREE.PerspectiveCamera(65, 1.5, .1, 40); shotCamera.position.set(3.6, 2.35, -2.05); shotCamera.lookAt(player.x - .2, 1.15, -5.75);
    const empty = snapshot(renderer, scene, shotCamera); ghost.visible = true;
    const occupied = snapshot(renderer, scene, shotCamera); body.visible = false; scene.remove(body); ghost.visible = false;
    return { base: empty, reveal: occupied };
  };
  return { scene, camera, obstacles, targets, lady, ghost, photos, film, filmLabel, developingPaper, developingMat, backLight, frontLight, captureFinal,
    update(time, dt, tension) {
      fan.rotation.z = time * 1.9;
      for (let i = 0; i < 600; i++) { rainPositions[i * 6 + 1] -= dt * 4.8; if (rainPositions[i * 6 + 1] < 0) rainPositions[i * 6 + 1] += 9; rainPositions[i * 6 + 4] = rainPositions[i * 6 + 1] - .22; }
      rainGeometry.attributes.position.needsUpdate = true;
      rainTexture.offset.y = time * .012;
      frontLight.intensity = (17 - tension * 6) * (1 + Math.sin(time * 19) * .015);
      backLight.intensity = ghost.visible ? 2.2 : 14 - tension * 4;
    }
  };
}

function snapshot(renderer, scene, camera) {
  const w = 900, h = 600, previous = renderer.getRenderTarget();
  const target = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
  renderer.setRenderTarget(target); renderer.render(scene, camera);
  const pixels = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'), data = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) data.data.set(pixels.subarray((h - y - 1) * w * 4, (h - y) * w * 4), y * w * 4);
  ctx.putImageData(data, 0, 0);
  // Fine film grain is baked into the prints, not external image assets.
  const film = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < film.data.length; i += 4) { const grain = (Math.random() - .5) * 13; for (let n = 0; n < 3; n++) film.data[i + n] = Math.max(0, Math.min(255, film.data[i + n] + grain)); }
  ctx.putImageData(film, 0, 0);
  const url = canvas.toDataURL('image/jpeg', .88); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  renderer.setRenderTarget(previous); target.dispose();
  return { url, texture };
}

function makeApartmentPhotos(renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x18241c); scene.fog = new THREE.FogExp2(0x1e2c20, .035);
  const { box, plane, ellipsoid, tube, sign } = builders(scene);
  const walls = mat(0xa0ac8c, 1, { map: texture('wall', '#9da98c') }), wood = mat(0x424631), linen = mat(0x858e74), dark = mat(0x16231b);
  plane(8, 13, 0, 0, -2, mat(0x5f6b4e, 1, { map: texture('tile', '#5a634c') }), -Math.PI / 2);
  box(.2, 3, 13, -4, 1.5, -2, walls); box(.2, 3, 13, 4, 1.5, -2, walls); box(8, 3, .2, 0, 1.5, -8, walls); box(8, .1, 13, 0, 3, -2, mat(0x59624d));
  box(2.2, 3, .17, -2.9, 1.5, -2, walls); box(3.1, 3, .17, 2.45, 1.5, -2, walls); box(2.7, .6, .17, -.45, 2.7, -2, walls);
  box(1.8, .1, 1.2, -.8, .83, .3, wood);
  for (const x of [-1.5, -.1]) for (const z of [-.1, .7]) box(.08, .8, .08, x, .4, z, wood);
  for (const x of [-1.5, -.1]) { tube(x, .91, .3, .2, .025, mat(0xbbc0a0)); tube(x + .1, 1, -.03, .065, .17, mat(0x8c9979)); }
  for (const z of [-.65, 1.2]) { box(.56, .07, .55, -.8, .48, z, wood); box(.56, .65, .06, -.8, .83, z + (z < 0 ? -.25 : .25), wood); for (const x of [-1, -.6]) box(.035, .47, .04, x, .24, z, wood); }
  box(.5, .7, .45, 1.25, .35, -4.25, wood);
  tube(1.25, 1.07, -4.25, .026, .7, dark);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.2, .35, .45, 12), mat(0xb8b58b)); lamp.position.set(1.25, 1.46, -4.25); lamp.rotation.z = .18; scene.add(lamp);
  const lampCrack = box(.015, .4, .015, 1.27, 1.46, -3.93, dark); lampCrack.rotation.z = -.3;
  box(.55, .03, .25, -1.75, 1.85, -4.3, wood); tube(-1.75, .9, -4.4, .025, 1.8, dark); box(.48, .87, .2, -1.75, 1.34, -4.28, mat(0x344856)); box(.13, .68, .16, -2.07, 1.3, -4.27, mat(0x344856)); box(.12, .7, .16, -1.42, 1.3, -4.27, mat(0x344856)); box(.05, .13, .015, -2.07, 1.08, -4.18, mat(0xb2a38b));
  box(2, .3, 2.7, -.3, .25, -6.1, wood); box(1.9, .22, 2.6, -.3, .5, -6.1, linen); box(1.9, .8, .09, -.3, .6, -7.5, wood);
  box(.75, .16, .48, -.3, .69, -7.05, mat(0xc2c5a9));
  ellipsoid(-.3, .79, -6.92, .16, .17, .21, mat(0x8e937d)); ellipsoid(-.29, .9, -6.96, .17, .09, .18, dark);
  const blanket = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2, 14, 14), mat(0x8b977e, 1, { side: THREE.DoubleSide }));
  const pos = blanket.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, .018 * Math.sin(pos.getX(i) * 12) + .22 * Math.exp(-(pos.getX(i) ** 2) / .22 - (pos.getY(i) ** 2) / 1.6));
  blanket.geometry.computeVertexNormals(); blanket.rotation.x = -Math.PI / 2; blanket.position.set(-.3, .67, -5.68); scene.add(blanket);
  sign('OCTOBER', 'THURSDAY 29', .45, .57, 3.88, 1.8, -3, -Math.PI / 2);
  scene.add(new THREE.HemisphereLight(0x9daf91, 0x192719, .65));
  const light = new THREE.PointLight(0xc4cf9c, 35, 14); light.position.set(-.5, 2.7, .1); scene.add(light);
  const dim = new THREE.PointLight(0xb4c98f, 13, 11); dim.position.set(1.25, 1.43, -4.25); scene.add(dim);
  const flash = new THREE.PointLight(0xc7dec2, 6, 7); scene.add(flash);
  const shots = [
    { from: [2.2, 1.65, 2], to: [-1.1, .8, .2] },
    { from: [0, 1.65, -2.2], to: [-.25, 1.35, -4.6] },
    { from: [.7, 1.6, -4.7], to: [-.3, .73, -6.7] },
  ];
  return shots.map(shot => { const camera = new THREE.PerspectiveCamera(62, 1.5, .05, 30); camera.position.fromArray(shot.from); camera.lookAt(...shot.to); flash.position.copy(camera.position); return snapshot(renderer, scene, camera); });
}
