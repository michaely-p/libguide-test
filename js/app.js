/* ── Config ─────────────────────────────────────────────────────────── */

const DATA_URL = new URL('data/databases.csv', document.baseURI).href;

/** Display groups: `name` is the canonical title; CSV `function` may use any listed alias. */
const CATEGORIES = [
  { name: 'AI Research Tool', color: '#7c6cf0', aliases: ['AI Tools'] },
  { name: 'Find Book', color: '#38bdf8', aliases: ['Find Book'] },
  { name: 'Find Article', color: '#3b6fd9', aliases: ['Find Article', 'Find Journal', 'A&I'] },
  { name: 'Experiment Design', color: '#22c997' },
  { name: 'Find Standard', color: '#f5a623', aliases: ['Find Standard'] },
  { name: 'Find Patent', color: '#14b8a6', aliases: ['Find Patent'] },
  { name: 'Find Theses', color: '#141cb8', aliases: ['Find Theses'] },
  { name: 'Publisher', color: '#ec4899' },
];

const DEFAULT_CATEGORY = { name: 'Other', color: '#94a3b8', order: 99 };

/* ── Category registry (built once from CATEGORIES) ─────────────────── */

const categoryLookup = new Map();
const categoryMeta = new Map();

CATEGORIES.forEach(({ name, color, aliases = [] }, order) => {
  categoryMeta.set(name, { name, color, order });
  categoryLookup.set(name, name);
  aliases.forEach((alias) => categoryLookup.set(alias, name));
});

function normalizeCategory(raw) {
  const key = raw?.trim();
  if (!key) return DEFAULT_CATEGORY.name;
  return categoryLookup.get(key) ?? DEFAULT_CATEGORY.name;
}

function getCategory(name) {
  return categoryMeta.get(name) ?? { ...DEFAULT_CATEGORY, name };
}

/* ── State & DOM ────────────────────────────────────────────────────── */

const state = {
  databases: [],
  selectedSubjects: new Set(),
  searchQuery: '',
  librarySupportedOnly: false,
  aiFeaturedOnly: false,
};

const ui = {
  status: document.getElementById('status'),
  catalog: document.getElementById('catalog'),
  empty: document.getElementById('empty'),
  subjects: document.getElementById('subjects'),
  search: document.getElementById('search'),
  clearSubjects: document.getElementById('clearSubjects'),
  librarySupported: document.getElementById('librarySupported'),
  aiFeatured: document.getElementById('aiFeatured'),
  reset: document.getElementById('reset'),
  detailModal: document.getElementById('detailModal'),
  modalIcon: document.getElementById('modalIcon'),
  modalCat: document.getElementById('modalCat'),
  modalTitle: document.getElementById('modalTitle'),
  modalIntro: document.getElementById('modalIntro'),
  modalTags: document.getElementById('modalTags'),
  modalLink: document.getElementById('modalLink'),
};

let bootstrapModal;

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const resolveAssetUrl = (path) => (
  path && !/^https?:\/\//i.test(path)
    ? new URL(path.replace(/^\//, ''), document.baseURI).href
    : path
);

/* ── CSV parsing ────────────────────────────────────────────────────── */

function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function parseCsvRows(text) {
  const rows = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { inQuotes = !inQuotes; currentRow += char; continue; }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (currentRow) rows.push(currentRow);
      currentRow = '';
      continue;
    }
    currentRow += char;
  }

  if (currentRow) rows.push(currentRow);
  return rows;
}

function rowToDatabase(headers, values) {
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  const name = record['database name'];
  if (!name) return null;

  const sort = parseInt(record.sort, 10);

  return {
    name,
    intro: record.intro,
    type: record['database type'],
    subjects: record['related subjects'].split('|').map((s) => s.trim()).filter(Boolean),
    url: record['access url'],
    category: normalizeCategory(record.function),
    img: resolveAssetUrl(record.img),
    openResource: record.open_resource.trim().toLowerCase() === 'y',
    aiFeature: record.ai_feature.trim().toLowerCase() === 'y',
    sort: Number.isFinite(sort) ? sort : 999,
  };
}

