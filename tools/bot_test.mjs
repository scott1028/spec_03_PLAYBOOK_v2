import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('pipeline.config.json', 'utf8'));

const run = spawnSync(
  config.godotPath,
  ['--headless', '--path', 'game', '--fixed-fps', '60', '--quit-after', '1800', '--', '--bot'],
  { encoding: 'utf8', timeout: 300_000 },
);

const lines = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.split('\n').map((line) => line.trim());
const hasAllCoins = lines.includes('COIN 3/3');
const hasWin = lines.includes('WIN');
const hasError = lines.some((line) => line.includes('SCRIPT ERROR') || line.includes('ERROR:'));

lines
  .filter((line) => /^(COIN |WIN$|NEED_COINS)|ERROR|WARNING/.test(line))
  .forEach((line) => console.log(line));
if (run.error) console.log(`BOT: ${run.error.message}`);

const isPassed = hasAllCoins && hasWin && !hasError;
console.log(`BOT: ${isPassed ? 'PASS' : 'FAIL'} (COIN 3/3=${hasAllCoins}, WIN=${hasWin}, error=${hasError})`);
process.exit(isPassed ? 0 : 1);
