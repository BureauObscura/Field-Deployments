import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot, imageDimensions, readGames } from './check.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const design = path.join(projectRoot, 'design');
const receipts = (await fs.readdir(design)).filter(name => name.endsWith('-image-receipts.json')).sort();
const images = [];
for (const receipt of receipts) {
  const data = JSON.parse(await fs.readFile(path.join(design, receipt), 'utf8'));
  for (const row of Array.isArray(data) ? data : data.images || data.scenes || []) {
    const sourcePath = row.sourcePath || row.nativePath || row.nativeCopyPath;
    const webPath = (row.webPath || row.deliveryPath).replace(/^dist\//, '');
    const source = await fs.readFile(path.join(projectRoot, sourcePath));
    const web = await fs.readFile(path.join(projectRoot, 'dist', webPath));
    const native = imageDimensions(source), delivered = imageDimensions(web);
    const sourceSha256 = hash(source), sha256 = hash(web);
    const recordedSource = row.sourceSha256 || row.nativeSha256;
    const recordedWeb = row.sha256 || row.webSha256 || row.deliverySha256;
    if (recordedSource !== sourceSha256 || recordedWeb !== sha256) throw Error(`${receipt}/${row.scene}: receipt hash mismatch`);
    if (native.width !== native.height || delivered.width !== delivered.height) throw Error(`${webPath}: non-square image`);
    if (native.width !== delivered.width || native.height !== delivered.height) throw Error(`${webPath}: dimensions changed during encoding`);
    if (typeof row.prompt !== 'string' || !row.prompt.trim()) throw Error(`${webPath}: missing actual prompt`);
    if (typeof row.qa === 'object' && row.qa.status !== 'accepted') throw Error(`${webPath}: visual QA is not accepted`);
    images.push({
      webPath, width: delivered.width, height: delivered.height, sha256,
      sourcePath, sourceSha256, sourceWidth: native.width, sourceHeight: native.height,
      generated: true, tool: 'image_gen.imagegen', modelVersion: 'not exposed by tool',
      prompt: row.prompt, receipt: `design/${receipt}`, scene: row.scene,
      qa: row.qa, encoding: row.encoding || row.conversion || { format: 'JPEG', quality: 88, subsampling: 0, progressive: true, resized: false, cropped: false, retouched: false }
    });
  }
}
images.sort((a, b) => a.webPath.localeCompare(b.webPath));
if (new Set(images.map(image => image.webPath)).size !== images.length) throw Error('Duplicate image path');
await fs.writeFile(path.join(projectRoot, 'docs/image-provenance.json'), JSON.stringify({
  format: 'bureau-deployments-image-provenance-v1',
  note: 'Native square generation originals are preserved. Web files are format-only JPEG encodings. Visual acceptance is project QA, not owner approval or a Field Recovery benchmark score.',
  images
}, null, 2) + '\n');
const games = await readGames();
const expected = 1 + games.reduce((sum, game) => sum + game.scenes.length + game.evidence.length, 0);
console.log(JSON.stringify({ images: images.length, expected, complete: images.length === expected }));
