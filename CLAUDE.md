# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

센텀 밥집 (Centum Bob) - A cafeteria menu management system that uses GPT-4o Vision API to extract menu data from meal images. The project consists of three main applications:

- **Admin Frontend** (frontend/): React admin panel for uploading meal images, running GPT analysis, and editing menu data
- **Backend** (backend/): Express.js API server that handles GPT Vision analysis, SQLite database, and data transformation
- **Viewer** (viewer/): Public-facing React app deployed to GitHub Pages showing weekly menus

## Common Commands

### Development (run each in separate terminal)

```bash
# Backend (port 9101)
cd backend && npm start

# Admin Frontend (port 9102)
cd frontend && npm run dev

# Viewer (port 9103)
cd viewer && npm run dev
```

### Docker Development

```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Production mode
docker-compose up -d
```

### Build

```bash
# Build viewer for GitHub Pages
cd viewer && npm run build
```

## Architecture

### Data Flow

1. Admin uploads meal image -> Backend analyzes via Tesseract OCR + GPT-4o Vision -> Extracted menu data returned
2. Admin edits and saves menu -> Backend stores in SQLite (`backend/db/menu.db`)
3. Admin publishes -> Backend generates `data/menu-data.json`
4. GitHub Actions copies JSON to viewer and deploys to GitHub Pages

### Key Backend Modules (backend/)

- `server.js`: Express routes for image analysis (`/api/analyze`), menu CRUD, blog generation, and health checks
- `database.js`: SQLite operations using better-sqlite3 for menu_data, restaurants, date_ranges tables
- `utils/transform.js`: Transforms database format to viewer-compatible JSON
- `utils/blogGenerator.js`: Generates Jekyll/Tistory blog posts from menu data
- `utils/newsProvider.js`: Fetches daily news for blog content

### Frontend Components

Both frontend and viewer use React + Vite + Tailwind CSS:

- Admin tabs: EntryTab (image upload/GPT analysis), ManagementTab (restaurants/dates), BlogTab, ComplaintTab, ApiGuideTab
- Viewer: Single page showing weekly menus with day tabs, image modal, complaint submission

### Database Schema

Three main tables in SQLite:
- `menu_data`: Stores menus per restaurant/date_range with JSON menus field
- `restaurants`: Restaurant list with pricing, dinner availability, sort order
- `date_ranges`: Week ranges with year/week numbers for ordering

### Environment Variables (.env)

```
OPENAI_API_KEY=...       # Required for GPT-4o Vision
SUPABASE_URL=...         # For page view tracking and complaints
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
PORT=9101
```

## Deployment

Viewer auto-deploys to GitHub Pages when pushing changes to `viewer/` or `data/menu-data.json` on main branch. The workflow (`.github/workflows/deploy-viewer.yml`) automatically injects the repository name as the base path.

## Port Assignments

- 9101: Backend API
- 9102: Admin Frontend
- 9103: Viewer
