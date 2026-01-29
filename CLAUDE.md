# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

센텀 밥집 (Centum Bob) - A cafeteria menu management system that uses GPT-4o Vision API to extract menu data from meal images. The project consists of three main applications:

- **Admin Frontend** (frontend/): React admin panel for uploading meal images, running GPT analysis, and editing menu data
- **Backend** (backend/): Express.js API server that handles GPT Vision analysis, Supabase database/storage, and data transformation
- **Viewer** (viewer/): Public-facing React app deployed to GitHub Pages showing weekly menus

## Common Commands

### Development

```bash
# All services at once (recommended)
npm run dev

# Or run each in separate terminal
cd backend && npm start     # Backend (port 9101)
cd frontend && npm run dev  # Admin Frontend (port 9102)
cd viewer && npm run dev    # Viewer (port 9103)
```

### Setup

```bash
# Install all dependencies
npm run install:all

# Create .env file in root with:
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
PORT=9101
```

### Build & Deploy

```bash
# Build viewer for GitHub Pages
cd viewer && npm run build

# Manual deployment: push changes to main branch
# Auto-deploys when viewer/ or data/menu-data.json changes
git push origin main
```

## Architecture

### Data Flow

1. Admin uploads meal image -> Backend analyzes via Tesseract OCR + GPT-4o Vision -> Extracted menu data returned
2. Admin edits and saves menu -> Backend stores in Supabase database and uploads images to Supabase Storage
3. Admin publishes -> Backend transforms data and generates `data/menu-data.json` with Supabase Storage CDN URLs
4. GitHub Actions copies JSON to `viewer/public/data/` and deploys to GitHub Pages
5. Viewer fetches menu-data.json and displays images from Supabase Storage CDN

### Image Storage Migration

The system migrated from local file storage to Supabase Storage:
- **Old**: Images stored in `backend/uploads/` and copied to `viewer/public/images/`
- **New**: Images uploaded to Supabase Storage bucket `menu-images`, served via CDN
- `utils/supabaseStorage.js` handles upload, URL generation, and path resolution
- Viewer uses `resolveImageUrl()` to support both legacy local paths and Supabase URLs

### Key Backend Modules (backend/)

- `server.js`: Express routes for image analysis, menu CRUD, blog generation, webhooks, and complaints
- `supabase-database.js`: Supabase operations for menu_data, restaurants, date_ranges tables (replaces SQLite)
- `database.js`: Legacy SQLite operations (kept for reference, system migrated to Supabase)
- `utils/transform.js`: Transforms database format (lunch/dinner) to viewer format (점심/저녁)
- `utils/supabaseStorage.js`: Image upload/download to Supabase Storage with URL resolution
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
- `POST /api/webhook/upload-from-url` - **[NEW]** Download image from URL, analyze with OCR+GPT, and save to database (for n8n integration)
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

System uses **Supabase** (PostgreSQL) for data storage and **Supabase Storage** for images:

**menu_data table**: Menus per restaurant/date_range
- `restaurant_id` (FK to restaurants), `date_range_id` (FK to date_ranges)
- `menus`: JSON with structure `{ "월": { "lunch": [], "dinner": [] }, ... }`
- `image_paths`: JSON with day-specific images, supports both local paths and Supabase Storage URLs
  - Supabase Storage: `menu-images/파일명.jpg` (resolved via `utils/supabaseStorage.js`)
  - Legacy local: `uploads/파일명.jpg`
- `excluded_menu_items`: JSON array of items to hide from viewer
- `price_lunch`, `price_dinner`: Price information per restaurant

**restaurants table**: Restaurant configuration
- `name`, `is_active`, `sort_order`: Basic info and display order
- `has_dinner`, `use_all_days`: Display options for viewer
- `webhook_url`, `webhook_type`: External data source integration (e.g., n8n)
- `price_lunch`, `price_dinner`: Default pricing

**date_ranges table**: Week ranges with auto-sorting
- `date_range` (e.g., "1.13-1.17"), `year`, `week`: Week identification
- `is_active`: Controls visibility in admin and viewer

**Supabase Storage Buckets**:
- `menu-images`: Public bucket for menu photos, accessible via CDN

### Environment Variables (.env in root)

```bash
# Required - OpenAI
OPENAI_API_KEY=...       # For GPT-4o Vision menu analysis

# Required - Supabase (database + storage)
SUPABASE_URL=...         # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...  # Admin access for backend operations
SUPABASE_ANON_KEY=...    # Public access for viewer (complaints, page views)

# Optional
PORT=9101                # Backend server port (default: 9101)
NODE_ENV=production      # Set to 'production' to reduce logging
```

