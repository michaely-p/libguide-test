/* ── Categories ─────────────────────────────────────────────────────── */

/** Display groups: `name` is the canonical title; CSV `function` may use any listed alias. */
const CATEGORIES = [
  {
    name: 'AI Research Tool',
    color: '#5b6f9e',
    aliases: ['AI Tools'],
    description: 'AI platforms that help your research.',
    guideHref: '',
  },
  {
    name: 'Library Resource',
    color: '#3f8f8c',
    aliases: ['Library Resource'],
    description: 'Search engine for accessing scholarly materials in PolyU Library.',
    guideHref: '',
  },
  {
    name: 'Find Article',
    color: '#4f7fb7',
    aliases: ['Find Article', 'Find Journal', 'A&I'],
    description: 'Databases to discover journal articles.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=3564303',
  },
  {
    name: 'Experiment Design',
    color: '#5f9272',
    description: 'Practical resources for experiment planning and methods design.',
    guideHref: '',
  },
  {
    name: 'Find Standard',
    color: '#a8793f',
    aliases: ['Find Standard'],
    description: 'Standards and technical specifications for your research.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=6596063',
  },
  {
    name: 'Find Patent',
    color: '#3c837f',
    aliases: ['Find Patent'],
    description: 'Patent databases for searching inventions and their legal status.',
    guideHref: '',
  },
  {
    name: 'Find Theses',
    color: '#6f6aa8',
    aliases: ['Find Theses'],
    description: 'Locate research thesis and dissertation.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=7187782',
  },
  {
    name: 'Publisher',
    color: '#a35d7a',
    description: 'Browse collections from specific publishers.',
    guideHref: '',
  },
];

const DEFAULT_CATEGORY = {
  name: 'Other',
  color: '#74808f',
  order: 99,
  description: '',
  guideHref: '',
};

/* ── Category registry (built once from CATEGORIES) ─────────────────── */

const categoryLookup = new Map();
const categoryMeta = new Map();

CATEGORIES.forEach(({ name, color, aliases = [], description = '', guideHref = '' }, order) => {
  categoryMeta.set(name, { name, color, order, description, guideHref });
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

export {
  CATEGORIES,
  DEFAULT_CATEGORY,
  normalizeCategory,
  getCategory,
};

