import * as THREE from './vendor/three.module.min.js';
import { createShop } from './scene.mjs';
import { Story, canStand } from './story.mjs';
import { ShopAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('comfort').checked = reduced;
const audio = new ShopAudio();
const keys = new Set();
const player = { x: -.45, z: 1.35, yaw: Math.PI, pitch: -.15 };
let renderer, shop, story = new Story(), mode = 'title', pausedFrom = 'play', dragLook = false, dragging = false;
let target = null, footTime = 0, time = 0, lastTime = 0, ringTime = 0, gazeTime = 0, finalPhoto = null;
let subtitles = [], subtitleTime = 0, photoRevealed = false, closeTimer = null;
let slowFrames = 0;
const forward = new THREE.Vector3(), toward = new THREE.Vector3(), ray = new THREE.Ray(), collisionBox = new THREE.Box3(), intersection = new THREE.Vector3();

function say(lines) {
  subtitles = lines.map(line => ({ speaker: line[0], text: line[1], duration: line[2] || 4 }));
  subtitleTime = 0; nextSubtitle();
}
function nextSubtitle() {
  const line = subtitles.shift();
  if (!line) { $('subtitle').classList.remove('visible'); subtitleTime = Infinity; return; }
  $('speaker').textContent = line.speaker; $('line').textContent = line.text;
  $('subtitle').classList.toggle('visible', !!line.text); subtitleTime = line.duration;
}
function objective() {
  const titles = {
    collection: 'Take the envelope from the counter.', develop: `Develop photograph ${story.print + 1} in the darkroom.`,
    processing: 'Let the image come through.', ready: 'Lift the photograph from the tray.', inspect: 'Look closely.',
    counter: 'The bell. Check the front counter.', phone: 'Answer the telephone at the counter.',
    deliver: 'Leave the photographs on the front counter.', final: 'There is another sheet in the developer.',
    turn: 'You are not alone.', ended: '',
  };
  $('objective').textContent = titles[story.stage];
  $('chapter').textContent = story.print === 3 ? 'ONE TOO MANY' : story.stage === 'collection' ? 'AFTER HOURS' : 'COLLECTION 047';
  $('print-count').textContent = story.stage === 'collection' ? '—' : `${String(story.print + 1).padStart(2, '0')} / 03`;
}
function setMode(next) {
  mode = next; keys.clear(); dragging = false;
  document.body.classList.toggle('paused', mode === 'pause');
  $('pause').hidden = mode !== 'pause';
  $('photo-view').hidden = mode !== 'photo' && !(mode === 'pause' && pausedFrom === 'photo');
  document.body.classList.toggle('inspecting', mode === 'photo');
  $('interact').hidden = true;
}
function requestLook() {
  try {
    const result = $('world').requestPointerLock?.();
    if (!$('world').requestPointerLock) enableDragLook();
    result?.catch(() => enableDragLook());
  } catch { enableDragLook(); }
}
function enableDragLook() {
  dragLook = true;
  $('controls-hint').textContent = 'W A S D  MOVE · CLICK + DRAG OR ARROWS TO LOOK · E INTERACT · ESC PAUSE';
}
function begin() {
  if (!shop) return;
  $('start').hidden = true; $('hud').hidden = false; setMode('play'); requestLook(); audio.start($('sound').checked); objective();
  say([['AT THE WINDOW', '“I’m here for my photographs.”', 4], ['YOU', '“They’re not ready. We’re closed.”', 4], ['AT THE WINDOW', '“I can wait.”', 4]]);
}
function pause() {
  if (!['play', 'photo'].includes(mode)) return;
  pausedFrom = mode; setMode('pause'); document.exitPointerLock?.(); audio.pause(); $('resume').focus();
}
function resume() {
  setMode(pausedFrom); audio.start($('sound').checked);
  if (mode === 'play') requestLook();
}
function reset() {
  clearTimeout(closeTimer); location.reload();
}
function canSeeTarget(item) {
  toward.copy(item.position).sub(shop.camera.position);
  const distance = toward.length();
  if (distance > 2.25 || distance < .1) return false;
  toward.normalize();
  if (toward.dot(forward) < .82) return false;
  ray.set(shop.camera.position, toward);
  for (const b of shop.obstacles) {
    collisionBox.min.set(b.x0, 0, b.z0); collisionBox.max.set(b.x1, b.height, b.z1);
    if (ray.intersectBox(collisionBox, intersection) && intersection.distanceTo(shop.camera.position) < distance - .12) return false;
  }
  return true;
}
function findTarget() {
  shop.camera.getWorldDirection(forward);
  return shop.targets.find(item => (story.accepts(item.action) || item.passive && story.stage !== 'turn') && canSeeTarget(item)) || null;
}
function interact() {
  if (mode === 'photo') return lowerPhoto();
  if (mode !== 'play' || !target) return;
  if (target.action === 'door') { audio.knock(); say([['YOU', 'Locked. I locked it myself.', 4]]); return; }
  const action = target.action;
  if (!story.interact(action)) return;
  audio.paper();
  if (action === 'film') {
    shop.film.visible = shop.filmLabel.visible = false;
    say([['COLLECTION 047', 'Three exposures. No name.', 5], ['YOU', 'Developer is in the back room.', 4]]);
  } else if (action === 'tray') {
    if (story.stage === 'inspect') showPhoto();
    else {
      if (story.print === 3) finalPhoto = shop.captureFinal(player);
      shop.developingMat.map = story.print === 3 ? finalPhoto.base.texture : shop.photos[story.print].texture;
      shop.developingMat.color.set(0xffffff); shop.developingMat.needsUpdate = true; shop.developingMat.opacity = .08; shop.developingPaper.visible = true;
      audio.water();
      if (story.print === 3) say([['YOU', 'I only cut three sheets.', 5]]);
      else say([['', '', 1]]);
    }
  } else if (action === 'bell') {
    say([['YOU', 'She isn’t outside.', 4], ['YOU', 'The door is still locked.', 4]]);
  } else if (action === 'phone') {
    audio.whisper(); say([['ON THE TELEPHONE', 'Breathing. Nothing else.', 5], ['YOU', 'I know that room.', 4]]);
  } else if (action === 'delivery') {
    shop.film.visible = shop.filmLabel.visible = true; shop.developingMat.map = null; shop.developingMat.color.set(0xc3c6ad); shop.developingMat.opacity = .85; shop.developingPaper.visible = true;
    audio.bell(); say([['YOU', '“Your photographs.”', 4], ['', '', 1.5], ['FROM THE DARKROOM', 'Water moves in the tray.', 4]]);
  }
  objective();
}
function showPhoto() {
  setMode('photo'); document.exitPointerLock?.();
  shop.developingPaper.visible = false; photoRevealed = false;
  const photo = story.print === 3 ? finalPhoto.base : shop.photos[story.print];
  $('photo-image').src = photo.url;
  $('photo-image').alt = ['A dim dining room with two places set at a table.', 'An apartment hallway with a blue coat and a damaged lamp.', 'A sleeping person photographed from beside their bed.', 'The back of the photo-shop worker at the developing bench.'][story.print];
  $('photo-reveal').style.opacity = '0'; $('photo-reveal').removeAttribute('src');
  if (story.print === 3) $('photo-reveal').src = finalPhoto.reveal.url;
  $('negative-number').textContent = `NEGATIVE ${String(story.print + 1).padStart(2, '0')} / 03`;
  $('photo-date').textContent = story.print === 3 ? '10 30 ’98' : '10 29 ’98';
  $('lower-photo').disabled = true; $('photo-paper').style.transform = 'rotate(-1deg)';
  const lines = [
    [['YOU', 'Two places set.', 5], ['YOU', 'Nothing written on the back.', 4]],
    [['YOU', 'My coat. The tear in the sleeve.', 4], ['YOU', 'That broken lamp.', 3.5], ['YOU', 'This is my apartment.', 4]],
    [['YOU', 'I was asleep.', 5], ['YOU', 'Who took this?', 5]],
    [['YOU', 'This room. Right now.', 5], ['FROM THE FRONT OF THE SHOP', '“Is that everyone?”', 6]],
  ];
  say(lines[story.print]);
}
function lowerPhoto() {
  if (mode !== 'photo' || story.elapsed < (story.print === 3 ? 9 : 5) || !story.lower()) return;
  setMode('play'); requestLook(); audio.paper();
  if (story.stage === 'counter') { shop.lady.visible = false; audio.bell(); say([['FROM THE COUNTER', 'The bell.', 3]]); }
  if (story.stage === 'phone') { ringTime = 0; audio.ring(); say([['', '', 1]]); }
  if (story.stage === 'deliver') say([['YOU', 'Put them down. Give her the photographs.', 5]]);
  if (story.stage === 'turn') {
    shop.camera.getWorldDirection(forward);
    shop.ghost.position.set(THREE.MathUtils.clamp(player.x - forward.x * 1.3, -3.5, 3.5), 0, THREE.MathUtils.clamp(player.z - forward.z * 1.3, -5.5, -2.1));
    shop.ghost.rotation.y = player.yaw; shop.ghost.visible = true;
    renderer.shadowMap.needsUpdate = true; gazeTime = 0; audio.whisper();
    say([['VERY CLOSE', '“Is that everyone?”', 6]]);
  }
  objective();
}
function finish() {
  if (!story.end()) return;
  setMode('closing'); document.exitPointerLock?.(); $('subtitle').classList.remove('visible'); $('hud').hidden = true; $('fade').style.opacity = '1';
  closeTimer = setTimeout(() => { mode = 'ending'; $('ending').hidden = false; $('again').focus(); audio.pause(); }, 2800);
}
function move(dt) {
  const speed = 1.9;
  if (keys.has('ArrowLeft')) player.yaw += dt * 1.4;
  if (keys.has('ArrowRight')) player.yaw -= dt * 1.4;
  if (keys.has('ArrowUp')) player.pitch = Math.min(1.15, player.pitch + dt);
  if (keys.has('ArrowDown')) player.pitch = Math.max(-1.25, player.pitch - dt);
  let f = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  let r = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const length = Math.hypot(f, r); if (length) { f /= length; r /= length; }
  const dx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * r) * speed * dt;
  const dz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * r) * speed * dt;
  const oldX = player.x, oldZ = player.z;
  if (canStand(player.x + dx, player.z, shop.obstacles)) player.x += dx;
  if (canStand(player.x, player.z + dz, shop.obstacles)) player.z += dz;
  const moved = Math.hypot(player.x - oldX, player.z - oldZ) > .001;
  if (moved) { footTime += dt; if (footTime > .53) { audio.footstep(); footTime = 0; } }
  const bob = moved && !$('comfort').checked ? Math.sin(story.total * 10) * .018 : 0;
  shop.camera.position.set(player.x, 1.63 + bob, player.z);
  shop.camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}
