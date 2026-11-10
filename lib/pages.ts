// Build-time only (used from getStaticProps/getStaticPaths): reads content/.
import fs from 'node:fs';
import path from 'node:path';
import type { PageContent, Route } from './content';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export function getRoutes(): Route[] {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'routes.json'), 'utf8'));
}

export function getPage(id: string): PageContent {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'pages', `${id}.json`), 'utf8'));
}
