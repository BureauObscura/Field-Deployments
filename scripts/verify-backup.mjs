import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'backup-manifest.json'), 'utf8'));
const seen = new Set();
let bytes = 0;
for (const entry of manifest.files) {
  const file = path.resolve(root, entry.path);
  if (!file.startsWith(root) || seen.has(entry.path)) throw Error(`Invalid or duplicate backup path: ${entry.path}`);
  seen.add(entry.path);
  if (!(await fs.lstat(file)).isFile()) throw Error(`Backup entry is not a regular file: ${entry.path}`);
  const data = await fs.readFile(file);
  if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error(`Backup checksum mismatch: ${entry.path}`);
  bytes += data.length;
}
console.log(JSON.stringify({files: seen.size, bytes, checksums: 'PASS'}));
