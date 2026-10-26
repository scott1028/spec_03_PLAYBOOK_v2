import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('pipeline.config.json', 'utf8'));
const { assets } = JSON.parse(readFileSync('assets.json', 'utf8'));
const { relative, absoluteMin } = config.sizeTolerance;

// size_m uses Godot axes; Godot (X, Y, Z) = Blender (X, Z, -Y)
const AXES = [
  { label: 'X 寬', blenderAxis: 'X' },
  { label: 'Y 高', blenderAxis: 'Z' },
  { label: 'Z 深', blenderAxis: 'Y' },
];
const ORIGIN_TOLERANCE = 0.02;
const LOAD_FIXES = {
  not_found_or_not_imported: '找不到 glb 或尚未 import → 用附錄 A 標準 export 後執行 node tools/import.mjs',
  load_failed: 'glb 載入失敗 → 重新 export 後執行 node tools/import.mjs',
  no_mesh: 'glb 裡沒有 mesh → 確認 collection 可見且內有 mesh 物件後重新 export',
  no_inspect_result: 'inspect 沒有回傳此資產 → 檢查 Godot 輸出',
};

const formatNumber = (n) => n.toFixed(2);
const formatSigned = (n) => (n >= 0 ? `+${formatNumber(n)}` : formatNumber(n));
const formatSize = (size) => size.map((n) => `${formatNumber(n)}m`).join(' × ');

const getSizeMismatches = (specSize, actualSize) =>
  AXES.map((axis, i) => ({ ...axis, spec: specSize[i], actual: actualSize[i] }))
    .filter(({ spec, actual }) => Math.abs(actual - spec) > Math.max(relative * spec, absoluteMin));

const getScaleFix = (mismatches) =>
  mismatches
    .map(({ label, blenderAxis, spec, actual }) => {
      const scale = actual > 0 ? (spec / actual).toFixed(3) : '?';
      return `${label} ${formatNumber(actual)}m，規格 ${formatNumber(spec)}m → 在 Blender 沿 ${blenderAxis} 軸縮放 ${scale} 後 apply scale`;
    })
    .join('；');

