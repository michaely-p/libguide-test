/**
 * Database Catalog — reads data/databases.csv and renders databases grouped by function.
 */

const CSV_PATH = 'data/databases.csv';

const FUNCTION_META = {
  'A&I': {
    description: 'Abstracting & indexing databases for citation tracking and bibliometrics.',
    color: '#6c9eff',
    order: 1,
  },
  'Find Articles': {
    description: 'Discovery tools to search and locate scholarly articles across disciplines.',
    color: '#38bdf8',
    order: 2,
  },
  'AI Tools': {
    description: 'AI-powered assistants for literature review, summarization, and evidence synthesis.',
    color: '#a78bfa',
    order: 3,
  },
  'Sequence & Genomics': {
    description: 'Nucleotide and genomic sequence repositories and search tools.',
    color: '#34d399',
    order: 4,
  },
  'Structural Biology': {
    description: '3D macromolecular structure databases and visualization tools.',
    color: '#f472b6',
    order: 5,
  },
  'Chemical & Drug': {
    description: 'Compound, reaction, and bioactivity databases for drug discovery.',
    color: '#fbbf24',
    order: 6,
  },
  'Geographic Data': {
    description: 'Geospatial databases for place names, coordinates, and mapping.',
    color: '#2dd4bf',
    order: 7,
  },
  'Clinical Trials': {
    description: 'Registries and results databases for clinical study information.',
    color: '#fb7185',
    order: 8,
  },
};

const state = {
  databases: [],
  selectedSubjects: new Set(),
  searchQuery: '',
};

// ── CSV parsing ──

function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const lines = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  if (lines.length < 2) return rows;

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = (values[idx] || '').trim();
    });
    rows.push(normalizeRecord(record));
  }

  return rows;
}

function splitCSVLine(line) {
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
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function normalizeRecord(raw) {
  const subjects = (raw['related subjects'] || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const features = (raw.features || '')
    .split(';')
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    name: raw['database name'] || '',
    intro: raw.intro || '',
    features,
    coverage: raw.coverage || '',
    type: raw['database type'] || raw['databse type'] || '',
    subjects,
    url: raw['access url'] || '',
    function: raw.function || 'Other',
  };
}

// ── Helpers ──

function getFunctionMeta(fn) {
  return FUNCTION_META[fn] || {
    description: '',
    color: '#8b92a5',
    order: 99,
  };
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getInitials(name) {
  return name
    .split(/[\s\-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function getAllSubjects(databases) {
  const subjects = new Set();
  databases.forEach((db) => db.subjects.forEach((s) => subjects.add(s)));
  return [...subjects].sort((a, b) => a.localeCompare(b));
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return `${str.slice(0, max).trimEnd()}…`;
}

function filterDatabases() {
  return state.databases.filter((db) => {
    const matchesSearch =
      !state.searchQuery ||
      db.name.toLowerCase().includes(state.searchQuery) ||
      db.intro.toLowerCase().includes(state.searchQuery) ||
      db.type.toLowerCase().includes(state.searchQuery) ||
      db.function.toLowerCase().includes(state.searchQuery);

    const matchesSubject =
      state.selectedSubjects.size === 0 ||
      db.subjects.some((s) => state.selectedSubjects.has(s));

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
    .sort((a, b) => getFunctionMeta(a[0]).order - getFunctionMeta(b[0]).order)
    .map(([fn, items]) => ({ function: fn, items }));
}

// ── DOM refs ──

const els = {
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('errorMessage'),
  databaseSections: document.getElementById('databaseSections'),
  emptyState: document.getElementById('emptyState'),
  subjectFilters: document.getElementById('subjectFilters'),
  filterToggle: document.getElementById('filterToggle'),
  filterDropdown: document.getElementById('subjectFilterPanel'),
  filterBadge: document.getElementById('filterBadge'),
  filterWrap: document.getElementById('subjectFilterWrap'),
  searchInput: document.getElementById('searchInput'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  modalIcon: document.getElementById('modalIcon'),
  modalFunction: document.getElementById('modalFunction'),
  modalType: document.getElementById('modalType'),
  modalTitle: document.getElementById('modalTitle'),
  modalIntro: document.getElementById('modalIntro'),
  modalFeatures: document.getElementById('modalFeatures'),
  modalCoverage: document.getElementById('modalCoverage'),
  modalSubjects: document.getElementById('modalSubjects'),
  modalAccessBtn: document.getElementById('modalAccessBtn'),
};

// ── Render ──

function renderSubjectFilters() {
  const subjects = getAllSubjects(state.databases);
  els.subjectFilters.innerHTML = subjects
    .map(
      (subject) => `
    <label class="filter-chip ${state.selectedSubjects.has(subject) ? 'active' : ''}">
      <input type="checkbox" value="${escapeHtml(subject)}"
        ${state.selectedSubjects.has(subject) ? 'checked' : ''}>
      <span>${escapeHtml(subject)}</span>
    </label>`
    )
    .join('');

  els.subjectFilters.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state.selectedSubjects.add(input.value);
      } else {
        state.selectedSubjects.delete(input.value);
      }
      render();
    });
  });
}

function updateFilterBadge() {
  const count = state.selectedSubjects.size;
  els.filterBadge.textContent = count;
  els.filterBadge.classList.toggle('hidden', count === 0);
  els.filterToggle.classList.toggle('is-active', count > 0);
}

function renderCard(db) {
  const meta = getFunctionMeta(db.function);
  const color = meta.color;
  return `
    <article class="db-card" tabindex="0"
      data-name="${escapeHtml(db.name)}"
      style="--card-accent: ${color}"
      aria-label="View ${escapeHtml(db.name)} details">
      <div class="db-icon" style="background: linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})">
        ${escapeHtml(getInitials(db.name))}
      </div>
      <div class="db-card-body">
        <span class="db-name">${escapeHtml(db.name)}</span>
        <span class="db-intro">${escapeHtml(truncate(db.intro, 72))}</span>
      </div>
      <svg class="db-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </article>`;
}

function bindCardEvents(container, databases) {
  const dbMap = new Map(databases.map((db) => [db.name, db]));
  container.querySelectorAll('.db-card').forEach((card) => {
    const db = dbMap.get(card.dataset.name);
    if (!db) return;
    card.addEventListener('click', () => openModal(db));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(db);
      }
    });
  });
}

