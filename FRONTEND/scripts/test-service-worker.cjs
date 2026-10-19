const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const handlers = {};
let fetchFails = false;
const cached = new Map();
const cache = {
  addAll: async urls => urls.forEach(url => cached.set(url, { offline: true })),
  match: async request => cached.get(typeof request === 'string' ? request : request.url)
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/service-worker.js'), 'utf8'), {
  URL,
  self: { location: { href: 'https://erp.example/service-worker.js' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
  caches: { open: async () => cache, keys: async () => [], delete: async () => true },
  fetch: async () => { if (fetchFails) throw Error('offline'); return { online: true }; }
});
async function main() {
  let installed;
  handlers.install({ waitUntil: promise => { installed = promise; } });
  await installed;
  assert(cached.has('https://erp.example/offline.html'));
  const request = (url, method = 'GET', mode = 'cors', authorized = false) => ({ url, method, mode, headers: { has: () => authorized } });
  for (const item of [request('https://erp.example/api/payroll'), request('https://erp.example/attendance', 'POST'), request('https://api.example/private'), request('https://erp.example/private', 'GET', 'cors', true), request('https://erp.example/document.pdf')]) {
    handlers.fetch({ request: item, respondWith: () => assert.fail('Private/network-only request intercepted') });
  }
  fetchFails = true;
  let response;
  handlers.fetch({ request: request('https://erp.example/dashboard?app=people', 'GET', 'navigate'), respondWith: promise => { response = promise; } });
  assert.equal((await response).offline, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/manifest.json')));
  assert.equal(manifest.name, 'SE-ERP');
  for (const icon of manifest.icons) assert(fs.existsSync(path.join(__dirname, '../public', icon.src)));
  console.log('PWA checks passed: offline navigation, API/auth/write bypass, manifest and icons.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
