import * as THREE from 'three';

// ───────────────────────── constants ─────────────────────────
const W = 128;            // world width/depth in blocks
const H = 44;             // world height
const CS = 16;            // chunk size
const NC = W / CS;        // chunks per side
const SAVE_KEY = 'blockdr-save-v1';
const DAY_SECONDS = 480;

// ───────────────────────── texture atlas ─────────────────────────
const TILE = 16, COLS = 16;
const tileNames = [];
const tilePainters = {};
function rngFor(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function defTile(name, fn) { tileNames.push(name); tilePainters[name] = fn; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = (r, g, b, a = 1) => `rgba(${clamp(r | 0, 0, 255)},${clamp(g | 0, 0, 255)},${clamp(b | 0, 0, 255)},${a})`;
function fill(ctx, base, v, rnd) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = (rnd() - 0.5) * v;
    ctx.fillStyle = rgb(base[0] + d, base[1] + d, base[2] + d);
    ctx.fillRect(x, y, 1, 1);
  }
}
function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }

defTile('grass_top', (c, r) => fill(c, [98, 162, 62], 22, r));
defTile('dirt', (c, r) => { fill(c, [134, 96, 67], 18, r); for (let i = 0; i < 10; i++) px(c, r() * 16 | 0, r() * 16 | 0, rgb(95, 66, 44)); });
defTile('grass_side', (c, r) => {
  fill(c, [134, 96, 67], 18, r);
  for (let x = 0; x < 16; x++) {
    const h = 3 + (r() * 3 | 0);
    for (let y = 0; y < h; y++) { const d = (r() - 0.5) * 22; px(c, x, y, rgb(98 + d, 162 + d, 62 + d)); }
  }
});
defTile('stone', (c, r) => { fill(c, [127, 127, 127], 20, r); for (let i = 0; i < 8; i++) px(c, r() * 16 | 0, r() * 16 | 0, rgb(100, 100, 100)); });
defTile('sand', (c, r) => fill(c, [220, 208, 145], 12, r));
function logSide(base, dark) {
  return (c, r) => {
    for (let x = 0; x < 16; x++) {
      const s = (r() - 0.5) * 26 + (x % 4 === 0 ? -18 : 0);
      for (let y = 0; y < 16; y++) { const d = s + (r() - 0.5) * 10; px(c, x, y, rgb(base[0] + d, base[1] + d, base[2] + d)); }
    }
    for (let i = 0; i < 6; i++) px(c, r() * 16 | 0, r() * 16 | 0, rgb(...dark));
  };
}
function logTop(base, ring) {
  return (c, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      const edge = d > 6.5;
      const on = Math.floor(d) % 2 === 0;
      const v = (r() - 0.5) * 10;
      const col = edge ? [90, 66, 38] : (on ? ring : base);
      px(c, x, y, rgb(col[0] + v, col[1] + v, col[2] + v));
    }
  };
}
defTile('log_side', logSide([105, 78, 46], [70, 50, 28]));
defTile('log_top', logTop([176, 140, 86], [150, 115, 68]));
defTile('dlog_side', logSide([62, 44, 28], [40, 28, 16]));
defTile('dlog_top', logTop([110, 80, 50], [88, 62, 38]));
defTile('blog_side', (c, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = (r() - 0.5) * 14; px(c, x, y, rgb(224 + d, 220 + d, 208 + d)); }
  for (let i = 0; i < 9; i++) { const x = r() * 14 | 0, y = r() * 16 | 0; for (let k = 0; k < 2 + (r() * 3 | 0); k++) px(c, x + k, y, rgb(40, 38, 34)); }
});
defTile('blog_top', logTop([200, 190, 150], [180, 168, 128]));
function planks(base, line) {
  return (c, r) => {
    for (let y = 0; y < 16; y++) {
      const board = Math.floor(y / 4);
      const shade = ((board * 37) % 5 - 2) * 5;
      for (let x = 0; x < 16; x++) {
        const joint = (x + board * 7) % 16 === 0 && (y % 4) !== 3;
        let d = shade + (r() - 0.5) * 10;
        let col = (y % 4 === 3) || joint ? line : base;
        if (col === line) d = (r() - 0.5) * 6;
        px(c, x, y, rgb(col[0] + d, col[1] + d, col[2] + d));
      }
    }
  };
}
defTile('planks', planks([184, 148, 92], [120, 92, 54]));
defTile('bplanks', planks([220, 200, 150], [160, 140, 100]));
defTile('dplanks', planks([90, 62, 38], [52, 34, 20]));
defTile('leaves', (c, r) => {
  c.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (r() < 0.16) continue;
    const d = (r() - 0.5) * 50;
    px(c, x, y, rgb(52 + d, 128 + d, 38 + d));
  }
});
defTile('glass', (c) => {
  c.fillStyle = rgb(200, 235, 255, 0.22); c.fillRect(0, 0, 16, 16);
  c.fillStyle = rgb(230, 245, 255, 0.95);
  c.fillRect(0, 0, 16, 1); c.fillRect(0, 15, 16, 1); c.fillRect(0, 0, 1, 16); c.fillRect(15, 0, 1, 16);
  for (let i = 3; i < 8; i++) px(c, i, 11 - i + 3, rgb(255, 255, 255, 0.9));
  for (let i = 8; i < 11; i++) px(c, i, 18 - i, rgb(255, 255, 255, 0.7));
});
defTile('brick', (c, r) => {
  c.fillStyle = rgb(176, 170, 160); c.fillRect(0, 0, 16, 16);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let k = -1; k < 3; k++) {
      const x0 = k * 8 + off, y0 = row * 4;
      const d = (r() - 0.5) * 30;
      c.fillStyle = rgb(158 + d, 74 + d * 0.5, 58 + d * 0.5);
      c.fillRect(Math.max(0, x0), y0, Math.min(16, x0 + 7) - Math.max(0, x0), 3);
    }
  }
});
defTile('cobble', (c, r) => {
  fill(c, [110, 110, 110], 16, r);
  for (let i = 0; i < 12; i++) {
    const x = r() * 13 | 0, y = r() * 13 | 0, w = 2 + (r() * 3 | 0), h = 2 + (r() * 3 | 0), d = (r() - 0.5) * 70;
    c.fillStyle = rgb(128 + d, 128 + d, 128 + d); c.fillRect(x, y, w, h);
    c.fillStyle = rgb(70, 70, 70); c.fillRect(x, y + h, w + 1, 1);
  }
});
defTile('stonebrick', (c, r) => {
  fill(c, [132, 132, 134], 14, r);
  c.fillStyle = rgb(88, 88, 92);
  for (let row = 0; row < 2; row++) {
    c.fillRect(0, row * 8 + 7, 16, 1);
    c.fillRect(row ? 4 : 8, row * 8, 1, 7);
  }
});
function wool(col) { return (c, r) => fill(c, col, 10, r); }
defTile('wool_white', wool([235, 235, 232]));
defTile('wool_red', wool([176, 46, 38]));
defTile('wool_blue', wool([50, 80, 170]));
defTile('wool_yellow', wool([240, 200, 50]));
defTile('wool_green', wool([84, 140, 40]));
defTile('bookshelf', (c, r) => {
  planks([184, 148, 92], [120, 92, 54])(c, r);
  for (const y0 of [1, 9]) {
    c.fillStyle = rgb(60, 40, 24); c.fillRect(1, y0, 14, 6);
    for (let x = 1; x < 15; x++) {
      const k = r();
      const col = k < 0.2 ? [150, 40, 40] : k < 0.4 ? [40, 90, 150] : k < 0.6 ? [60, 130, 60] : k < 0.8 ? [190, 150, 50] : [120, 60, 130];
      c.fillStyle = rgb(...col); c.fillRect(x, y0 + (r() * 2 | 0), 1, 6);
    }
  }
});
defTile('shingle', (c, r) => {
  for (let row = 0; row < 4; row++) {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 4; y++) {
        const edge = y === 3;
        const off = ((x + (row % 2) * 2) % 4 === 0) ? -14 : 0;
        const d = (r() - 0.5) * 14 + off + (edge ? -34 : 0);
        px(c, x, row * 4 + y, rgb(168 + d, 82 + d * 0.7, 54 + d * 0.5));
      }
    }
  }
});
defTile('lamp', (c, r) => {
  fill(c, [255, 224, 130], 22, r);
  c.fillStyle = rgb(150, 105, 50);
  c.fillRect(0, 0, 16, 1); c.fillRect(0, 15, 16, 1); c.fillRect(0, 0, 1, 16); c.fillRect(15, 0, 1, 16);
  c.fillRect(7, 0, 2, 16); c.fillRect(0, 7, 16, 2);
});