function parseCsv(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) return [];

  const headers = splitCsvLine(rows[0]).map((header) => header.toLowerCase());

  return rows.slice(1).flatMap((row) => {
    const line = row.trim();
    if (!line) return [];
    const database = rowToDatabase(headers, splitCsvLine(line));
    return database ? [database] : [];
  });
}

/* ── Filtering & grouping ───────────────────────────────────────────── */

function matchesSearch(db) {
  if (!state.searchQuery) return true;
  return db.name.toLowerCase().includes(state.searchQuery);
}

function matchesSubjects(db) {
  if (!state.selectedSubjects.size) return true;
  return db.subjects.some((subject) => state.selectedSubjects.has(subject));
}

function matchesLibrarySupported(db) {
  if (!state.librarySupportedOnly) return true;
  return !db.openResource;
}

function matchesAiFeatured(db) {
  if (!state.aiFeaturedOnly) return true;
  return db.aiFeature;
}

function getVisibleDatabases() {
  return state.databases.filter(
    (db) => matchesSearch(db)
      && matchesSubjects(db)
      && matchesLibrarySupported(db)
      && matchesAiFeatured(db),
  );
}

function groupByCategory(databases) {
  const groups = new Map();

  databases.forEach((db) => {
    if (!groups.has(db.category)) groups.set(db.category, []);
    groups.get(db.category).push(db);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => getCategory(a).order - getCategory(b).order)
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
    }));
}

function findDatabase(name) {
  return state.databases.find((db) => db.name === name);
}

/* ── View helpers ───────────────────────────────────────────────────── */

function initials(name) {
  return name.split(/[\s-]+/).slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('');
}

const ICON_BASE = 'd-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold rounded-3';

function iconClasses(large) {
  return large ? `${ICON_BASE} db-icon db-icon-lg fs-6` : `${ICON_BASE} db-icon fs-5`;
}

function renderIcon(db, large = false) {
  const { color } = getCategory(db.category);
  const cls = iconClasses(large);

  if (db.img) {
    return `<div class="${cls} bg-white border p-2"><img src="${esc(db.img)}" alt="" class="w-100 h-100 object-fit-contain"></div>`;
  }

  return `<div class="${cls}" style="background:${color}">${esc(initials(db.name))}</div>`;
}

function categoryTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1e293b' : '#ffffff';
}

function renderDatabaseCard(db) {
  return `
    <div class="col">
      <button type="button" class="btn border-0 bg-transparent d-flex flex-column align-items-center gap-1 py-1 px-1 w-100" data-name="${esc(db.name)}">
        ${renderIcon(db)}
        <span class="fw-semibold text-center lh-sm text-break db-title w-100">${esc(db.name)}</span>
      </button>
    </div>`;
}

function renderCategorySection({ category, items }) {
  const { color } = getCategory(category);
  const textColor = categoryTextColor(color);

  return `
    <div class="col">
      <section class="card category-card h-100 border-0 overflow-hidden" style="--cat:${color}">
        <div class="category-card-header d-flex align-items-center justify-content-between gap-2 px-3 py-2" style="background:${color};color:${textColor}">
          <h2 class="h6 fw-bold mb-0">${esc(category)}</h2>
          <span class="badge rounded-pill category-card-count" style="background:color-mix(in srgb, ${textColor} 16%, transparent)">${items.length}</span>
        </div>
        <div class="card-body p-2 category-card-body">
          <div class="row row-cols-3 g-1">
            ${items.map(renderDatabaseCard).join('')}
          </div>
        </div>
      </section>
    </div>`;
}

function replaceBrokenIcon(img) {
  const name = img.closest('[data-name]')?.dataset.name || ui.modalTitle.textContent;
  const db = findDatabase(name);
  if (!db) return;

  const fallback = document.createElement('div');
  fallback.className = iconClasses(!!img.closest('.db-icon-lg'));
  fallback.style.background = getCategory(db.category).color;
  fallback.textContent = initials(db.name);
  img.parentElement.replaceWith(fallback);
}

