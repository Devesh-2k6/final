# ExpiryGo 🚀

Near-expiry grocery deals from local shops. Fight food waste and save money.

## Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL (Supabase) / SQLite
- **Mobile:** Capacitor (Android)
- **Auth:** JWT (register / login), bcrypt passwords

## Project Structure

- `/src` - Next.js frontend source code (Root is the frontend)
- `/backend` - FastAPI backend source code
- `/android` - Android platform files for Capacitor
- `/public` - Static assets for the web/app

## Run locally

**Terminal 1 — API**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Web/App**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Android App

To run the Android app:

```bash
npm run build:android
npm run cap:open
```

## Auth flows

 Role | Sign up | After login |
------|---------|-------------|
 **Customer** | Sign up → Customer | Browse `/deals` and `/map` |
 **Shopkeeper** | Sign up → Shopkeeper | `/shop` dashboard to manage products |

## Configuration

`.env.local` (Root):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`backend/.env`:

```env
JWT_SECRET_KEY=change-me-in-production
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## API docs

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
