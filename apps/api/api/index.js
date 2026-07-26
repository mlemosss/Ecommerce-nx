const mod = require('../dist-serverless/main.js');
const handler = mod.default || mod;

// vercel.json rewrites every request here, appending the real path as a
// repeated/joined `path` query param (Vercel's automatic behavior for
// named wildcard rewrite params). Reconstruct req.url from it before
// delegating to Nest so its router sees the original path (e.g.
// /api/auth/login) instead of just /api.
module.exports = function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const segments = url.searchParams.getAll('path');
  if (segments.length) {
    url.searchParams.delete('path');
    const pathname = '/' + segments.join('/').replace(/^\/+/, '');
    const search = url.searchParams.toString();
    req.url = pathname + (search ? `?${search}` : '');
  }
  return handler(req, res);
};