const ROWS = Math.ceil(tileNames.length / COLS);
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = TILE * COLS; atlasCanvas.height = TILE * ROWS;
{
  const actx = atlasCanvas.getContext('2d');
  tileNames.forEach((name, i) => {
    const t = document.createElement('canvas'); t.width = t.height = TILE;
    const tc = t.getContext('2d');
    tilePainters[name](tc, rngFor(1234 + i * 77));
    actx.drawImage(t, (i % COLS) * TILE, Math.floor(i / COLS) * TILE);
  });
}
const T = Object.fromEntries(tileNames.map((n, i) => [n, i]));

// ───────────────────────── block definitions ─────────────────────────
// tiles: [top, bottom, side]
const B = [null];
function def(name, top, bottom, side, opts = {}) { B.push({ name, tiles: [T[top], T[bottom], T[side]], icon: T[opts.icon || side], ...opts }); return B.length - 1; }
const GRASS = def('Grass', 'grass_top', 'dirt', 'grass_side', { icon: 'grass_side' });
const DIRT = def('Dirt', 'dirt', 'dirt', 'dirt');
const STONE = def('Stone', 'stone', 'stone', 'stone');
const SAND = def('Sand', 'sand', 'sand', 'sand');
const LOG = def('Oak Log', 'log_top', 'log_top', 'log_side');
const PLANKS = def('Oak Planks', 'planks', 'planks', 'planks');
const LEAVES = def('Leaves', 'leaves', 'leaves', 'leaves', { leaves: true });
const GLASS = def('Glass', 'glass', 'glass', 'glass', { glass: true });
const BRICK = def('Bricks', 'brick', 'brick', 'brick');
const BPLANKS = def('Birch Planks', 'bplanks', 'bplanks', 'bplanks');
const DPLANKS = def('Dark Oak Planks', 'dplanks', 'dplanks', 'dplanks');
const DLOG = def('Dark Oak Log', 'dlog_top', 'dlog_top', 'dlog_side');
const BLOG = def('Birch Log', 'blog_top', 'blog_top', 'blog_side');
const COBBLE = def('Cobblestone', 'cobble', 'cobble', 'cobble');
const STONEBRICK = def('Stone Bricks', 'stonebrick', 'stonebrick', 'stonebrick');
const WOOL_W = def('White Wool', 'wool_white', 'wool_white', 'wool_white');
const WOOL_R = def('Red Wool', 'wool_red', 'wool_red', 'wool_red');
const WOOL_B = def('Blue Wool', 'wool_blue', 'wool_blue', 'wool_blue');
const WOOL_Y = def('Yellow Wool', 'wool_yellow', 'wool_yellow', 'wool_yellow');
const WOOL_G = def('Green Wool', 'wool_green', 'wool_green', 'wool_green');
const SHELF = def('Bookshelf', 'planks', 'planks', 'bookshelf');
const SHINGLE = def('Roof Shingles', 'shingle', 'shingle', 'shingle');
const LAMP = def('Lamp', 'lamp', 'lamp', 'lamp');
for (const d of B) if (d) d.opaque = !d.glass && !d.leaves;
const WOOD_BLOCKS = new Set([LOG, DLOG, BLOG]);