Backend uses service role key for admin operations. Viewer uses anon key for public features (embedded in viewer build).

## Deployment

Viewer auto-deploys to GitHub Pages via `.github/workflows/deploy-viewer.yml` when:
- Changes pushed to `viewer/` directory
- Changes to `data/menu-data.json`
- Manual trigger via workflow_dispatch

The workflow:
1. Installs dependencies and copies `data/menu-data.json` to `viewer/public/data/`
2. Builds with dynamic base path injection (auto-detects repo name)
3. Injects version info, GitHub username, and repository name into HTML
4. Updates robots.txt and sitemap.xml with correct URLs
5. Deploys to GitHub Pages with automatic Pages enablement

**Environment Variables for Deployment**:
Set these as GitHub Secrets for production builds:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key for viewer features
- `VITE_API_URL`: Backend API URL (optional, defaults to localhost)

## Port Assignments

- 9101: Backend API (`backend/server.js`)
- 9102: Admin Frontend (`frontend/`)
- 9103: Viewer (`viewer/`)

## Important Code Patterns

### Image Path Resolution
Images can be stored locally or in Supabase Storage. Always use `resolveImageUrl()` from `utils/supabaseStorage.js`:
```javascript
import { resolveImageUrl, isSupabaseStoragePath } from './utils/supabaseStorage.js';

// Check path type
const isSupabase = isSupabaseStoragePath(imagePath); // true if starts with 'menu-images/'

// Get full URL (handles both local and Supabase paths)
const fullUrl = resolveImageUrl(imagePath);
```

### GPT Vision Analysis
OCR + GPT-4o Vision pipeline for menu extraction:
1. Tesseract OCR extracts text from image (preprocessed for better accuracy)
2. OCR text sent to GPT-4o Vision as context + image
3. GPT returns structured JSON with menus/prices
4. Backend validates and saves to database

See `server.js:analyzeImageWithGPT()` for implementation.

### Database Operations
Always use functions from `supabase-database.js`, not raw SQL:
```javascript
import { getMenuData, saveMenuData, getActiveRestaurants } from './supabase-database.js';

// Good: Use exported functions
const menuData = await getMenuData(restaurantId, dateRangeId);
await saveMenuData({ restaurant_id, date_range_id, menus, image_paths });

// Bad: Don't write raw SQL queries
```

## Troubleshooting

### Backend fails to start
- Check `.env` file exists in root with all required variables
- Verify Supabase credentials are correct
- Ensure port 9101 is not already in use

### Images not loading in viewer
- Check if image paths in `menu-data.json` are Supabase Storage URLs or legacy local paths
- Verify Supabase Storage bucket `menu-images` is public
- Check browser console for CORS errors

### GPT analysis fails or returns poor results
- Verify `OPENAI_API_KEY` is valid and has GPT-4o Vision access
- Check image quality (low resolution or blurry images reduce accuracy)
- Review OCR preprocessing in `server.js:preprocessImageForOCR()`

### "활성화된 날짜 범위가 없습니다" error
- Admin panel -> Management tab -> Date Ranges
- Add new date range and ensure `is_active` is checked

### Viewer shows old data after publish
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Check `data/menu-data.json` was updated
- Verify GitHub Actions deployment completed successfully

## n8n Integration

The system supports automatic menu updates via n8n workflows. Use the `/api/webhook/upload-from-url` endpoint to automatically download, analyze, and save menu images.

### Endpoint: POST /api/webhook/upload-from-url

**Request Body**:
```json
{
  "image_url": "https://...",
  "restaurant_id": 6,
  "type": "개별요일",  // or "전체요일"
  "day_id": "월"       // required only for "개별요일"
}
```

**Response**:
```json
{
  "success": true,
  "message": "메뉴가 성공적으로 업로드되었습니다.",
  "data": {
    "restaurant_id": 6,
    "restaurant_name": "삼촌밥차",
    "date_range": "1.13-1.17",
    "type": "개별요일",
    "day_id": "월",
    "extracted_data": { ... },
    "saved_image": "삼촌밥차_1.13-1.17_1234567890.jpg"
  }
}
```

### n8n Workflow Setup

1. Schedule trigger runs daily at specific times (e.g., 10-11 AM on weekdays)
2. Fetch latest menu image from external source (e.g., Kakao profile page)
3. Calculate current Korean day of week (월/화/수/목/금)
4. Send POST request to `/api/webhook/upload-from-url` with image URL
5. System automatically downloads, analyzes (OCR + GPT-4o Vision), and saves to database

See `N8N_INTEGRATION.md` for detailed setup instructions.