function frame(ms) {
  requestAnimationFrame(frame);
  const rawDelta = (ms - lastTime) / 1000 || .016;
  const dt = Math.min(rawDelta, .15); lastTime = ms;
  if (!shop || document.hidden) return;
  if (!['pause', 'ending', 'closing'].includes(mode)) time += dt;
  if (mode === 'title') {
    shop.camera.position.set(3.25 + Math.sin(time * .055) * .12, 1.62, -.3);
    shop.camera.lookAt(-.65, 1.5, 6.9);
  }
  if (mode === 'play' || mode === 'photo') {
    const event = story.tick(dt);
    if (event === 'ready') { objective(); audio.paper(); }
    subtitleTime -= dt; if (subtitleTime <= 0) nextSubtitle();
    audio.update(player.z < -1.5, story.print / 3);
    if (story.stage === 'phone') { ringTime += dt; if (ringTime > 3.6) { audio.ring(); ringTime = 0; } }
    if (mode === 'play') {
      move(dt); target = findTarget();
      $('interact').hidden = !target;
      $('crosshair').classList.toggle('active', !!target);
      if (target) $('interact-label').textContent = target.action === 'tray' ? story.stage === 'ready' ? 'Lift the photograph' : story.print === 3 ? 'Watch the extra sheet develop' : `Develop photograph ${story.print + 1}` : target.label;
      $('process').hidden = story.stage !== 'processing';
      if (story.stage === 'processing') { $('process-fill').style.width = story.progress * 100 + '%'; shop.developingMat.opacity = .08 + story.progress * .92; }
      $('controls-hint').style.opacity = story.total < 25 || dragLook ? '1' : '.25';
      if (story.stage === 'turn') {
        toward.copy(shop.ghost.position).add(new THREE.Vector3(0, 1.45, 0)).sub(shop.camera.position).normalize(); shop.camera.getWorldDirection(forward);
        gazeTime = toward.dot(forward) > .88 ? gazeTime + dt : 0;
        if (gazeTime > 1.3 && story.elapsed > 2 || story.elapsed > 23) finish();
      }
    } else {
      $('process').hidden = true; $('lower-photo').disabled = story.elapsed < (story.print === 3 ? 9 : 5);
      $('photo-instruction').textContent = story.print === 3 ? 'The image is still developing.' : 'Move your mouse to inspect the print.';
      if (story.print === 3 && story.elapsed > 2 && !photoRevealed) { photoRevealed = true; $('photo-reveal').style.opacity = '1'; $('photo-image').alt = 'The shop worker at the bench. A second woman slowly appears standing beside them.'; audio.whisper(); }
    }
  }
  shop.update(time, mode === 'pause' ? 0 : dt, story.print / 3);
  if (mode === 'play' || mode === 'title') {
    slowFrames = rawDelta > .045 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 24 && renderer.getPixelRatio() > .55) {
      renderer.setPixelRatio(Math.max(.55, renderer.getPixelRatio() * .8)); slowFrames = 0;
    }
    renderer.render(shop.scene, shop.camera);
  }
}

