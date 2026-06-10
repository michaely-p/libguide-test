const DATA_PATH = 'data/databases.csv';

const FUNCTION_META = {
  'AI Research': { color: '#a78bfa', order: 1 },
  'Find Books': { color: '#38bdf8', order: 2 },
  'Find Journals': { color: '#6c9eff', order: 3 },
  'Experiment Design': { color: '#34d399', order: 4 },
  'Find Standards': { color: '#fbbf24', order: 5 },
  'Find Patents': { color: '#2dd4bf', order: 6 },
  Publisher: { color: '#f472b6', order: 7 },
};

const FUNCTION_ALIASES = {
  'Find Book': 'Find Books',
  'Find Article': 'Find Journals',
  'Find Articles': 'Find Journals',
  'Find Journal': 'Find Journals',
  'Find Standard': 'Find Standards',
  'Find Patent': 'Find Patents',
  'AI Tools': 'AI Research',
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
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
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

const normalizeCategory = (value) => FUNCTION_ALIASES[value?.trim()] || value?.trim() || 'Other';

const fnMeta = (fn) => FUNCTION_META[fn] || { color: '#8b92a5', order: 99 };

const initials = (name) => name.split(/[\s-]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  if (tabs >= commas && tabs >= semicolons && tabs > 0) return '\t';
  return semicolons > commas ? ';' : ',';
}

function splitDelimitedLine(line, delimiter = ',') {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

const ROW_TAIL_RE = /,(|https?:\/\/[^,\r\n]*),([^,\r\n]+),(|\/[^,\r\n]*),(\d+)\s*$/;

function parseHeadFields(rest, delimiter) {
  const fields = splitDelimitedLine(rest, delimiter);
  if (fields.length === 6) {
    const [name, intro, features, coverage, type, subjects] = fields;
    return { name, intro, features, coverage, type, subjects };
  }
  if (fields.length < 6) return null;

  const subjects = fields.at(-1);
  const type = fields.at(-2);
  const coverage = fields.at(-3);
  const name = fields[0];
  const intro = fields[1];
  const features = fields.slice(2, -3).join(delimiter);
  return { name, intro, features, coverage, type, subjects };
}

function parseDatabaseLine(line, delimiter) {
  const tail = line.match(ROW_TAIL_RE);
  if (!tail) return splitDelimitedLine(line, delimiter);

  const [, url, category, img, sort] = tail;
  const rest = line.slice(0, line.length - tail[0].length);
  const head = parseHeadFields(rest, delimiter);
  if (!head) return splitDelimitedLine(line, delimiter);

  return [head.name, head.intro, head.features, head.coverage, head.type, head.subjects, url, category, img, sort];
}

function toRecord(raw) {
  const sort = parseInt(raw.sort, 10);
  return {
    name: raw['database name'],
    intro: raw.intro,
    features: (raw.features || '').split(';').map((f) => f.trim()).filter(Boolean),
    coverage: raw.coverage,
    type: raw['database type'] || raw['databse type'],
    subjects: (raw['related subjects'] || '')
      .split('|')
      .map((s) => s.trim().replace('Physics and MateriaLife Sciences', 'Physics and Materials Science'))
      .filter(Boolean),
    url: raw['access url'],
    category: normalizeCategory(raw.function),
    img: raw.img,
    sort: Number.isFinite(sort) ? sort : 999,
  };
}

function normalizeCsvText(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/[\u201C\u201D\u201E\u2033\u2036]/g, '"');
}

function parseCsv(text) {
  const content = normalizeCsvText(text);
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseDatabaseLine(line, delimiter).map((v) => v.trim());
    if (values.length !== headers.length) {
      console.warn(`CSV row ${i + 1}: got ${values.length} fields, expected ${headers.length}`, values);
    }
    const raw = {};
    headers.forEach((header, idx) => {
      raw[header] = values[idx] || '';
    });
    const record = toRecord(raw);
    if (record.name) rows.push(record);
  }

  return rows;
}

function getFiltered() {
  return state.databases.filter((db) => {
    const q = state.searchQuery;
    const matchesSearch = !q || [db.name, db.intro, db.type, db.category]
      .some((field) => field.toLowerCase().includes(q));
    const matchesSubject = !state.selectedSubjects.size
      || db.subjects.some((s) => state.selectedSubjects.has(s));
    return matchesSearch && matchesSubject;
  });
}