// ───────────────────────── world data ─────────────────────────
const blocks = new Uint8Array(W * W * H);
const idx = (x, y, z) => (y * W + z) * W + x;
function get(x, y, z) {
  if (y < 0) return STONE;
  if (y >= H || x < 0 || x >= W || z < 0 || z >= W) return 0;
  return blocks[idx(x, y, z)];
}
const solid = (x, y, z) => get(x, y, z) !== 0 || x < 0 || x >= W || z < 0 || z >= W;

function hash2(x, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f, 7 + i); n += a; a *= 0.5; f *= 2; }
  return s / n;
}
const SPAWN = { x: W / 2, z: W / 2 };
const heights = new Int16Array(W * W);
function generate() {
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    let h = 10 + fbm(x / 34, z / 34) * 22;
    const d = Math.hypot(x - SPAWN.x, z - SPAWN.z);
    const w = clamp(1 - (d - 8) / 18, 0, 1);
    const s = w * w * (3 - 2 * w);
    h = h * (1 - s) + 15 * s;
    h = Math.floor(clamp(h, 4, H - 14));
    heights[z * W + x] = h;
    const sandy = h <= 12;
    for (let y = 0; y <= h; y++) {
      let id = STONE;
      if (y === h) id = sandy ? SAND : GRASS;
      else if (y >= h - 3) id = sandy ? SAND : DIRT;
      blocks[idx(x, y, z)] = id;
    }
  }
  // trees
  for (let z = 4; z < W - 4; z++) for (let x = 4; x < W - 4; x++) {
    const d = Math.hypot(x - SPAWN.x, z - SPAWN.z);
    if (d < 9) continue;
    const h = heights[z * W + x];
    if (get(x, h, z) !== GRASS) continue;
    const forest = vnoise(x / 14, z / 14, 99);
    if (hash2(x, z, 5) > 0.006 + forest * forest * 0.07) continue;
    const kind = hash2(x, z, 6);
    const log = kind < 0.2 ? BLOG : kind < 0.35 ? DLOG : LOG;
    const th = 4 + Math.floor(hash2(x, z, 8) * 3);
    for (let y = 1; y <= th; y++) blocks[idx(x, h + y, z)] = log;
    const top = h + th;
    for (let ly = top - 2; ly <= top + 1; ly++) {
      const r = ly >= top ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (ly >= top || hash2(x + dx, z + dz, ly) < 0.5)) continue;
        const i = idx(x + dx, ly, z + dz);
        if (!blocks[i]) blocks[i] = LEAVES;
      }
    }
  }
}

// ───────────────────────── persistence ─────────────────────────
let edits = {};
let saveTimer = 0;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 1500); }
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ edits, p: [player.pos.x, player.pos.y, player.pos.z, player.yaw, player.pitch], t: timeOfDay, logs: logsChopped, hot: hotbar }));
  } catch (e) { /* storage may be unavailable */ }
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; }
}

