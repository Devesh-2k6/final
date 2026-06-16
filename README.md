# FreshSave

Near-expiry grocery deals from local shops.

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind
- **Backend:** FastAPI, SQLAlchemy, **SQLite** (`backend/data/freshsave.db`)
- **Auth:** JWT (register / login), bcrypt passwords

## Run locally

**Terminal 1 — API**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Web**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth flows

| Role | Sign up | After login |
|------|---------|-------------|
| **Customer** | Sign up → Customer | Browse `/deals` and `/map` (no shop login required to browse) |
| **Shopkeeper** | Sign up → Shopkeeper | `/shop` or `/shop/setup` if no shop yet |

- **Sign in / Sign up:** `/auth` or link on home page  
- **Shop routes** (`/shop/*`) require login (shopkeeper account)  
- **Browse deals** (`/deals`, `/map`) works without login  

## Configuration

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

`backend/.env` (optional):

```env
JWT_SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite:///./data/freshsave.db
```

## API docs

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
