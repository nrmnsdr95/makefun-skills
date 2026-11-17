import { cpSync, mkdirSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readGameTree } from './vendor/makefun-game.ts';

// Entrypoint for the offline program/v1 grader. The browser build is already static.
const root = dirname(fileURLToPath(import.meta.url));
const requestedOutput = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const caps = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function publishVoyage(source: string, output: string): void {
  const game = join(source, 'game');
  const shots = join(source, 'screenshots');
  readGameTree(game, caps);
  const images = readdirSync(shots, { withFileTypes: true }).filter(entry => !entry.name.startsWith('.'));
  if (images.length < 3 || images.length > caps.screenshots.max || images.some(entry => !entry.isFile())) {
    throw new Error('Lumen Tow needs three or four regular screenshot files in screenshots/.');
  }
  mkdirSync(output, { recursive: true });
  const target = realpathSync(output);
  const sourceRoot = realpathSync(source);
  if (target === sourceRoot || [game, shots, join(source, 'vendor')].some(path => target === path || target.startsWith(path + sep))) {
    throw new Error('Choose an output directory separate from the game, screenshots and kit files.');
  }
  if (readdirSync(target).length !== 0) throw new Error('Choose an empty MAKEFUN_OUTPUT_DIR.');
  cpSync(game, join(target, 'game'), { recursive: true });
  mkdirSync(join(target, 'screenshots'));
  for (const image of images) cpSync(join(shots, image.name), join(target, 'screenshots', image.name));
  writeFileSync(join(target, 'dossier.json'), buildDossier(target, caps));
}

publishVoyage(root, requestedOutput);
