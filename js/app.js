const DATA_PATH = 'data/databases.xlsx';

const FUNCTION_META = {
  'AI Research': { color: '#a78bfa', order: 1 },
  'Find Books': { color: '#38bdf8', order: 2 },
  'Find Article': { color: '#6c9eff', order: 3 },
  'Experiment Design': { color: '#34d399', order: 4 },
  'Find Standard': { color: '#fbbf24', order: 5 },
  'Find Patent': { color: '#2dd4bf', order: 6 },
  Publisher: { color: '#f472b6', order: 7 },
};

const state = { databases: [], selectedSubjects: new Set(), searchQuery: '' };

const els = {
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('errorMessage'),
  pageLayout: document.getElementById('pageLayout'),
  databaseSections: document.getElementById('databaseSections'),
  resultCount: document.getElementById('resultCount'),
  emptyState: document.getElementById('emptyState'),
  subjectFilters: document.getElementById('subjectFilters'),
  searchInput: document.getElementById('searchInput'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  modalIcon: document.getElementById('modalIcon'),
  modalFunction: document.getElementById('modalFunction'),
  modalTitle: document.getElementById('modalTitle'),
  modalIntro: document.getElementById('modalIntro'),
  modalFeatures: document.getElementById('modalFeatures'),
  modalCoverage: document.getElementById('modalCoverage'),
  modalType: document.getElementById('modalType'),
  modalSubjects: document.getElementById('modalSubjects'),
  modalAccessBtn: document.getElementById('modalAccessBtn'),
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fnMeta = (fn) => FUNCTION_META[fn] || { color: '#8b92a5', order: 99 };

const initials = (name) => name.split(/[\s-]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  return rows.map((row) => {
    const r = {};
    Object.entries(row).forEach(([k, v]) => { r[k.trim().toLowerCase()] = String(v ?? '').trim(); });

    const sort = parseInt(r.sort, 10);
    return {
      name: r['database name'],
      intro: r.intro,
      features: (r.features || '').split(';').map((f) => f.trim()).filter(Boolean),
      coverage: r.coverage,
      type: r['database type'] || r['databse type'],
      subjects: (r['related subjects'] || '')
        .split('|')
        .map((s) => s.trim().replace('Physics and MateriaLife Sciences', 'Physics and Materials Science'))
        .filter(Boolean),
      url: r['access url'],
      function: r.function || 'Other',
      img: r.img,
      sort: Number.isFinite(sort) ? sort : 999,
    };
  }).filter((db) => db.name);
}

function getFiltered() {
  return state.databases.filter((db) => {
    const q = state.searchQuery;
    const matchesSearch = !q || [db.name, db.intro, db.type, db.function]
      .some((field) => field.toLowerCase().includes(q));
    const matchesSubject = !state.selectedSubjects.size
      || db.subjects.some((s) => state.selectedSubjects.has(s));
    return matchesSearch && matchesSubject;
  });
}

function groupByFunction(databases) {
  const groups = new Map();
  databases.forEach((db) => {
    if (!groups.has(db.function)) groups.set(db.function, []);
    groups.get(db.function).push(db);
  });

  return [...groups.entries()]
    .sort((a, b) => fnMeta(a[0]).order - fnMeta(b[0]).order)
    .map(([fn, items]) => ({
      function: fn,
      items: items.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
    }));
}

function iconHtml(db, className = 'db-icon') {
  const { color } = fnMeta(db.function);
  if (db.img) {
    return `<div class="${className} ${className}--img" aria-hidden="true"><img src="${esc(db.img)}" alt="" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="${className}" style="background:${color}" aria-hidden="true">${esc(initials(db.name))}</div>`;
}

function fallbackIcon(img) {
  const name = img.closest('.db-card')?.dataset.name || els.modalTitle.textContent;
  const db = state.databases.find((d) => d.name === name);
  if (!db) return;

  const box = img.parentElement;
  box.className = box.className.replace(/\s*\S+--img/g, '').trim();
  box.style.background = fnMeta(db.function).color;
  box.textContent = initials(db.name);
}

function renderFilters() {
  const subjects = [...new Set(state.databases.flatMap((db) => db.subjects))].sort();
  els.subjectFilters.innerHTML = subjects.map((subject) => `
    <label class="filter-chip ${state.selectedSubjects.has(subject) ? 'active' : ''}">
      <input type="checkbox" value="${esc(subject)}" ${state.selectedSubjects.has(subject) ? 'checked' : ''}>
      <span>${esc(subject)}</span>
    </label>`).join('');
}

function render() {
  const filtered = getFiltered();
  const groups = groupByFunction(filtered);

  els.databaseSections.innerHTML = groups.map(({ function: fn, items }) => {
    const { color } = fnMeta(fn);
    const cards = items.map((db) => `
      <article class="db-card" tabindex="0" data-name="${esc(db.name)}"
        style="--card-accent:${color}" aria-label="View ${esc(db.name)} details">
        ${iconHtml(db)}
        <span class="db-name">${esc(db.name)}</span>
      </article>`).join('');

    return `
      <section class="function-section">
        <header class="function-header">
          <h2 class="function-title">${esc(fn)}</h2>
          <span class="function-count">${items.length}</span>
        </header>
        <div class="database-grid">${cards}</div>
      </section>`;
  }).join('');

  const total = state.databases.length;
  els.resultCount.textContent = filtered.length === total
    ? `${total} databases`
    : `Showing ${filtered.length} of ${total} databases`;

  els.emptyState.classList.toggle('hidden', filtered.length > 0);
  els.databaseSections.classList.toggle('hidden', filtered.length === 0);
}

function openModal(db) {
  els.modalIcon.innerHTML = db.img
    ? `<img src="${esc(db.img)}" alt="" decoding="async">`
    : '';
  els.modalIcon.className = db.img ? 'modal-icon modal-icon--img' : 'modal-icon';
  els.modalIcon.style.background = db.img ? '' : fnMeta(db.function).color;
  if (!db.img) els.modalIcon.textContent = initials(db.name);

  const img = els.modalIcon.querySelector('img');
  if (img) img.onerror = () => fallbackIcon(img);

  els.modalFunction.textContent = db.function;
  els.modalTitle.textContent = db.name;
  els.modalIntro.textContent = db.intro;
  els.modalCoverage.textContent = db.coverage;
  els.modalType.textContent = db.type;
  els.modalFeatures.innerHTML = db.features.map((f) => `<li>${esc(f)}</li>`).join('');
  els.modalSubjects.innerHTML = db.subjects.map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  els.modalAccessBtn.href = db.url || '#';
  els.modalAccessBtn.classList.toggle('hidden', !db.url);

  els.modalOverlay.classList.remove('hidden');
  els.modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  els.modalClose.focus();
}

function closeModal() {
  els.modalOverlay.classList.add('hidden');
  els.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showError(message) {
  els.loading.classList.add('hidden');
  els.errorMessage.textContent = message;
  els.errorMessage.classList.remove('hidden');
}

async function init() {
  if (typeof XLSX === 'undefined') {
    showError('Excel parser failed to load. Check your network and reload.');
    return;
  }

  try {
    const res = await fetch(DATA_PATH);
    if (!res.ok) {
      showError(`Failed to load Excel file (HTTP ${res.status}). Open via an HTTP server or GitHub Pages.`);
      return;
    }

    state.databases = parseExcel(await res.arrayBuffer());
    if (!state.databases.length) {
      showError('No data found in Excel file.');
      return;
    }
  } catch (err) {
    showError(`Failed to load: ${err.message}. Open via an HTTP server or GitHub Pages.`);
    console.error(err);
    return;
  }

  els.loading.classList.add('hidden');
  els.pageLayout.classList.remove('hidden');
  renderFilters();
  render();
}

els.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  render();
});

els.subjectFilters.addEventListener('change', (e) => {
  if (e.target.type !== 'checkbox') return;
  if (e.target.checked) state.selectedSubjects.add(e.target.value);
  else state.selectedSubjects.delete(e.target.value);
  renderFilters();
  render();
});

els.selectAllBtn.addEventListener('click', () => {
  state.databases.flatMap((db) => db.subjects).forEach((s) => state.selectedSubjects.add(s));
  renderFilters();
  render();
});

els.clearAllBtn.addEventListener('click', () => {
  state.selectedSubjects.clear();
  renderFilters();
  render();
});

els.databaseSections.addEventListener('click', (e) => {
  const card = e.target.closest('.db-card');
  if (!card) return;
  const db = state.databases.find((d) => d.name === card.dataset.name);
  if (db) openModal(db);
});

els.databaseSections.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.db-card');
  if (!card) return;
  e.preventDefault();
  const db = state.databases.find((d) => d.name === card.dataset.name);
  if (db) openModal(db);
});

els.databaseSections.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') fallbackIcon(e.target);
}, true);

els.modalClose.addEventListener('click', closeModal);
els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modalOverlay.classList.contains('hidden')) closeModal();
});

init();
