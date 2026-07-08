/* ── App Main (Events + Data Loading) ──────────────────────────────── */

import { DATA_URL } from './config.js';
import { parseCsv } from './csvParser.js';
import { state, ui } from './state.js';
import {
  renderCatalog,
  renderAll,
  openDatabaseModal,
  resetFilters,
  replaceBrokenIcon,
  showLoadError,
} from './ui.js';

async function loadDatabases() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const databases = parseCsv(await response.text());
  if (!databases.length) throw new Error('Empty CSV');

  state.databases = databases;
}

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

  ui.freeResources.addEventListener('change', (event) => {
    state.freeResourcesOnly = event.target.checked;
    renderCatalog();
  });

  ui.aiFeatures.addEventListener('change', (event) => {
    state.aiFeaturesOnly = event.target.checked;
    renderCatalog();
  });

  ui.traditional.addEventListener('change', (event) => {
    state.traditionalOnly = event.target.checked;
    renderCatalog();
  });

  ui.reset.addEventListener('click', resetFilters);
  ui.filterReset?.addEventListener('click', resetFilters);

  [ui.cardView, ui.tableView].forEach((button) => {
    button.addEventListener('click', () => {
      state.viewMode = button.dataset.viewMode;
      renderCatalog();
    });
  });

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
  } catch (error) {
    showLoadError(`Failed to load data: ${error.message}`);
    return;
  }

  try {
    renderAll();
  } catch (error) {
    showLoadError(`Failed to display data: ${error.message}`);
  }
}

bindEvents();
init();

