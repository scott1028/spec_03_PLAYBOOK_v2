import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';

const config = JSON.parse(readFileSync('pipeline.config.json', 'utf8'));

const godot = spawnSync(config.godotPath, ['--version'], { encoding: 'utf8', timeout: 30_000 });
const godotVersion = godot.status === 0 ? godot.stdout.trim() : '';
console.log(godotVersion ? `OK  godot ${godotVersion}` : `NG  godot: cannot run ${config.godotPath}`);

const canConnectBlender = await new Promise((resolve) => {
  const socket = net.createConnection({ host: 'localhost', port: config.blenderPort });
  socket.setTimeout(3000);
  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.once('timeout', () => {
    socket.destroy();
    resolve(false);
  });
  socket.once('error', () => resolve(false));
});
console.log(`${canConnectBlender ? 'OK' : 'NG'}  blender localhost:${config.blenderPort}`);

process.exit(godotVersion && canConnectBlender ? 0 : 1);
