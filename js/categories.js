/* ── Categories ─────────────────────────────────────────────────────── */

/** Display groups: `name` is the canonical title; CSV `function` may use any listed alias. */
const CATEGORIES = [
  {
    name: 'AI Research Tool',
    color: '#5b6f9e',
    aliases: ['AI Tools'],
    description: 'AI Research Tool is a platform that uses artificial intelligence to help you search, summarize, and organize scholarly information more efficiently.',
    guideHref: '',
  },
  {
    name: 'Library Resource',
    color: '#3f8f8c',
    aliases: ['Library Resource'],
    description: 'Library Resource is a search tool provided by PolyU Library that helps you discover the Library’s collection.',
    guideHref: '',
  },
  {
    name: 'Find Article',
    color: '#4f7fb7',
    aliases: ['Find Article', 'Find Journal', 'A&I'],
    description: '“Find Article” refers to platforms that let you search for journal articles relevant to your topic using keywords, authors, or DOIs.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=3564303',
  },
  {
    name: 'Experiment Design',
    color: '#5f9272',
    description: '“Experiment Design” resources are handbooks and methodological guides that help you plan your experiments.',
    guideHref: '',
  },
  {
    name: 'Find Standard',
    color: '#a8793f',
    aliases: ['Find Standard'],
    description: '“Find Standard” platforms help you locate official technical standards, specifications, and guidelines issued by regulatory bodies.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=6596063',
  },
  {
    name: 'Find Patent',
    color: '#3c837f',
    aliases: ['Find Patent'],
    description: '“Find Patent” refers to patent databases where you can search inventions and their technical descriptions.',
    guideHref: '',
  },
  {
    name: 'Find Theses',
    color: '#6f6aa8',
    aliases: ['Find Theses'],
    description: '“Find Theses” platforms allow you to discover master’s and doctoral theses and dissertations.',
    guideHref: 'https://libguides.lb.polyu.edu.hk/c.php?g=521255&p=7187782',
  },
  {
    name: 'Publisher',
    color: '#a35d7a',
    description: '“Publisher” collections are interfaces that let you browse content from a specific academic publisher.',
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

