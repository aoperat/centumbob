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

### Build

```bash
# Build viewer for GitHub Pages
cd viewer && npm run build
```

## Architecture

### Data Flow

1. Admin uploads meal image -> Backend analyzes via Tesseract OCR + GPT-4o Vision -> Extracted menu data returned
2. Admin edits and saves menu -> Backend stores in SQLite (`backend/db/menu.db`)
3. Admin publishes -> Backend generates `data/menu-data.json` and copies images to `viewer/public/images/`
4. GitHub Actions copies JSON to viewer and deploys to GitHub Pages

### Key Backend Modules (backend/)

- `server.js`: Express routes for image analysis, menu CRUD, blog generation, webhooks, and complaints
- `database.js`: SQLite operations using better-sqlite3 with auto-migrations for schema changes
- `utils/transform.js`: Transforms database format (lunch/dinner) to viewer format (점심/저녁)
- `utils/blogGenerator.js`: Generates Jekyll/Tistory blog posts from menu data
- `utils/newsProvider.js`: Fetches daily news for blog content

### API Endpoints

Key endpoints in `backend/server.js`:
- `POST /api/analyze` - GPT-4o Vision analysis of uploaded menu images
- `POST /api/menu/upload` - Upload menu images for specific restaurant/day
- `GET/POST /api/load` - Load/save menu data for restaurant + date range
- `POST /api/publish` - Generate menu-data.json and copy images to viewer
- `GET/POST/PUT/DELETE /api/restaurants` - Restaurant CRUD
- `GET/POST/PUT/DELETE /api/date-ranges` - Date range CRUD
- `POST /api/webhook/fetch-image` - Fetch menu images from external webhooks
- `POST /api/webhook/fetch-json` - Fetch menu data from external JSON APIs
- `POST /api/blog/generate` - Generate blog posts for Tistory/Jekyll

### Frontend Components

Both frontend and viewer use React + Vite + Tailwind CSS:

Admin tabs (`frontend/src/components/`):
- `EntryTab.jsx`: Image upload, GPT analysis, menu editing per restaurant/day
- `ManagementTab.jsx`: Restaurant and date range management
- `BlogTab.jsx`: Blog post generation controls
- `ComplaintTab.jsx` / `ComplaintAdminTab.jsx`: User feedback management
- `ApiGuideTab.jsx`: API documentation for external integrations

Viewer (`viewer/src/components/`):
- `MenuList.jsx`: Weekly menu display with day tabs
- `ComplaintModal.jsx`: User complaint submission

### Database Schema

Three main tables in SQLite (`backend/db/menu.db`):

**menu_data**: Menus per restaurant/date_range
- `menus`: JSON with structure `{ "월": { "lunch": [], "dinner": [] }, ... }`
- `image_paths`: JSON with day-specific images `{ "월": "path/to/image.jpg", ... }`
- `excluded_menu_items`: JSON array of items to hide

**restaurants**: Restaurant configuration
- `has_dinner`, `use_all_days`: Display options
- `webhook_url`, `webhook_type`: External data source config

**date_ranges**: Week ranges with year/week for ordering

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
