# Database Catalog

A static webpage showcasing academic and research databases, powered by a CSV data file and deployable on GitHub Pages.

## Features

- Loads database info from `data/databases.csv`
- **Groups databases by function** (A&I, Find Articles, AI Tools, etc.)
- Card grid within each function section (click icon for details)
- Filter by related subjects (multi-select)
- Keyword search (name, intro, type, function)
- Detail modal with intro, features, coverage, and access link

## CSV Column Format

Edit `data/databases.csv`. Column headers (row 1):

| Column | Description | Separator |
|--------|-------------|-----------|
| database name | Database name | — |
| intro | Short introduction | — |
| features | Key features | semicolon `;` |
| coverage | Coverage scope | — |
| database type | Database type label | — |
| related subjects | Related disciplines | pipe `\|` (multiple) |
| access url | Access URL | — |
| function | Display group (e.g. AI Research, Find Article) | — |
| img | Logo image path (e.g. `/img/scopus.png`) | — |
| sort | Display order within the same function (lower = first) | number |

### Function Groups

| Function | Description |
|----------|-------------|
| A&I | Abstracting & indexing / citation databases |
| Find Articles | Article discovery and search tools |
| AI Tools | AI-powered research assistants |
| Sequence & Genomics | Genomic sequence repositories |
| Structural Biology | 3D macromolecular structure data |
| Chemical & Drug | Compound and reaction databases |
| Geographic Data | Geospatial and place-name data |
| Clinical Trials | Clinical study registries |

## Local Preview

Requires a local HTTP server (opening `index.html` directly will fail due to browser CORS restrictions):

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```

Open `http://localhost:8080` in your browser.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch`
4. Choose branch `main`, folder `/ (root)`
5. Access at `https://<username>.github.io/<repo>/` within a few minutes

## Project Structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── databases.csv
└── README.md
```