// ───────────────────────── renderer / scene ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color();
scene.fog = new THREE.Fog(0x87ceeb, 45, 105);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.magFilter = atlasTex.minFilter = THREE.NearestFilter;
atlasTex.generateMipmaps = false;
atlasTex.colorSpace = THREE.SRGBColorSpace;
const matOpaque = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
const matGlass = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, depthWrite: false });

// ───────────────────────── chunk meshing ─────────────────────────
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8, t: 2 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.7, t: 2 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0, t: 0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5, t: 1 },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9, t: 2 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65, t: 2 },
];
const UVC = [[0, 0], [1, 0], [1, 1], [0, 1]];
const chunkMeshes = new Map();
const dirty = new Set();

function newBuf() { return { p: [], u: [], c: [], i: [] }; }
function pushFace(buf, x, y, z, f, tile, shade) {
  const base = buf.p.length / 3;
  const col = tile % COLS, row = Math.floor(tile / COLS);
  const e = 0.01 / COLS;
  const u0 = col / COLS + e, u1 = (col + 1) / COLS - e;
  const v0 = 1 - (row + 1) / ROWS + e / 2, v1 = 1 - row / ROWS - e / 2;
  for (let k = 0; k < 4; k++) {
    const v = f.v[k];
    buf.p.push(x + v[0], y + v[1], z + v[2]);
    buf.u.push(UVC[k][0] ? u1 : u0, UVC[k][1] ? v1 : v0);
    buf.c.push(shade, shade, shade);
  }
  buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
function toGeom(buf) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.u, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(buf.c, 3));
  g.setIndex(buf.i);
  g.computeBoundingSphere();
  return g;
}
function buildChunk(cx, cz) {
  const key = cx + ',' + cz;
  let entry = chunkMeshes.get(key);
  if (!entry) {
    entry = { op: new THREE.Mesh(new THREE.BufferGeometry(), matOpaque), tr: new THREE.Mesh(new THREE.BufferGeometry(), matGlass) };
    entry.tr.renderOrder = 1;
    scene.add(entry.op, entry.tr);
    chunkMeshes.set(key, entry);
  }
  const op = newBuf(), tr = newBuf();
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const id = blocks[idx(x, y, z)];
    if (!id) continue;
    const d = B[id];
    const buf = d.glass ? tr : op;
    for (const f of FACES) {
      const nb = get(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (nb) {
        if (B[nb].opaque) continue;
        if (nb === id && d.glass) continue;
      }
      pushFace(buf, x, y, z, f, d.tiles[f.t], f.shade);
    }
  }
  entry.op.geometry.dispose(); entry.tr.geometry.dispose();
  entry.op.geometry = toGeom(op); entry.tr.geometry = toGeom(tr);
}
function markDirty(cx, cz) { if (cx >= 0 && cz >= 0 && cx < NC && cz < NC) dirty.add(cx + ',' + cz); }
function setBlock(x, y, z, id, record = true) {
  if (x < 0 || x >= W || z < 0 || z >= W || y < 0 || y >= H) return;
  const i = idx(x, y, z);
  if (blocks[i] === id) return;
  blocks[i] = id;
  if (record) { edits[i] = id; scheduleSave(); }
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  markDirty(cx, cz);
  if (x % CS === 0) markDirty(cx - 1, cz);
  if (x % CS === CS - 1) markDirty(cx + 1, cz);
  if (z % CS === 0) markDirty(cx, cz - 1);
  if (z % CS === CS - 1) markDirty(cx, cz + 1);
}
function flushDirty() {
  for (const k of dirty) { const [cx, cz] = k.split(',').map(Number); buildChunk(cx, cz); }
  dirty.clear();
}

// ───────────────────────── sky: sun, moon, stars ─────────────────────────
function discMesh(color, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false }));
  m.renderOrder = -1; scene.add(m); return m;
}
const sun = discMesh(0xfff2a0, 28);
const moon = discMesh(0xdde6ff, 20);
const starGeo = new THREE.BufferGeometry();
{
  const arr = [];
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
    arr.push(Math.sin(b) * Math.cos(a) * 250, Math.cos(b) * 250, Math.sin(b) * Math.sin(a) * 250);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
scene.add(stars);

let timeOfDay = 0.08; // 0 = sunrise (6:00), 0.25 = noon, 0.5 = sunset, 0.75 = midnight
const ambient = new THREE.AmbientLight(0xffffff, 1.0);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.0);
scene.add(ambient, sunLight);
const _c = new THREE.Color();
function updateSky() {
  const a = timeOfDay * Math.PI * 2;
  const elev = Math.sin(a);
  const dayF = clamp((elev + 0.15) / 0.45, 0, 1);
  const tw = Math.max(0, 1 - Math.abs(elev) / 0.22) * 0.55;
  const day = [135, 206, 235], night = [8, 12, 34], dusk = [250, 140, 80];
  const col = [0, 1, 2].map(k => {
    let v = night[k] + (day[k] - night[k]) * dayF;
    v = v + (dusk[k] - v) * tw;
    return v / 255;
  });
  scene.background.setRGB(col[0], col[1], col[2], THREE.SRGBColorSpace);
  scene.fog.color.copy(scene.background);
  const b = 0.3 + 0.7 * dayF;
  matOpaque.color.setRGB(b * (0.9 + 0.1 * dayF), b * (0.95 + 0.05 * dayF), b + (1 - dayF) * 0.25);
  matGlass.color.copy(matOpaque.color);
  ambient.intensity = 0.35 + 0.65 * dayF;
  ambient.color.setRGB(1 - (1 - dayF) * 0.4, 1 - (1 - dayF) * 0.3, 1);
  const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0.3).normalize();
  sun.position.copy(camera.position).addScaledVector(dir, 200);
  moon.position.copy(camera.position).addScaledVector(dir, -200);
  sun.lookAt(camera.position); moon.lookAt(camera.position);
  sun.visible = elev > -0.2; moon.visible = elev < 0.2;
  stars.position.copy(camera.position);
  stars.material.opacity = 1 - dayF;
  stars.visible = dayF < 0.99;
  sunLight.position.copy(dir); sunLight.intensity = 0.5 * dayF;
}