/* ── Render ─────────────────────────────────────────────────────────── */

function renderSubjectFilters() {
  const subjects = [...new Set(state.databases.flatMap((db) => db.subjects))].sort();

  ui.subjects.innerHTML = subjects.map((subject, index) => `
    <div class="form-check py-1">
      <input class="form-check-input" type="checkbox" value="${esc(subject)}" id="sub-${index}"${state.selectedSubjects.has(subject) ? ' checked' : ''}>
      <label class="form-check-label small" for="sub-${index}">${esc(subject)}</label>
    </div>`).join('');
}

function renderCatalog() {
  const visible = getVisibleDatabases();
  const sections = groupByCategory(visible);

  ui.catalog.innerHTML = sections.map(renderCategorySection).join('');
  ui.empty.classList.toggle('d-none', visible.length > 0);
  ui.catalog.classList.toggle('d-none', visible.length === 0);
  ui.status.classList.add('d-none');
}

function renderAll() {
  renderSubjectFilters();
  renderCatalog();
}

function openDatabaseModal(name) {
  const db = findDatabase(name);
  if (!db) return;

  const { color } = getCategory(db.category);

  ui.modalIcon.innerHTML = renderIcon(db, true);
  ui.modalCat.textContent = db.category;
  ui.modalCat.style.color = color;
  ui.modalTitle.textContent = db.name;
  ui.modalIntro.textContent = db.intro;
  ui.modalTags.innerHTML = db.subjects
    .map((subject) => `<span class="badge bg-primary-subtle text-primary-emphasis">${esc(subject)}</span>`)
    .join('');
  ui.modalLink.href = db.url;
  ui.modalLink.classList.toggle('d-none', !db.url);

  (bootstrapModal ??= new bootstrap.Modal(ui.detailModal)).show();
}

function resetFilters() {
  state.selectedSubjects.clear();
  state.searchQuery = '';
  state.librarySupportedOnly = false;
  state.aiFeaturedOnly = false;
  ui.search.value = '';
  ui.librarySupported.checked = false;
  ui.aiFeatured.checked = false;
  renderAll();
}

function showLoadError(message) {
  ui.status.textContent = message;
}

/* ── Data loading ───────────────────────────────────────────────────── */

async function loadDatabases() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const databases = parseCsv(await response.text());
  if (!databases.length) throw new Error('Empty CSV');

  state.databases = databases;
}

/* ── Events ─────────────────────────────────────────────────────────── */

function bindEvents() {
  ui.search.addEventListener('input', (event) => {
    state.searchQuery = event.target.value.trim().toLowerCase();
    renderCatalog();
  });

  ui.subjects.addEventListener('change', (event) => {
    if (event.target.type !== 'checkbox') return;
    if (event.target.checked) state.selectedSubjects.add(event.target.value);
    else state.selectedSubjects.delete(event.target.value);
    renderCatalog();
  });

  ui.clearSubjects.addEventListener('click', () => {
    state.selectedSubjects.clear();
    renderAll();
  });

  ui.librarySupported.addEventListener('change', (event) => {
    state.librarySupportedOnly = event.target.checked;
    renderCatalog();
  });

  ui.aiFeatured.addEventListener('change', (event) => {
    state.aiFeaturedOnly = event.target.checked;
    renderCatalog();
  });

  ui.reset.addEventListener('click', resetFilters);

  ui.catalog.addEventListener('click', (event) => {
    const card = event.target.closest('[data-name]');
    if (card?.dataset.name) openDatabaseModal(card.dataset.name);
  });

  document.addEventListener('error', (event) => {
    if (event.target.tagName === 'IMG') replaceBrokenIcon(event.target);
  }, true);
}

async function init() {
  try {
    await loadDatabases();
    renderAll();
  } catch (error) {
    showLoadError(`Failed to load data: ${error.message}`);
  }
}

bindEvents();
init();