const checkAsset = (id, inspect) => {
  const spec = assets[id];
  const statsPath = `pipeline/blender_stats/${id}.json`;
  const stats = existsSync(statsPath) ? JSON.parse(readFileSync(statsPath, 'utf8')) : null;
  const isLoaded = !inspect.error;
  const checks = [];
  const addCheck = (name, isPassed, detail, fix) =>
    checks.push({ name, status: isPassed ? 'PASS' : 'FAIL', detail, fix });
  const skipCheck = (name, detail) => checks.push({ name, status: 'SKIP', detail });

  addCheck('載入', isLoaded, inspect.error ?? '', LOAD_FIXES[inspect.error]);

  const blenderMismatches = stats ? getSizeMismatches(spec.size_m, stats.size_m) : [];
  const isBlenderSizePassed = Boolean(stats) && blenderMismatches.length === 0;
  if (stats) {
    addCheck('Blender 尺寸', isBlenderSizePassed, formatSize(stats.size_m), getScaleFix(blenderMismatches));
  } else {
    addCheck('Blender 尺寸', false, `缺 ${statsPath}`, `缺 ${statsPath} → 用附錄 A 標準 export 重新匯出`);
  }

  let isPipelineIssue = false;
  if (isLoaded) {
    const godotMismatches = getSizeMismatches(spec.size_m, inspect.aabb_size);
    isPipelineIssue = isBlenderSizePassed && godotMismatches.length > 0;
    const godotFix = isPipelineIssue
      ? `Blender 尺寸正確但 Godot 量到 ${formatSize(inspect.aabb_size)} → 檢查 transform_apply 與 glTF 匯出軸向（+Y Up）`
      : getScaleFix(godotMismatches);
    addCheck('Godot 尺寸', godotMismatches.length === 0, formatSize(inspect.aabb_size), godotFix);
  } else {
    skipCheck('Godot 尺寸', '載入失敗');
  }

  if (isLoaded && spec.origin === 'bottom_center') {
    const [minX, minY, minZ] = inspect.aabb_min;
    const [sizeX, , sizeZ] = inspect.aabb_size;
    const [centerX, bottomY, centerZ] = [minX + sizeX / 2, minY, minZ + sizeZ / 2];
    const isCentered = [centerX, bottomY, centerZ].every((n) => Math.abs(n) <= ORIGIN_TOLERANCE);
    const detail = `center x=${formatNumber(centerX)} bottom y=${formatNumber(bottomY)} center z=${formatNumber(centerZ)}`;
    const fix = `原點偏移（${detail}）→ 在 Blender 移動 X ${formatSigned(-centerX)}、Y ${formatSigned(centerZ)}、Z ${formatSigned(-bottomY)}，讓底部 z=0、XY 置中`;
    addCheck('原點', isCentered, detail, fix);
  } else {
    skipCheck('原點', isLoaded ? `origin=${spec.origin} 不檢查` : '載入失敗');
  }

  if (stats) {
    const fix = `面數 ${stats.tris}，上限 ${spec.max_tris} → 降低 segments / ring_count 或加 Decimate modifier`;
    addCheck('面數', stats.tris <= spec.max_tris, `${stats.tris}/${spec.max_tris}`, fix);
  } else {
    skipCheck('面數', `缺 ${statsPath}`);
  }

  if (isLoaded) {
    const isCollisionPassed = spec.collision !== 'col' || inspect.has_collision;
    const fix = '沒有碰撞體 → mesh 物件名稱加 -col 後綴後重新 export';
    addCheck('碰撞', isCollisionPassed, `spec=${spec.collision} has_collision=${inspect.has_collision}`, fix);

    const missingAnims = spec.anims.filter((name) => !inspect.anims.includes(name));
    const animFix = `缺少動畫 ${missingAnims.join(', ')} → 在 Blender 建立同名 Action 後重新 export`;
    addCheck('動畫', missingAnims.length === 0, `[${inspect.anims.join(', ')}]`, animFix);
  } else {
    skipCheck('碰撞', '載入失敗');
    skipCheck('動畫', '載入失敗');
  }

  return { checks, isPipelineIssue };
};

const argIds = process.argv.slice(2);
const ids = argIds.length > 0 ? argIds : Object.keys(assets);
const unknownIds = ids.filter((id) => !assets[id]);
if (unknownIds.length > 0) {
  console.log(`unknown asset id: ${unknownIds.join(', ')}`);
  process.exit(1);
}

const run = spawnSync(
  config.godotPath,
  ['--headless', '--path', 'game', '-s', 'res://tools/inspect_assets.gd', '--', ...ids.map((id) => `res://assets/${id}.glb`)],
  { encoding: 'utf8', timeout: 300_000 },
);
const inspectLine = (run.stdout ?? '').split('\n').find((line) => line.startsWith('INSPECT_JSON:'));
if (!inspectLine) {
  console.log('INSPECT_JSON line not found. Godot output:');
  console.log(`${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim());
  process.exit(1);
}
const inspectResults = JSON.parse(inspectLine.slice('INSPECT_JSON:'.length));

let passCount = 0;
for (const id of ids) {
  const inspect = inspectResults[`res://assets/${id}.glb`] ?? { error: 'no_inspect_result' };
  const { checks, isPipelineIssue } = checkAsset(id, inspect);
  console.log(`[${id}]`);
  for (const { name, status, detail, fix } of checks) {
    console.log(`  ${status} ${name}${detail ? `: ${detail}` : ''}`);
    if (status === 'FAIL') console.log(`FIX ${id}: ${fix}`);
  }
  if (isPipelineIssue) console.log('PIPELINE: export/軸向問題，不是建模問題');
  if (checks.every(({ status }) => status !== 'FAIL')) passCount += 1;
}

const failCount = ids.length - passCount;
console.log(`SUMMARY: ${passCount} pass, ${failCount} fail`);
process.exit(failCount > 0 ? 1 : 0);