// ───────────────────────── audio ─────────────────────────
let actx = null;
function blip(freq, dur = 0.07, type = 'square', vol = 0.05) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* audio optional */ }
}

// ───────────────────────── player ─────────────────────────
const player = { pos: new THREE.Vector3(SPAWN.x + 0.5, 30, SPAWN.z + 0.5), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, fly: false };
const HALF = 0.3, HEIGHT = 1.8, EYE = 1.62;
function collides(px_, py_, pz_) {
  const x0 = Math.floor(px_ - HALF), x1 = Math.floor(px_ + HALF);
  const y0 = Math.floor(py_), y1 = Math.floor(py_ + HEIGHT - 0.001);
  const z0 = Math.floor(pz_ - HALF), z1 = Math.floor(pz_ + HALF);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (solid(x, y, z)) return true;
  return false;
}
function groundAt(x, z) { for (let y = H - 1; y >= 0; y--) if (get(x, y, z)) return y + 1; return 0; }
function respawn() {
  player.pos.set(SPAWN.x + 0.5, groundAt(SPAWN.x, SPAWN.z) + 0.1, SPAWN.z + 0.5);
  player.vel.set(0, 0, 0); player.yaw = 0; player.pitch = -0.1;
}

const keys = {};
let locked = false, paletteOpen = false;
let lastSpace = 0;
let logsChopped = 0;

function stepPlayer(dt) {
  const fwd = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  const str = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
  let speed = player.fly ? (sprint ? 16 : 9) : (sprint ? 7 : 4.4);
  let mx = 0, mz = 0;
  if (fwd || str) {
    const l = Math.hypot(fwd, str);
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    mx = (-sy * fwd + cy * str) / l; mz = (-cy * fwd - sy * str) / l;
  }
  player.vel.x = mx * speed; player.vel.z = mz * speed;
  if (player.fly) {
    player.vel.y = ((keys['Space'] ? 1 : 0) - (sprint ? 0 : 0) - (keys['ShiftLeft'] || keys['ShiftRight'] ? 1 : 0)) * 8;
    if (keys['Space'] && (keys['ShiftLeft'] || keys['ShiftRight'])) player.vel.y = 0;
    if (!(keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'])) { /* hover */ }
  } else {
    player.vel.y -= 28 * dt;
    if (player.vel.y < -50) player.vel.y = -50;
    if (keys['Space'] && player.onGround) { player.vel.y = 9; player.onGround = false; }
  }
  const p = player.pos;
  let n = p.x + player.vel.x * dt;
  if (!collides(n, p.y, p.z)) p.x = n;
  n = p.z + player.vel.z * dt;
  if (!collides(p.x, p.y, n)) p.z = n;
  n = p.y + player.vel.y * dt;
  if (!collides(p.x, n, p.z)) { p.y = n; player.onGround = false; }
  else {
    if (player.vel.y < 0) player.onGround = true;
    player.vel.y = 0;
  }
  if (p.y < -20) respawn();
}

// ───────────────────────── block picking ─────────────────────────
function raycast(maxDist = 6) {
  const o = camera.position;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
  const tdx = sx ? Math.abs(1 / dir.x) : Infinity, tdy = sy ? Math.abs(1 / dir.y) : Infinity, tdz = sz ? Math.abs(1 / dir.z) : Infinity;
  let tx = sx ? ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx) : Infinity;
  let ty = sy ? ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy) : Infinity;
  let tz = sz ? ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz) : Infinity;
  let px_ = x, py_ = y, pz_ = z, t = 0;
  while (t <= maxDist) {
    if (get(x, y, z)) return { x, y, z, prev: [px_, py_, pz_] };
    px_ = x; py_ = y; pz_ = z;
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; }
    else { z += sz; t = tz; tz += tdz; }
  }
  return null;
}
const highlight = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000 }));
highlight.visible = false; scene.add(highlight);

