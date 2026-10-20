import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const servers = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const server of servers) if (server.exitCode === null) server.kill('SIGTERM');
}
for (const [project, port] of [['deployments', 4188], ['ninth-pane', 4177]]) {
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', `${project}/dist`], {cwd: root, stdio: 'inherit'});
  servers.push(child);
  child.on('error', error => {console.error(`${project}: ${error.message}`); stop(1);});
  child.on('exit', code => {if (!stopping) stop(code || 1);});
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('Game library: http://127.0.0.1:4188/?game=deployments');
console.log('The Ninth Pane: http://127.0.0.1:4177/');
