import { readFileSync, writeFileSync } from 'node:fs';

// Generates game/scenes/world.tscn (diorama props) from world_layout.json.
// Godot coords: x = east, z = south (camera sits south-east, so tall props go north / west).

const HALF = 20;
const WALL_LENGTH = 4;
const MIN_PATH_GAP = 1.0; // robot radius 0.3 + margin

// radius: collision footprint used for the bot path check; null = no collision
const KINDS = {
  wall_brick: { group: 'Walls', path: 'res://assets/wall_brick.glb', radius: 2.0 },
  tree: { group: 'Trees', path: 'res://scenes/tree.tscn', radius: 0.3 },
  bush: { group: 'Bushes', path: 'res://scenes/bush.tscn', radius: null },
  rock: { group: 'Rocks', path: 'res://assets/rock.glb', radius: 0.75 },
  barrel: { group: 'Barrels', path: 'res://scenes/barrel.tscn', radius: 1.5 },
  crate: { group: 'Props', path: 'res://assets/crate.glb', radius: 0.75 },
  house: { group: 'Buildings', path: 'res://assets/house.glb', radius: 2.7 },
  mage_tower: { group: 'Buildings', path: 'res://assets/mage_tower.glb', radius: 1.6 },
  temple_ruins: { group: 'Buildings', path: 'res://assets/temple_ruins.glb', radius: 3.6 },
};

const layout = JSON.parse(readFileSync('world_layout.json', 'utf8'));
const BOT_PATH = layout.bot_path;
// [kind, x, z, yawDeg = 0, scale = 1]
const PROPS = Object.values(layout.props).flat();
// Ground heights exported from Blender with the terrain asset
const terrain = JSON.parse(readFileSync('pipeline/terrain_heights.json', 'utf8'));
// Sink props a little so their base never floats on slopes
const SINK = { tree: 0.05, rock: 0.1, bush: 0.03 };
const FLAT_TOLERANCE = 0.03;

const getPerimeterWalls = () => {
  const walls = [];
  for (let c = -HALF + WALL_LENGTH / 2; c < HALF; c += WALL_LENGTH) {
    walls.push(['wall_brick', c, -HALF], ['wall_brick', c, HALF], ['wall_brick', -HALF, c, 90], ['wall_brick', HALF, c, 90]);
  }
  return walls;
};

const getSegmentDistance = ([px, pz], [ax, az], [bx, bz]) => {
  const [dx, dz] = [bx - ax, bz - az];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

const getPathBlockers = (props) =>
  props.filter(([kind, x, z]) => {
    const { radius } = KINDS[kind];
    if (radius === null) return false;
    const distance = Math.min(...BOT_PATH.slice(1).map((end, i) => getSegmentDistance([x, z], BOT_PATH[i], end)));
    return distance - radius < MIN_PATH_GAP;
  });

const getHeight = (x, z) => {
  const { origin, step, count, heights } = terrain;
  const [fx, fz] = [(x - origin[0]) / step, (z - origin[1]) / step];
  const [ix, iz] = [Math.min(Math.floor(fx), count - 2), Math.min(Math.floor(fz), count - 2)];
  const [tx, tz] = [fx - ix, fz - iz];
  const row = (r) => heights[r][ix] * (1 - tx) + heights[r][ix + 1] * tx;
  return row(iz) * (1 - tz) + row(iz + 1) * tz;
};

const formatNumber = (n) => String(Number(n.toFixed(4)));

// Transform3D is written row-major: yaw around Y, uniform scale, then origin
const formatTransform = (x, y, z, yawDeg = 0, scale = 1) => {
  const yaw = (yawDeg * Math.PI) / 180;
  const [c, s] = [Math.cos(yaw) * scale, Math.sin(yaw) * scale];
  return `Transform3D(${[c, 0, s, 0, scale, 0, -s, 0, c, x, y, z].map(formatNumber).join(', ')})`;
};

const props = [...getPerimeterWalls(), ...PROPS];
const blockers = getPathBlockers(PROPS);
if (blockers.length > 0) {
  console.log(`BUILD_WORLD: props too close to the bot path: ${JSON.stringify(blockers)}`);
  process.exit(1);
}
const unevenPads = layout.flat_pads.filter(([x, z]) => Math.abs(getHeight(x, z)) > FLAT_TOLERANCE);
if (unevenPads.length > 0) {
  console.log(`BUILD_WORLD: flat pads are not level, re-export the terrain: ${JSON.stringify(unevenPads)}`);
  process.exit(1);
}

const usedKinds = [...new Set(props.map(([kind]) => kind))];
const extIds = Object.fromEntries(usedKinds.map((kind, i) => [kind, `${i + 1}_${kind}`]));
const lines = ['[gd_scene format=3]', ''];
for (const kind of usedKinds) {
  lines.push(`[ext_resource type="PackedScene" path="${KINDS[kind].path}" id="${extIds[kind]}"]`);
}
lines.push('', '[node name="World" type="Node3D"]', '');

const groups = [...new Set(props.map(([kind]) => KINDS[kind].group))];
const kindCounts = {};
for (const group of groups) {
  lines.push(`[node name="${group}" type="Node3D" parent="."]`, '');
  for (const [kind, x, z, yawDeg = 0, scale = 1] of props.filter(([kind]) => KINDS[kind].group === group)) {
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    const name = `${kind.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}${String(kindCounts[kind]).padStart(2, '0')}`;
    lines.push(`[node name="${name}" parent="${group}" instance=ExtResource("${extIds[kind]}")]`);
    lines.push(`transform = ${formatTransform(x, getHeight(x, z) - (SINK[kind] ?? 0), z, yawDeg, scale)}`, '');
  }
}

writeFileSync('game/scenes/world.tscn', lines.join('\n'));
console.log(`BUILD_WORLD: ${props.length} props (${PROPS.length} placed + ${props.length - PROPS.length} walls) on terrain → game/scenes/world.tscn`);
