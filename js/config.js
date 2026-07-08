/* ── Config ─────────────────────────────────────────────────────────── */

// Base URL for resolving project assets under GitHub Pages subpaths.
// Example: if index.html is at /libguide-test/, ASSET_BASE becomes the same path.
const ASSET_BASE = new URL('..', import.meta.url).href;
const DATA_URL = new URL('data/databases.csv', ASSET_BASE).href;

/**
 * Resolve a project-relative asset path (e.g. `/img/a.png`) to a correct
 * absolute URL under the current GitHub Pages subpath.
 */
function resolveAssetUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return new URL(String(path).replace(/^\//, ''), ASSET_BASE).href;
}

export { ASSET_BASE, DATA_URL, resolveAssetUrl };

