# Database Catalog

A static webpage showcasing academic and research databases, powered by a CSV data file and deployable on GitHub Pages.

## Features

- Loads database info from `data/databases.csv`
- **Groups databases by function** (A&I, Find Articles, AI Tools, etc.)
- Card grid within each function section (click icon for details)
- Filter by related subjects (multi-select)
- Keyword search (name only)
- Category “Guide” links are shown only when `guideHref` is set for that category.
- Detail modal with intro, related subjects, and access link

## CSV Column Format

The app loads `data/databases.csv` via `fetch()` and parses it in `js/csvParser.js`.

Current CSV header (9 columns):

| Column | Description |
|--------|-------------|
| `database name` | Database/display name |
| `intro` | Short introduction (shown in modal) |
| `related subjects` | Subject tags for filtering (pipe `|` separated) |
| `access url` | Link for “Access Database” |
| `function` | Category key (drives grouping; canonical name or alias) |
| `img` | Icon image path (relative, e.g. `/img/scite.png`) |
| `open_resource` | `y`/`n` (used by “Free Resource” vs “Library Supported”) |
| `ai_feature` | `y`/`n` (used by “With AI Features” vs “Structured Databases”) |
| `sort` | Sort order within the category |

CSV quoting rule:
- Fields are split by commas that are not inside double quotes.
- If a field contains commas (commonly `intro`), wrap the entire field in double quotes.

Example:

```csv
database name,intro,related subjects,access url,function,img,open_resource,ai_feature,sort
Scite,"Scite is an AI-powered platform for discovering and evaluating scientific articles via Smart Citations.",Chemistry|Physics and Materials Science|Food Science and Nutrition|Life Sciences,https://www.lib.polyu.edu.hk/databases/scite,AI Tools,/img/scite.png,n,y,2
```

### Function Groups

Categories are defined in `js/categories.js`. The `function` column may use any alias that maps to a category.

| Function | Description |
|----------|-------------|
| AI Research Tool | AI platforms that help your research. |
| Library Resource | Search engine for accessing scholarly materials in PolyU Library. |
| Find Article | Databases to discover journal articles. |
| Experiment Design | Practical resources for experiment planning and methods design. |
| Find Standard | Standards and technical specifications for your research. |
| Find Patent | Patent databases for searching inventions and their legal status. |
| Find Theses | Locate research thesis and dissertation. |
| Publisher | Browse collections from specific publishers. |


## Project Structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── ui.js
│   ├── state.js
│   ├── csvParser.js
│   ├── categories.js
│   ├── config.js
│   └── app.legacy.js (optional; old monolithic version)
├── data/
│   └── databases.csv
└── README.md
```

## JS Modules Overview

- `js/config.js`
  - Resolves the correct base URL for assets on GitHub Pages (supports subpath deployments).
  - Exports `DATA_URL` (the URL for `data/databases.csv`) and `resolveAssetUrl()` (converts paths like `/img/...` into working URLs).
- `js/categories.js`
  - Defines the category registry: canonical names, colors, descriptions, and optional `guideHref`.
  - Exports `normalizeCategory()` / `getCategory()` to map CSV `function` values (including aliases) into the UI category.
  - `guideHref` is used to decide whether the “Guide” link is rendered for that category.
- `js/state.js`
  - Stores app state (`state`, including filters + parsed database records).
  - Collects DOM references (`ui`) by element id.
  - Exports `esc()` to safely escape strings inserted into HTML.
- `js/csvParser.js`
  - Downloads/parses CSV text into database records that the UI consumes.
  - Converts CSV columns into a consistent 9-field shape:
    - `related subjects` → `subjects[]` (split by `|`)
    - `open_resource` / `ai_feature` → booleans via `y/n`
    - `img` → resolved asset URL via `resolveAssetUrl()`
- `js/ui.js`
  - Pure(ish) UI layer: filtering, grouping, and rendering.
  - Implements:
    - Card view and Table view (based on `state.viewMode`)
    - Category grouping + ordering via `getCategory().order`
    - Detail modal opening (and filling intro/tags/access link)
    - “Guide” link rendering (only when `guideHref` is non-empty)
    - Broken image fallback (`replaceBrokenIcon()`)
- `js/main.js`
  - The entry point:
    - `loadDatabases()` fetches `DATA_URL`, parses CSV via `parseCsv()`, and populates `state.databases`.
    - `bindEvents()` wires up search, subject filters, view toggle, reset actions, card click → modal open, and image error fallback.
    - Calls initial render (`renderAll()`) after data load.

### Local Preview

This page loads `data/databases.csv` via `fetch()`, so you need an HTTP server (GitHub Pages / localhost server). Opening `index.html` directly may fail due to browser restrictions.
