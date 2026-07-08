/* ── State & DOM ────────────────────────────────────────────────────── */

const state = {
  databases: [],
  selectedSubjects: new Set(),
  searchQuery: '',
  librarySupportedOnly: false,
  freeResourcesOnly: false,
  aiFeaturesOnly: false,
  traditionalOnly: false,
  viewMode: 'cards',
};

const ui = {
  status: document.getElementById('status'),
  catalog: document.getElementById('catalog'),
  empty: document.getElementById('empty'),
  subjects: document.getElementById('subjects'),
  search: document.getElementById('search'),
  clearSubjects: document.getElementById('clearSubjects'),
  librarySupported: document.getElementById('librarySupported'),
  freeResources: document.getElementById('freeResources'),
  aiFeatures: document.getElementById('aiFeatures'),
  traditional: document.getElementById('traditional'),
  filterReset: document.getElementById('filterReset'),
  reset: document.getElementById('reset'),
  cardView: document.getElementById('cardView'),
  tableView: document.getElementById('tableView'),
  detailModal: document.getElementById('detailModal'),
  modalIcon: document.getElementById('modalIcon'),
  modalCat: document.getElementById('modalCat'),
  modalTitle: document.getElementById('modalTitle'),
  modalIntro: document.getElementById('modalIntro'),
  modalTags: document.getElementById('modalTags'),
  modalLink: document.getElementById('modalLink'),
};

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export { state, ui, esc };