function groupByFunction(databases) {
  const groups = new Map();
  databases.forEach((db) => {
    if (!groups.has(db.category)) groups.set(db.category, []);
    groups.get(db.category).push(db);
  });

  return [...groups.entries()]
    .sort((a, b) => fnMeta(a[0]).order - fnMeta(b[0]).order)
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
    }));
}

function iconHtml(db, className = 'db-icon') {
  const { color } = fnMeta(db.category);
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
  box.style.background = fnMeta(db.category).color;
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

  els.databaseSections.innerHTML = groups.map(({ category, items }) => {
    const { color } = fnMeta(category);
    const cards = items.map((db) => `
      <article class="db-card" tabindex="0" data-name="${esc(db.name)}"
        style="--card-accent:${color}" aria-label="View ${esc(db.name)} details">
        ${iconHtml(db)}
        <span class="db-name">${esc(db.name)}</span>
      </article>`).join('');

    return `
      <section class="function-section" style="--fn-color:${color}">
        <header class="function-header">
          <h2 class="function-title">${esc(category)}</h2>
          <span class="function-count">${items.length}</span>
        </header>
        <div class="database-grid">${cards}</div>
      </section>`;
  }).join('');

  const total = state.databases.length;
  if (els.resultCount) {
    els.resultCount.textContent = filtered.length === total
      ? `${total} databases`
      : `Showing ${filtered.length} of ${total} databases`;
  }

  els.emptyState.classList.toggle('hidden', filtered.length > 0);
  els.databaseSections.classList.toggle('hidden', filtered.length === 0);
}

function openModal(db) {
  els.modalIcon.innerHTML = db.img
    ? `<img src="${esc(db.img)}" alt="" decoding="async">`
    : '';
  els.modalIcon.className = db.img ? 'modal-icon modal-icon--img' : 'modal-icon';
  els.modalIcon.style.background = db.img ? '' : fnMeta(db.category).color;
  if (!db.img) els.modalIcon.textContent = initials(db.name);

  const img = els.modalIcon.querySelector('img');
  if (img) img.onerror = () => fallbackIcon(img);

  els.modalFunction.textContent = db.category;
  els.modalFunction.style.color = fnMeta(db.category).color;
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
  try {
    const res = await fetch(DATA_PATH);
    if (!res.ok) {
      showError(`Failed to load CSV file (HTTP ${res.status}). Open via an HTTP server or GitHub Pages.`);
      return;
    }

    state.databases = parseCsv(await res.text());
    if (!state.databases.length) {
      showError('No data found in CSV file.');
      return;
    }

  } catch (err) {
    showError(`Failed to load: ${err.message}. Open via an HTTP server or GitHub Pages.`);
    console.error(err);
    return;
  }

  els.loading.classList.add('hidden');
  els.pageLayout?.classList.remove('hidden');
  renderFilters();
  render();
}

els.searchInput?.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  render();
});

els.subjectFilters?.addEventListener('change', (e) => {
  if (e.target.type !== 'checkbox') return;
  if (e.target.checked) state.selectedSubjects.add(e.target.value);
  else state.selectedSubjects.delete(e.target.value);
  renderFilters();
  render();
});

els.selectAllBtn?.addEventListener('click', () => {
  state.databases.flatMap((db) => db.subjects).forEach((s) => state.selectedSubjects.add(s));
  renderFilters();
  render();
});

els.clearAllBtn?.addEventListener('click', () => {
  state.selectedSubjects.clear();
  renderFilters();
  render();
});

function resetFilters() {
  state.selectedSubjects.clear();
  state.searchQuery = '';
  if (els.searchInput) els.searchInput.value = '';
  renderFilters();
  render();
}

els.resetFiltersBtn?.addEventListener('click', resetFilters);

els.databaseSections?.addEventListener('click', (e) => {
  const card = e.target.closest('.db-card');
  if (!card) return;
  const db = state.databases.find((d) => d.name === card.dataset.name);
  if (db) openModal(db);
});

els.databaseSections?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.db-card');
  if (!card) return;
  e.preventDefault();
  const db = state.databases.find((d) => d.name === card.dataset.name);
  if (db) openModal(db);
});

els.databaseSections?.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') fallbackIcon(e.target);
}, true);

els.modalClose?.addEventListener('click', closeModal);
els.modalOverlay?.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modalOverlay.classList.contains('hidden')) closeModal();
});

init();