function handleLook(event) {
  if (mode === 'photo' && !$('comfort').checked) {
    const x = event.clientX / innerWidth - .5, y = event.clientY / innerHeight - .5;
    $('photo-paper').style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg) rotate(-1deg)`;
  }
  if (mode !== 'play' || (!document.pointerLockElement && !(dragLook && dragging))) return;
  const sensitivity = Number($('sensitivity').value) * .0022;
  player.yaw -= event.movementX * sensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * sensitivity, -1.25, 1.15);
}
document.addEventListener('mousemove', handleLook);
$('world').addEventListener('mousedown', () => { if (mode === 'play') dragging = true; });
document.addEventListener('mouseup', () => dragging = false);
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && mode === 'play' && !dragLook) pause(); });
document.addEventListener('pointerlockerror', enableDragLook);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', () => { keys.clear(); if (mode === 'play') pause(); });
addEventListener('keydown', event => {
  if (event.code === 'Escape') { event.preventDefault(); pause(); return; }
  if (!['play', 'photo'].includes(mode)) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyE'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyE' && !event.repeat) interact();
  else keys.add(event.code);
});
addEventListener('keyup', event => keys.delete(event.code));
$('begin').addEventListener('click', begin); $('resume').addEventListener('click', resume);
$('lower-photo').addEventListener('click', lowerPhoto); $('again').addEventListener('click', reset);
$('restart').addEventListener('click', () => { $('restart-confirm').hidden = false; });
$('confirm-restart').addEventListener('click', reset); $('cancel-restart').addEventListener('click', () => $('restart-confirm').hidden = true);
addEventListener('resize', () => { if (!renderer || !shop) return; renderer.setSize(innerWidth, innerHeight); shop.camera.aspect = innerWidth / innerHeight; shop.camera.updateProjectionMatrix(); });
$('world').addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); $('load-status').textContent = 'The graphics context was interrupted. Reload to return to the shop.'; $('unsupported-title').textContent = 'The lights went out.'; $('unsupported-message').textContent = 'The browser lost its graphics context. Reload this page to restart the story.'; $('unsupported').hidden = false; });

try {
  if (matchMedia('(pointer: coarse)').matches && innerWidth < 1000) $('unsupported').hidden = false;
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1, 1280 / innerWidth)); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  shop = createShop(renderer);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  $('begin').disabled = false; $('begin-label').textContent = 'BEGIN THE NIGHT'; $('load-status').textContent = 'WASD to move · Mouse to look · E to interact';
  requestAnimationFrame(frame);
} catch (error) {
  console.error('Could not open the shop:', error);
  $('unsupported-title').textContent = 'The projector won’t start.';
  $('unsupported-message').textContent = 'This game needs WebGL 2. Try a current Chrome, Edge, Firefox, or Safari browser with hardware acceleration enabled.';
  $('unsupported').hidden = false;
}

// Read-only diagnostics for browser validation; no controls or story shortcuts.
export function inspectState() {
  return { mode, stage: story.stage, print: story.print, elapsed: story.elapsed, total: story.total, player: { ...player }, target: target?.action || null, locked: !!document.pointerLockElement, draws: renderer?.info.render.calls, triangles: renderer?.info.render.triangles, renderScale: renderer?.getPixelRatio() };
}
