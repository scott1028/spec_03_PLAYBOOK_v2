import { writeFileSync } from 'node:fs';

// Generates game/scenes/world.tscn (diorama props) from the layout below.
// Godot coords: x = east, z = south (camera sits south-east, so tall props go north / west).

const HALF = 20;
const WALL_LENGTH = 4;
const BOT_PATH = [[0, 0], [6, 0], [6, 8], [-4, 8], [-8, -6]];
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

// [kind, x, z, yawDeg = 0, scale = 1]
const PROPS = [
  // north: ancient district + village
  ['mage_tower', -15, -15, 20],
  ['temple_ruins', -8, -14],
  ['house', 3, -15],
  ['house', 9.5, -15.5, -10],
  ['house', 15.5, -9, -90],
  ['wall_brick', 6, -10.5],
  ['wall_brick', 10, -10.5],
  ['crate', 12.6, -12.6, 15],
  ['crate', 11.7, -12, -10, 0.85],
  ['crate', 14.1, -5.9, -5, 0.85],
  ['barrel', 8, -7.5],
  ['barrel', 8.7, -8.1],
  ['barrel', 14, -3],
  ['barrel', 2.5, -7],
  // west forest
  ['tree', -17.5, -9, 0, 1.1],
  ['tree', -14, -7, 40],
  ['tree', -17, -4.5, 75, 0.9],
  ['tree', -13.5, -2, 120],
  ['tree', -17.5, 0.5, 200, 1.15],
  ['tree', -15, 4, 260, 0.95],
  ['tree', -17.5, 7.5, 300],
  ['tree', -13.5, 9.5, 20, 1.1],
  ['tree', -16.5, 12.5, 90],
  ['tree', -13, 15.5, 150, 0.9],
  ['tree', -17.5, 17, 210, 1.05],
  // trees along the north / east / south edges
  ['tree', -11.5, -18, 30, 0.95],
  ['tree', -3, -17.5, 100],
  ['tree', 0, -18, 160, 1.1],
  ['tree', 13.5, -18, 220],
  ['tree', 17.5, -17, 280, 0.9],
  ['tree', 17.5, 3.5, 10],
  ['tree', 17, 9, 130, 1.1],
  ['tree', 18, 14.5, 250],
  ['tree', -6, 17.5, 60, 0.95],
  ['tree', 6, 18, 190],
  ['tree', 12, 17, 310, 1.05],
  // rocks
  ['rock', -11, 6.5, 30],
  ['rock', -10, -9.5, 110, 0.8],
  ['rock', 14, 7, 200],
  ['rock', 16.5, 13, 45, 1.2],
  ['rock', -4, 15, 300, 0.9],
  ['rock', 3.5, 16.5, 150],
  ['rock', 10.5, 12.5, 80, 0.7],
  ['rock', -16, -17.5, 10, 1.1],
  // south-west walled garden
  ['wall_brick', -8, 10.5],
  ['wall_brick', -10.25, 12.5, 90],
  ['bush', -8, 12.3, 30, 0.9],
  ['bush', -6.8, 13.6, 160, 0.8],
  // south yard and mid-field fillers
  ['crate', 4.5, 11, 20],
  ['crate', 5.4, 11.7, -15, 0.85],
  ['barrel', 3.6, 11.8],
  ['rock', 9, 3, 140, 0.8],
  ['tree', -9, 4, 70, 0.9],
  ['tree', 10, -3, 330],
  ['tree', 9.5, 6, 20, 0.85],
  // bushes (no collision; the one at (-1, 8.2) sits on the bot path on purpose)
  ['bush', -1, 8.2, 0],
  ['bush', -10.5, -1, 60],
  ['bush', -11, 12.5, 120, 1.2],
  ['bush', 3, -4, 200],
  ['bush', 12, 10.5, 30, 0.9],
  ['bush', -2.5, 13, 300],
  ['bush', 8.5, 14.5, 90, 1.1],
  ['bush', 16.5, -13.5, 150],
  ['bush', -6, -9.5, 240, 0.9],
  ['bush', 5, -12, 10],
  ['bush', 18, -4, 330],
  ['bush', -18, -13, 75, 1.1],
];

