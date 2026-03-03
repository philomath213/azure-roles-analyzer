# Azure RBAC Role Analyzer

A browser-based tool for exploring and analyzing Azure built-in and custom RBAC roles. Visualize role hierarchies, search by name, and find least-privilege roles by the permissions they grant.

**Live demo:** <https://philomath213.github.io/azure-roles-analyzer/>

---

## Features

### Three view modes

| Mode                  | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| **List**              | Flat, searchable list of all roles                                                      |
| **Hierarchy**         | Tree showing parent -> child role relationships based on permission containment         |
| **Permission Search** | Inverse search - enter permissions (wildcards supported) and find roles that grant them |

### Role details panel

Click any role to open a side panel with four tabs:

- **Overview** - description, type, and assignable scopes
- **Permissions** - control-plane actions / notActions
- **Data Actions** - data-plane actions / notDataActions
- **JSON** - raw role definition

### Permission Search scoring

Each result shows:

- **Match %** - share of your searched permissions covered by the role (wildcards in role actions handled correctly)
- **Overpermission %** - share of the role's declared actions that exceed what you searched for
- AND / OR match mode toggle
- Control Plane / Data Plane / Both plane selector

---

## Project structure

```text
src/app/
├── app.ts / app.html / app.css   # Root component - layout, view switching, stats
├── components/
│   ├── hierarchy-tree/           # ARIA tree view of role hierarchy
│   ├── permission-search/        # Permission-based role search with scoring
│   ├── role-details/             # Tabbed role details panel
│   ├── role-list/                # Flat list view
│   └── role-search/              # Name/description search input
├── services/
│   ├── role.service.ts           # Loads and stores role data (signals)
│   ├── app-state.service.ts      # Selected role and active tab state
│   ├── search.service.ts         # Name/description search query state
│   ├── permission-search.service.ts  # Permission search state and scoring
│   ├── permission-engine.service.ts  # Wildcard permission matching logic
│   └── hierarchy-builder.service.ts  # Builds parent→child role hierarchy
├── models/                       # TypeScript interfaces
└── utils/                        # Permission matching and validation utilities
```

---

## Tech stack

- **Angular 21** - standalone components, signals, OnPush change detection, native control flow
- **TypeScript 5.9** - strict mode
- **Vitest** - unit tests (338 tests)
- **GitHub Actions** - CI pipeline (test → build → deploy)
- **GitHub Pages** - hosting

---

## CI / CD

Every push and pull request to `main` runs:

1. **Test** - `npm test`
2. **Build** - `npm run build:gh-pages`
3. **Deploy** (main branch pushes only) - deploys to GitHub Pages via `actions/deploy-pages`
