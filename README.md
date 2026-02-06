# SD City Nature Challenge Optimization

A full-stack data visualization and analysis tool for the UC San Diego Natural Reserve System (NRS) to optimize biodiversity observation efforts during the annual City Nature Challenge.

## Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6
- Leaflet (react-leaflet)
- Recharts & Plotly.js

**Backend:**
- Python FastAPI
- Pandas, GeoPandas, H3
- Pydantic

## Project Structure

```
sd-city-nature-challenge/
├── frontend/          # React + TypeScript frontend
├── backend/           # FastAPI backend
├── .gitignore
└── README.md
```

## Setup Instructions

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API will run on `http://localhost:8000`

## Data Setup

Place iNaturalist observation CSV exports for San Diego, San Antonio, and Los Angeles in `backend/data/`.

## Team Page Assignments

| Page | Component | Backend Router | Owner |
|------|-----------|----------------|-------|
| Exploratory Analysis | `ExploratoryAnalysis.tsx` | `routers/exploratory.py` | TBD |
| Hotspot & Gap Analysis | `HotspotAnalysis.tsx` | `routers/hotspots.py` | TBD |
| City Comparison | `CityComparison.tsx` | `routers/comparison.py` | TBD |
| Strategy Recommendations | `StrategyRecommendations.tsx` | `routers/strategy.py` | TBD |

## Development Guidelines

- Each team member owns their assigned page and corresponding backend router
- Shared components live in `frontend/src/components/`
- All endpoints return working dummy data by default
- Pages are fully independent — shared logic only in common modules

## License

UC San Diego Natural Reserve System © 2026
