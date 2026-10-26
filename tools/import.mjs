import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('pipeline.config.json', 'utf8'));

const run = spawnSync(config.godotPath, ['--headless', '--path', 'game', '--import'], {
  encoding: 'utf8',
  timeout: 300_000,
});

const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
const issueLines = output.split('\n').filter((line) => /ERROR|WARNING/.test(line));
issueLines.forEach((line) => console.log(line));

if (run.error) console.log(`IMPORT: ${run.error.message}`);
console.log(`IMPORT: exit ${run.status}, ${issueLines.length} ERROR/WARNING lines`);
process.exit(run.status === 0 ? 0 : 1);
