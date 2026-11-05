// Checks the build the way GitHub Pages serves it: the addresses that existed before the
// Docusaurus site still answer with the same pages, /en/manual/ redirects to /manual/, the short
// addresses of the Collect privacy policy (/privacy/, /pt/privacidade/) redirect to it, every
// manual page links to it in its language, and no copy of static/ or legacy/ leaks into the
// Portuguese build.
//
// usage: node scripts/check-urls.mjs <build dir>

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'build');

/** Serves a directory like GitHub Pages: a directory answers with its index.html, else 404. */
function serve(dir) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    fs.createReadStream(file).pipe(res);
  });
}

const checks = [
  {
    url: '/',
    has: [
      '<title>Snapping Trail — Documentation</title>',
      'href="manual/"',
      'href="pt/manual/"',
      'href="en/"',
      'href="pt/"',
      'Snapping Trail Collect',
    ],
  },
  {url: '/en/', has: ['<title>Privacy Policy — SnappingTrail Collect</title>', 'href="../pt/"']},
  {url: '/pt/', has: ['<title>Política de Privacidade — SnappingTrail Collect</title>', 'href="../en/"']},
  {
    url: '/en/manual/',
    has: [
      '<meta http-equiv="refresh" content="0; url=/manual/">',
      '<link rel="canonical" href="https://docs.snappingtrail.com/manual/">',
    ],
  },
  {
    url: '/privacy/',
    has: [
      '<meta http-equiv="refresh" content="0; url=/en/">',
      '<link rel="canonical" href="https://docs.snappingtrail.com/en/">',
    ],
  },
  {
    url: '/pt/privacidade/',
    has: [
      '<meta http-equiv="refresh" content="0; url=/pt/">',
      '<link rel="canonical" href="https://docs.snappingtrail.com/pt/">',
    ],
  },
  {
    url: '/pt/manual/',
    has: [
      '<html lang="pt-BR"',
      'Manual do SnappingTrail',
      // The menu and the footer: the Collect privacy policy in Portuguese, and the web app's.
      'href="/pt/"',
      '>Privacidade<',
      'Política de privacidade do SnappingTrail Collect',
      'Configurações → Legal',
    ],
  },
  {
    url: '/manual/',
    has: [
      '<html lang="en"',
      'SnappingTrail manual',
      'href="/en/"',
      '>Privacy<',
      'SnappingTrail Collect privacy policy',
      'Settings → Legal',
    ],
  },
  {url: '/manual/collect-app/', has: ['Collect app']},
  {url: '/pt/manual/collect-app/', has: ['App Collect']},
];

const absent = ['pt/en', 'pt/pt', 'pt/CNAME', 'pt/legacy', 'legacy'];
const present = ['CNAME', 'search-index.json', 'pt/search-index.json'];

const server = serve(root);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
for (const check of checks) {
  const res = await fetch(base + check.url, {redirect: 'manual'});
  const body = await res.text();
  if (res.status !== 200) failures.push(`${check.url}: HTTP ${res.status}`);
  for (const text of check.has) {
    if (!body.includes(text)) failures.push(`${check.url}: missing ${JSON.stringify(text)}`);
  }
  // A meta refresh must point at a page that exists.
  const refresh = body.match(/<meta http-equiv="refresh" content="0; url=([^"]+)">/);
  if (refresh) {
    const target = await fetch(base + refresh[1], {redirect: 'manual'});
    if (target.status !== 200) failures.push(`${check.url}: redirect target ${refresh[1]} is HTTP ${target.status}`);
  }
  console.log(`${res.status} ${check.url}`);
}
server.close();

for (const file of absent) {
  if (fs.existsSync(path.join(root, file))) failures.push(`${file}: should not be in the build`);
}
for (const file of present) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file}: missing from the build`);
}
if (fs.existsSync(path.join(root, 'CNAME'))) {
  const cname = fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim();
  if (cname !== 'docs.snappingtrail.com') failures.push(`CNAME: ${cname}`);
}

if (failures.length > 0) {
  console.error('\nFAILED:\n' + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`\nAll ${checks.length} addresses answer as expected; no leaked copies.`);