function breakBlock(hit) {
  const id = get(hit.x, hit.y, hit.z);
  if (!id) return;
  if (WOOD_BLOCKS.has(id)) { logsChopped++; blip(160, 0.1, 'sawtooth', 0.06); } else blip(220, 0.06, 'square');
  setBlock(hit.x, hit.y, hit.z, 0);
}
function placeBlock(hit) {
  const [x, y, z] = hit.prev;
  if (get(x, y, z)) return;
  const id = hotbar[selected];
  setBlock(x, y, z, id);
  if (collides(player.pos.x, player.pos.y, player.pos.z)) { setBlock(x, y, z, 0); delete edits[idx(x, y, z)]; return; }
  blip(id === GLASS ? 700 : 320, 0.07, 'triangle', 0.07);
}

// ───────────────────────── UI: hotbar / palette ─────────────────────────
const hotbar = [LOG, PLANKS, BPLANKS, DPLANKS, GLASS, BRICK, SHINGLE, WOOL_W, LAMP];
let selected = 0;
function iconCanvas(id) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const t = B[id].icon;
  ctx.drawImage(atlasCanvas, (t % COLS) * TILE, Math.floor(t / COLS) * TILE, TILE, TILE, 0, 0, 16, 16);
  return c;
}
const hotbarEl = document.getElementById('hotbar');
const nameEl = document.getElementById('name');
let nameTimer = 0;
function renderHotbar() {
  hotbarEl.innerHTML = '';
  hotbar.forEach((id, i) => {
    const s = document.createElement('div'); s.className = 'slot' + (i === selected ? ' sel' : '');
    s.appendChild(iconCanvas(id));
    const n = document.createElement('span'); n.textContent = i + 1; s.appendChild(n);
    s.onclick = () => { selected = i; renderHotbar(); showName(); };
    hotbarEl.appendChild(s);
  });
}
function showName() {
  nameEl.textContent = B[hotbar[selected]].name; nameEl.style.opacity = 1;
  clearTimeout(nameTimer); nameTimer = setTimeout(() => nameEl.style.opacity = 0, 1800);
}
const paletteEl = document.getElementById('palette');
const pgrid = document.getElementById('pgrid');
for (let id = 1; id < B.length; id++) {
  const s = document.createElement('div'); s.className = 'slot'; s.title = B[id].name;
  s.appendChild(iconCanvas(id));
  s.onclick = (e) => { e.stopPropagation(); hotbar[selected] = id; renderHotbar(); showName(); blip(500, 0.05, 'triangle'); };
  pgrid.appendChild(s);
}
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const clockEl = document.getElementById('clock');
const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(msg) { toastEl.textContent = msg; toastEl.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.style.opacity = 0, 2200); }
function syncMenu() { menuEl.style.display = (locked || paletteOpen) ? 'none' : 'flex'; paletteEl.style.display = paletteOpen ? 'flex' : 'none'; }
function setPalette(open) {
  paletteOpen = open;
  if (open) document.exitPointerLock(); else renderer.domElement.requestPointerLock();
  syncMenu();
}

