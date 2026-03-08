# Eliteserien DSS – SaaS MVP

## Mappestruktur
```
eliteserien_saas/
├── main.py          ← FastAPI backend
├── data.parquet     ← Spillerdata
├── .env             ← API-nøkler (lag selv)
├── requirements.txt
└── frontend/        ← Next.js frontend
    ├── src/app/
    │   ├── page.tsx       ← Hele appen
    │   ├── layout.tsx
    │   └── globals.css
    └── src/lib/
        └── api.ts         ← API-kall
```

## Oppsett

### 1. Backend (FastAPI)
```bash
cd ~/Documents/eliteserien_saas
pip install fastapi uvicorn pandas numpy plotly pyarrow
uvicorn main:app --reload --port 8000
```
Backend kjører på http://localhost:8000
API-dokumentasjon: http://localhost:8000/docs

### 2. Frontend (Next.js)
```bash
cd ~/Documents/eliteserien_saas/frontend
npm install
npm run dev
```
Frontend kjører på http://localhost:3000

### 3. AI Chat (valgfritt)
Lag en `.env`-fil i `eliteserien_saas/`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Installer: `pip install anthropic`

## Endepunkter
| Endepunkt | Beskrivelse |
|-----------|-------------|
| GET /api/meta | Metadata og lister |
| GET /api/players | Filtrert spillerliste |
| GET /api/player/{name} | Spillerkort med figurer |
| GET /api/scatter | Talent Map data |
| GET /api/duell | Duell-analyse |
| GET /api/scout | U23 scout-rapport |
| GET /api/top | Topp-lister |
| POST /api/chat | AI-chat |

## Deploy (etter master)
- Backend → Railway.app (gratis tier)
- Frontend → Vercel (gratis)
- Database → Supabase (neste fase)
