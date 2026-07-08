/* ── UI + Rendering ─────────────────────────────────────────────────── */

import { getCategory } from './categories.js';
import { state, ui, esc } from './state.js';

let bootstrapModal;

/* ── Filtering & grouping ───────────────────────────────────────────── */

function matchesSearch(db) {
  if (!state.searchQuery) return true;
  return db.name.toLowerCase().includes(state.searchQuery);
}

function matchesSubjects(db) {
  if (!state.selectedSubjects.size) return true;
  return db.subjects.some((subject) => state.selectedSubjects.has(subject));
}

function matchesAccessType(db) {
  const { librarySupportedOnly, freeResourcesOnly } = state;
  if (!librarySupportedOnly && !freeResourcesOnly) return true;

  const isLibrarySupported = !db.openResource;
  const isFreeResource = db.openResource;

  if (librarySupportedOnly && isLibrarySupported) return true;
  if (freeResourcesOnly && isFreeResource) return true;
  return false;
}

function matchesAiFeatureType(db) {
  const { aiFeaturesOnly, traditionalOnly } = state;
  if (!aiFeaturesOnly && !traditionalOnly) return true;

  if (aiFeaturesOnly && db.aiFeature) return true;
  if (traditionalOnly && !db.aiFeature) return true;
  return false;
}

function getVisibleDatabases() {
  return state.databases.filter(
    (db) => matchesSearch(db)
      && matchesSubjects(db)
      && matchesAccessType(db)
      && matchesAiFeatureType(db),
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
      <button type="button" class="btn border-0 bg-transparent db-card-item d-flex flex-row flex-md-column align-items-center gap-1 py-1 px-1 w-100" data-name="${esc(db.name)}">
        ${renderIcon(db)}
        <span class="fw-semibold text-center lh-sm text-break db-title w-100">${esc(db.name)}</span>
      </button>
    </div>`;
}

function renderCategorySection({ category, items }) {
  const { color, description = '', guideHref = '' } = getCategory(category);
  const textColor = categoryTextColor(color);

  return `
    <div class="col">
      <section class="card category-card h-100 border-0 overflow-hidden" style="--cat:${color}">
        <div class="category-card-header px-3 py-2" style="background:${color};color:${textColor}">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <h2 class="h6 fw-bold mb-0">${esc(category)}</h2>
              ${guideHref ? `<a class="category-guide-link" href="${esc(guideHref)}" target="_blank" rel="noopener noreferrer">Guide</a>` : ''}
            </div>
          </div>
          ${description ? `<p class="category-card-desc mb-0">${esc(description)}</p>` : ''}
        </div>
        <div class="card-body p-2 category-card-body">
          <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-2">
            ${items.map(renderDatabaseCard).join('')}
          </div>
        </div>
      </section>
    </div>`;
}

function renderTableRow(db) {
  const link = db.url
    ? `<a class="btn btn-outline-primary btn-sm text-nowrap" href="${esc(db.url)}" target="_blank" rel="noopener">Access Database</a>`
    : '<span class="text-muted">Not available</span>';

  return `
    <tr>
      <td class="catalog-table-name">
        <button type="button" class="btn btn-link p-0 fw-semibold text-start text-decoration-none" data-name="${esc(db.name)}">
          ${esc(db.name)}
        </button>
      </td>
      <td class="catalog-table-description">${esc(db.intro || '')}</td>
      <td class="catalog-table-link">${link}</td>
    </tr>`;
}

function renderTableSection({ category, items }) {
  const { color, description = '', guideHref = '' } = getCategory(category);
  const textColor = categoryTextColor(color);

  return `
    <section class="catalog-table-section" style="--cat:${color}">
      <div class="catalog-table-header px-3 py-2" style="background:${color};color:${textColor}">
        <div class="d-flex align-items-center justify-content-between gap-2">
          <div class="d-flex align-items-center gap-2">
            <h2 class="h6 fw-bold mb-0">${esc(category)}</h2>
            ${guideHref ? `<a class="category-guide-link" href="${esc(guideHref)}" target="_blank" rel="noopener noreferrer">Guide</a>` : ''}
          </div>
        </div>
        ${description ? `<p class="category-table-desc mb-0">${esc(description)}</p>` : ''}
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle bg-white mb-0 catalog-table">
          <tbody>${items.map(renderTableRow).join('')}</tbody>
        </table>
      </div>
    </section>`;
}

function renderTableCatalog(databases) {
  return groupByCategory(databases).map(renderTableSection).join('');
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
    <div class="filter-chip-item">
      <input class="filter-chip-input" type="checkbox" value="${esc(subject)}" id="sub-${index}"${state.selectedSubjects.has(subject) ? ' checked' : ''}>
      <label class="filter-chip" for="sub-${index}">${esc(subject)}</label>
    </div>`).join('');
}

function updateViewControls() {
  const isTable = state.viewMode === 'table';
  ui.cardView.classList.toggle('btn-primary', !isTable);
  ui.cardView.classList.toggle('btn-outline-primary', isTable);
  ui.cardView.setAttribute('aria-pressed', String(!isTable));
  ui.tableView.classList.toggle('btn-primary', isTable);
  ui.tableView.classList.toggle('btn-outline-primary', !isTable);
  ui.tableView.setAttribute('aria-pressed', String(isTable));
}

function renderCatalog() {
  const visible = getVisibleDatabases();

  updateViewControls();
  ui.catalog.className = state.viewMode === 'table'
    ? 'd-flex flex-column gap-3'
    : 'row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3';
  ui.catalog.innerHTML = state.viewMode === 'table'
    ? renderTableCatalog(visible)
    : groupByCategory(visible).map(renderCategorySection).join('');
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
  state.freeResourcesOnly = false;
  state.aiFeaturesOnly = false;
  state.traditionalOnly = false;
  ui.search.value = '';
  ui.librarySupported.checked = false;
  ui.freeResources.checked = false;
  ui.aiFeatures.checked = false;
  ui.traditional.checked = false;
  renderAll();
}

function showLoadError(message) {
  ui.status.textContent = message;
}

export {
  renderCatalog,
  renderAll,
  openDatabaseModal,
  resetFilters,
  replaceBrokenIcon,
  showLoadError,
};