// ───────────────────────── starter cabin (H) ─────────────────────────
function buildCabin() {
  const dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
  const size = 7;
  const x0 = Math.round(player.pos.x + dx * 7 - size / 2 + 0.5), z0 = Math.round(player.pos.z + dz * 7 - size / 2 + 0.5);
  if (x0 < 3 || z0 < 3 || x0 + size > W - 3 || z0 + size > W - 3) { toast('Too close to the world edge!'); return; }
  let base = 0;
  for (let z = z0; z < z0 + size; z++) for (let x = x0; x < x0 + size; x++) base = Math.max(base, heights[z * W + x] + 1);
  base = Math.min(base, H - 12);
  const c = size - 1;
  // which wall faces the player? that's where the door goes
  const cxm = x0 + c / 2, czm = z0 + c / 2;
  const ox = player.pos.x - cxm, oz = player.pos.z - czm;
  let door;
  if (Math.abs(ox) > Math.abs(oz)) door = ox > 0 ? 'E' : 'W'; else door = oz > 0 ? 'S' : 'N';
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = x0 + i, z = z0 + j;
    // foundation + clear room
    for (let y = heights[z * W + x]; y < base - 1; y++) setBlock(x, y, z, COBBLE);
    for (let y = base - 1; y < base + 9; y++) setBlock(x, y, z, 0);
    const edge = i === 0 || j === 0 || i === c || j === c;
    const corner = (i === 0 || i === c) && (j === 0 || j === c);
    const inner = !edge;
    // floor
    setBlock(x, base - 1, z, inner && i >= 2 && i <= 4 && j >= 2 && j <= 4 ? WOOL_B : (inner ? BPLANKS : COBBLE));
    if (edge) {
      for (let y = 0; y < 4; y++) {
        let id = corner ? LOG : PLANKS;
        if (!corner && y === 1 && (i === 2 || i === 4 || j === 2 || j === 4)) id = GLASS;
        if (!corner && y === 3) id = DLOG;
        if (corner && y === 3) id = LOG;
        setBlock(x, base + y, z, id);
      }
    }
  }
  // door opening
  const mid = 3;
  const dpos = { N: [x0 + mid, z0], S: [x0 + mid, z0 + c], W: [x0, z0 + mid], E: [x0 + c, z0 + mid] }[door];
  setBlock(dpos[0], base, dpos[1], 0); setBlock(dpos[0], base + 1, dpos[1], 0);
  setBlock(dpos[0], base + 2, dpos[1], DPLANKS);
  // stepped pyramid roof
  for (let k = 0; k < 4; k++) for (let j = k - 1; j <= c - k + 1; j++) for (let i = k - 1; i <= c - k + 1; i++) {
    if (k > 0 && (i < k || j < k || i > c - k || j > c - k)) continue;
    setBlock(x0 + i, base + 4 + k, z0 + j, SHINGLE);
  }
  // furnishings
  setBlock(x0 + 1, base, z0 + 1, WOOL_R); setBlock(x0 + 2, base, z0 + 1, WOOL_W); // bed
  setBlock(x0 + 1, base + 1, z0 + 1, 0);
  setBlock(x0 + c - 1, base, z0 + 1, SHELF); setBlock(x0 + c - 1, base + 1, z0 + 1, SHELF);
  setBlock(x0 + c - 1, base, z0 + c - 1, WOOL_Y); // armchair
  setBlock(x0 + 3, base + 3, z0 + 3, LAMP);
  // porch light outside the door
  toast('Your cozy cabin is ready! Walk in through the doorway.');
  blip(520, 0.12, 'triangle'); setTimeout(() => blip(660, 0.15, 'triangle'), 120);
}

// ───────────────────────── Sims ─────────────────────────
const sims = [];
function makeSim(shirt, pants, hair, x, z) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, mat, px_, py_, pz_) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(px_, py_, pz_); return mesh; };
  const skin = m(0xf1c9a0);
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-0.13, 0.6, 0); legR.position.set(0.13, 0.6, 0);
  legL.add(box(0.23, 0.6, 0.25, m(pants), 0, -0.3, 0)); legR.add(box(0.23, 0.6, 0.25, m(pants), 0, -0.3, 0));
  armL.position.set(-0.36, 1.25, 0); armR.position.set(0.36, 1.25, 0);
  armL.add(box(0.17, 0.6, 0.2, skin, 0, -0.28, 0)); armR.add(box(0.17, 0.6, 0.2, skin, 0, -0.28, 0));
  g.add(legL, legR, armL, armR);
  g.add(box(0.55, 0.65, 0.3, m(shirt), 0, 0.93, 0));
  g.add(box(0.42, 0.42, 0.42, skin, 0, 1.52, 0));
  g.add(box(0.46, 0.14, 0.46, m(hair), 0, 1.78, 0));
  g.add(box(0.46, 0.3, 0.1, m(hair), 0, 1.6, 0.16));
  const bob = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshBasicMaterial({ color: 0x45ff55 }));
  bob.scale.y = 1.6; bob.position.y = 2.35; g.add(bob);
  const s = { g, legL, legR, armL, armR, bob, x, z, y: groundAt(Math.floor(x), Math.floor(z)), tx: x, tz: z, wait: 1 + Math.random() * 2, walk: 0, yaw: 0, t: Math.random() * 10 };
  g.position.set(x, s.y, z);
  scene.add(g); sims.push(s);
}
function simGround(x, z, y) {
  const fx = Math.floor(x), fz = Math.floor(z), fy = Math.floor(y);
  for (let cy = fy + 1; cy >= fy - 4; cy--) {
    if (solid(fx, cy, fz) && !solid(fx, cy + 1, fz) && !solid(fx, cy + 2, fz)) return cy + 1;
  }
  return null;
}
function stepSims(dt) {
  for (const s of sims) {
    s.t += dt;
    s.bob.rotation.y += dt * 2; s.bob.position.y = 2.35 + Math.sin(s.t * 3) * 0.08;
    if (s.wait > 0) {
      s.wait -= dt; s.walk *= 0.85;
      if (s.wait <= 0) {
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 9;
        s.tx = clamp(s.x + Math.cos(a) * r, 2, W - 2); s.tz = clamp(s.z + Math.sin(a) * r, 2, W - 2);
      }
    } else {
      const ddx = s.tx - s.x, ddz = s.tz - s.z, d = Math.hypot(ddx, ddz);
      if (d < 0.3) { s.wait = 1.5 + Math.random() * 3; continue; }
      const sp = 1.7 * dt;
      const nx = s.x + ddx / d * sp, nz = s.z + ddz / d * sp;
      const gy = simGround(nx, nz, s.y);
      if (gy === null || gy - s.y > 1.01) { s.wait = 0.4 + Math.random(); }
      else { s.x = nx; s.z = nz; s.y += (gy - s.y) * Math.min(1, dt * 10); s.yaw = Math.atan2(ddx, ddz); s.walk += dt * 9; }
    }
    s.g.position.set(s.x, s.y, s.z);
    s.g.rotation.y = s.yaw;
    const sw = Math.sin(s.walk) * 0.7 * (s.wait > 0 ? 0 : 1);
    s.legL.rotation.x = sw; s.legR.rotation.x = -sw; s.armL.rotation.x = -sw; s.armR.rotation.x = sw;
  }
}