function renderSections(filtered) {
  const groups = groupByFunction(filtered);

  if (groups.length === 0) {
    els.databaseSections.innerHTML = '';
    return;
  }

  els.databaseSections.innerHTML = groups
    .map(({ function: fn, items }) => {
      const meta = getFunctionMeta(fn);
      return `
    <section class="function-section" id="section-${slugify(fn)}" aria-label="${escapeHtml(fn)}" style="--fn-color: ${meta.color}">
      <header class="function-header">
        <h2 class="function-title">${escapeHtml(fn)}</h2>
        <p class="function-desc">${escapeHtml(meta.description)}</p>
      </header>
      <div class="database-grid">
        ${items.map((db) => renderCard(db)).join('')}
      </div>
    </section>`;
    })
    .join('');

  bindCardEvents(els.databaseSections, filtered);
}

function render() {
  const filtered = filterDatabases();
  updateFilterBadge();
  renderSections(filtered);
  els.emptyState.classList.toggle('hidden', filtered.length > 0);
  els.databaseSections.classList.toggle('hidden', filtered.length === 0);
}

function openModal(db) {
  const meta = getFunctionMeta(db.function);
  const color = meta.color;

  els.modalIcon.textContent = getInitials(db.name);
  els.modalIcon.style.background = `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})`;
  els.modalFunction.textContent = db.function;
  els.modalTitle.textContent = db.name;
  els.modalIntro.textContent = db.intro;
  els.modalCoverage.textContent = db.coverage;
  els.modalType.textContent = db.type;

  els.modalFeatures.innerHTML = db.features
    .map((f) => `<li>${escapeHtml(f)}</li>`)
    .join('');

  els.modalSubjects.innerHTML = db.subjects
    .map((s) => `<span class="tag">${escapeHtml(s)}</span>`)
    .join('');

  els.modalAccessBtn.href = db.url;

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adjustBrightness(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Init ──

function showLoadError(message) {
  els.loading.classList.add('hidden');
  els.errorMessage.textContent = message;
  els.errorMessage.classList.remove('hidden');
}

async function init() {
  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) {
      showLoadError(`Failed to load CSV (HTTP ${response.status}). Please open this page via an HTTP server or GitHub Pages.`);
      return;
    }

    const text = await response.text();
    state.databases = parseCSV(text);

    if (state.databases.length === 0) {
      showLoadError('No data found in CSV file.');
      return;
    }

    els.loading.classList.add('hidden');
    renderSubjectFilters();
    render();
  } catch (err) {
    showLoadError(`Failed to load: ${err.message}. Please open this page via an HTTP server or GitHub Pages.`);
    console.error(err);
  }
}

// ── Events ──

els.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  render();
});

els.selectAllBtn.addEventListener('click', () => {
  getAllSubjects(state.databases).forEach((subject) => {
    state.selectedSubjects.add(subject);
  });
  renderSubjectFilters();
  render();
});

els.clearAllBtn.addEventListener('click', () => {
  state.selectedSubjects.clear();
  renderSubjectFilters();
  render();
});

els.filterToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !els.filterDropdown.classList.contains('hidden');
  els.filterDropdown.classList.toggle('hidden', isOpen);
  els.filterToggle.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (e) => {
  if (!els.filterWrap.contains(e.target)) {
    els.filterDropdown.classList.add('hidden');
    els.filterToggle.setAttribute('aria-expanded', 'false');
  }
});

els.modalClose.addEventListener('click', closeModal);

els.modalOverlay.addEventListener('click', (e) => {
  if (e.target === els.modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modalOverlay.classList.contains('hidden')) {
    closeModal();
  }
});

init();