// dirt paths: [fromX, fromZ, toX, toZ, width]
const PATHS = [
  [0, 0, -8, -11.8, 1.8],
  [0, 0, 8, -9.6, 1.8],
  [0, 0, 2, 16, 1.6],
];
const PLAZA_RADIUS = 3;

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

const usedKinds = [...new Set(props.map(([kind]) => kind))];
const extIds = Object.fromEntries(usedKinds.map((kind, i) => [kind, `${i + 1}_${kind}`]));
const lines = ['[gd_scene format=3]', ''];
for (const kind of usedKinds) {
  lines.push(`[ext_resource type="PackedScene" path="${KINDS[kind].path}" id="${extIds[kind]}"]`);
}
lines.push(
  '',
  '[sub_resource type="StandardMaterial3D" id="dirt_material"]',
  'albedo_color = Color(0.36, 0.24, 0.13, 1)',
  '',
  '[sub_resource type="BoxMesh" id="slab_mesh"]',
  'material = SubResource("dirt_material")',
  `size = Vector3(${2 * HALF + 1}, 2, ${2 * HALF + 1})`,
  '',
  '[sub_resource type="StandardMaterial3D" id="path_material"]',
  'albedo_color = Color(0.62, 0.5, 0.32, 1)',
  '',
  '[sub_resource type="CylinderMesh" id="plaza_mesh"]',
  'material = SubResource("path_material")',
  `top_radius = ${PLAZA_RADIUS}`,
  `bottom_radius = ${PLAZA_RADIUS}`,
  'height = 0.02',
  'radial_segments = 32',
  'rings = 1',
);
PATHS.forEach(([fx, fz, tx, tz, width], i) => {
  lines.push('', `[sub_resource type="PlaneMesh" id="path_mesh_${i + 1}"]`, 'material = SubResource("path_material")');
  lines.push(`size = Vector2(${formatNumber(width)}, ${formatNumber(Math.hypot(tx - fx, tz - fz))})`);
});

lines.push('', '[node name="World" type="Node3D"]', '');
lines.push('[node name="Slab" type="MeshInstance3D" parent="."]', `transform = ${formatTransform(0, -1.02, 0)}`, 'mesh = SubResource("slab_mesh")', '');
lines.push('[node name="Plaza" type="MeshInstance3D" parent="."]', `transform = ${formatTransform(0, 0.012, 0)}`, 'mesh = SubResource("plaza_mesh")', '');
PATHS.forEach(([fx, fz, tx, tz], i) => {
  const yawDeg = (Math.atan2(tx - fx, tz - fz) * 180) / Math.PI;
  lines.push(`[node name="Path${i + 1}" type="MeshInstance3D" parent="."]`);
  lines.push(`transform = ${formatTransform((fx + tx) / 2, 0.008, (fz + tz) / 2, yawDeg)}`, `mesh = SubResource("path_mesh_${i + 1}")`, '');
});

const groups = [...new Set(props.map(([kind]) => KINDS[kind].group))];
const kindCounts = {};
for (const group of groups) {
  lines.push(`[node name="${group}" type="Node3D" parent="."]`, '');
  for (const [kind, x, z, yawDeg = 0, scale = 1] of props.filter(([kind]) => KINDS[kind].group === group)) {
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    const name = `${kind.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}${String(kindCounts[kind]).padStart(2, '0')}`;
    lines.push(`[node name="${name}" parent="${group}" instance=ExtResource("${extIds[kind]}")]`);
    lines.push(`transform = ${formatTransform(x, 0, z, yawDeg, scale)}`, '');
  }
}

writeFileSync('game/scenes/world.tscn', lines.join('\n'));
console.log(`BUILD_WORLD: ${props.length} props (${PROPS.length} placed + ${props.length - PROPS.length} walls), ${PATHS.length} paths → game/scenes/world.tscn`);