// ───────────────────────── input ─────────────────────────
const canvas = renderer.domElement;
menuEl.addEventListener('click', () => { canvas.requestPointerLock(); blip(400, 0.05, 'triangle'); });
paletteEl.addEventListener('click', () => setPalette(false));
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; syncMenu(); if (!locked) { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; save(); } });
document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0023;
  player.pitch = clamp(player.pitch - e.movementY * 0.0023, -1.55, 1.55);
});
const mouse = { l: false, r: false, cd: 0 };
canvas.addEventListener('mousedown', (e) => {
  if (!locked) return;
  const hit = raycast();
  if (e.button === 0) { mouse.l = true; mouse.cd = 0.25; if (hit) breakBlock(hit); }
  if (e.button === 2) { mouse.r = true; mouse.cd = 0.25; if (hit) placeBlock(hit); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => {
  if (!locked) return;
  selected = (selected + (e.deltaY > 0 ? 1 : 8)) % 9; renderHotbar(); showName();
});
addEventListener('keydown', (e) => {
  if (e.code === 'KeyB') { setPalette(!paletteOpen); return; }
  if (/^Digit[1-9]$/.test(e.code)) { selected = +e.code.slice(5) - 1; renderHotbar(); showName(); return; }
  if (!locked) return;
  keys[e.code] = true;
  if (e.code === 'Space') {
    const now = performance.now();
    if (now - lastSpace < 280) { player.fly = !player.fly; player.vel.y = 0; toast(player.fly ? 'Build mode: flying (double-tap Space to land)' : 'Walking mode'); }
    lastSpace = now;
  }
  if (e.code === 'KeyH') buildCabin();
  if (e.code === 'KeyT') timeOfDay = (timeOfDay > 0.0 && timeOfDay < 0.5) ? 0.75 : 0.25;
  if (e.code === 'KeyR') { respawn(); toast('Back home'); }
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('beforeunload', save);

// ───────────────────────── main ─────────────────────────
generate();
const saved = loadSave();
if (saved) {
  edits = saved.edits || {};
  for (const k in edits) blocks[+k] = edits[k];
  if (saved.hot && saved.hot.length === 9) saved.hot.forEach((v, i) => { if (B[v]) hotbar[i] = v; });
  logsChopped = saved.logs || 0;
  if (typeof saved.t === 'number') timeOfDay = saved.t;
}
for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) buildChunk(cx, cz);
respawn();
if (saved && saved.p) { player.pos.set(saved.p[0], saved.p[1] + 0.2, saved.p[2]); player.yaw = saved.p[3]; player.pitch = saved.p[4]; }
makeSim(0xd94f7a, 0x35466b, 0x3b2a1a, SPAWN.x + 4.5, SPAWN.z + 3.5);
makeSim(0x3aa8c9, 0x4a3b2a, 0xe0b040, SPAWN.x - 5.5, SPAWN.z + 6.5);
renderHotbar();

let last = performance.now(), hudT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (locked) {
    stepPlayer(dt);
    mouse.cd -= dt;
    if (mouse.cd <= 0 && (mouse.l || mouse.r)) {
      const hit = raycast();
      if (hit) { if (mouse.l) breakBlock(hit); else placeBlock(hit); }
      mouse.cd = 0.2;
    }
  }
  timeOfDay = (timeOfDay + dt / DAY_SECONDS) % 1;
  stepSims(dt);
  camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  flushDirty();
  updateSky();
  const hit = locked ? raycast() : null;
  if (hit) { highlight.visible = true; highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); } else highlight.visible = false;
  renderer.render(scene, camera);
  hudT += dt;
  if (hudT > 0.25) {
    hudT = 0;
    hudEl.innerHTML = `📍 ${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)}, ${player.pos.z.toFixed(0)}<br>🪵 Logs chopped: ${logsChopped}<br>${player.fly ? '🕊️ Build mode (flying)' : '🚶 Walking'}`;
    const hr = (timeOfDay * 24 + 6) % 24;
    clockEl.textContent = `${hr < 6 || hr >= 18 ? '🌙' : '☀️'} ${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.floor((hr % 1) * 60)).padStart(2, '0')}`;
  }
}
requestAnimationFrame(frame);
window.__game = { raycast, player, get: get, setBlock, buildCabin, camera, scene, renderer, sims, setTime: (t) => { timeOfDay = t; }, lockForTest: () => { locked = true; syncMenu(); } };
