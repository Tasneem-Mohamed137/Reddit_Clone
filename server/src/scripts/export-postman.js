import fs from 'node:fs';
import path from 'node:path';
import { openapi } from '../docs/openapi.js';

// Builds a Postman v2.1 collection from the same OpenAPI object that powers /api-docs,
// so the two can never drift apart.
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const toPostmanPath = (route) => route.replace(/\{(\w+)\}/g, ':$1');

const folders = new Map();

for (const [route, operations] of Object.entries(openapi.paths)) {
  for (const method of METHODS) {
    const op = operations[method];
    if (!op) continue;

    const params = op.parameters ?? [];
    const jsonExample = op.requestBody?.content?.['application/json']?.example;
    const isUpload = Boolean(op.requestBody?.content?.['multipart/form-data']);
    const path_ = toPostmanPath(route);

    const request = {
      method: method.toUpperCase(),
      description: op.summary,
      header: jsonExample ? [{ key: 'Content-Type', value: 'application/json' }] : [],
      url: {
        raw: `{{baseUrl}}${path_}`,
        host: ['{{baseUrl}}'],
        path: path_.split('/').filter(Boolean),
        variable: params.filter((p) => p.in === 'path').map((p) => ({ key: p.name, value: `<${p.name}>` })),
        query: params.filter((p) => p.in === 'query').map((p) => ({ key: p.name, value: '', disabled: true })),
      },
    };
    if (jsonExample) {
      request.body = { mode: 'raw', raw: JSON.stringify(jsonExample, null, 2), options: { raw: { language: 'json' } } };
    }
    if (isUpload) request.body = { mode: 'formdata', formdata: [{ key: 'files', type: 'file', src: [] }] };

    const folder = op.tags?.[0] ?? 'Other';
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push({ name: `${method.toUpperCase()} ${route}`, request });
  }
}

const collection = {
  info: {
    name: openapi.info.title,
    description: 'Log in first (Auth > POST /auth/login). Postman stores the access_token cookie and sends it automatically.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'baseUrl', value: openapi.servers[0].url }],
  item: [...folders].map(([name, item]) => ({ name, item })),
};

const outDir = path.resolve(process.cwd(), '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'postman_collection.json'), JSON.stringify(collection, null, 2));
console.log(`Wrote ${path.join(outDir, 'postman_collection.json')}`);