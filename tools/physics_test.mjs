import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('pipeline.config.json', 'utf8'));

const run = spawnSync(
  config.godotPath,
  ['--headless', '--path', 'game', '--fixed-fps', '60', '-s', 'res://tools/physics_test.gd'],
  { encoding: 'utf8', timeout: 300_000 },
);

const lines = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.split('\n').map((line) => line.trim());
const hasPass = lines.includes('PHYSICS_TEST: PASS');
const hasError = lines.some((line) => line.includes('SCRIPT ERROR') || line.includes('ERROR:'));

lines
  .filter((line) => /^(PASS|FAIL|PHYSICS_TEST|TREE_HIT)|ERROR|WARNING/.test(line))
  .forEach((line) => console.log(line));
if (run.error) console.log(`PHYSICS: ${run.error.message}`);

const isPassed = hasPass && !hasError && run.status === 0;
console.log(`PHYSICS: ${isPassed ? 'PASS' : 'FAIL'} (exit=${run.status}, error=${hasError})`);
process.exit(isPassed ? 0 : 1);
