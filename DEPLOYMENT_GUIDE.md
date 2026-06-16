# 🚀 DEPLOYMENT GUIDE FOR EXPIRY GO

This guide walks you through deploying the complete ExpiryGo app online (Vercel + Railway).

## 🎯 Quick Summary

- **Frontend:** Vercel (free, auto-deploys from GitHub)
- **Backend:** Railway (free tier, $5/month after)
- **Database:** PostgreSQL (Supabase or Railway)
- **Storage:** Supabase Storage (for product images)
- **Time to deploy:** ~30 minutes

---

## **STEP 1: Prepare GitHub Repository**

1. Create a GitHub account if you don't have one: https://github.com
2. Create a new repository called `expiry-go`
3. Initialize it locally:
   ```bash
   cd d:\mmmm\ExpiryGo
   git init
   git add .
   git commit -m "Initial commit: ExpiryGo app ready for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/expiry-go.git
   git push -u origin main
   ```

---

## **STEP 2: Set Up Supabase (Database + Storage)**

1. Go to: https://supabase.com
2. Sign up for free account
3. Create a new project (Region: closest to you)
4. Wait for project to initialize (~2 min)
5. In **Settings → Database → Connection Pooling**, copy the connection string
6. In **Storage**, create a new bucket called `products` (public)
7. In **Settings → API**, copy:
   - `Project URL` → SUPABASE_URL
   - `anon public key` → SUPABASE_ANON_KEY

---

## **STEP 3: Deploy Backend to Railway**

### Option A: Railway (Recommended - Easiest)

1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Authorize Railway to access your GitHub
5. Select your `expiry-go` repository
6. Add these environment variables (in Railway Dashboard):
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
   SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   JWT_SECRET_KEY=SUPER_SECRET_KEY_FOR_FRESHSAVE_CHANGE_ME
   ACCESS_TOKEN_EXPIRE_DAYS=7
   ```
7. Set Python version: 3.11
8. Click "Deploy"
9. Get your backend URL from Railway dashboard (e.g., `https://yourapp-prod.up.railway.app`)

### Option B: Render (Alternative)

1. Go to: https://render.com
2. Sign up with GitHub
3. "New +" → "Web Service"
4. Connect to your GitHub repo
5. Build command: `pip install -r backend/requirements.txt`
6. Start command: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add same environment variables as Railway
8. Deploy
9. Get your backend URL (e.g., `https://expiry-go-backend.onrender.com`)

---

## **🔑 Environment Variables Reference**

Here is a breakdown of the key external integrations used by the backend and why they are needed:

### 1. Supabase (Storage/Database)
* **Why it's needed:** Supabase provides PostgreSQL for your production database, but more importantly, it is used for file storage (saving images of scanned products).
* **Keys Used:** 
  * `SUPABASE_URL`
  * `SUPABASE_ANON_KEY`

### 2. OpenAI (Vision AI)
* **Why it's needed:** Used to process images (like scanning expiration dates and reading labels from uploaded packages).
* **Key Used:** 
  * `OPENAI_API_KEY`

### 3. Google Gemini (AI Optimization)
* **Why it's needed:** Your backend uses Gemini AI to optimize product details, categorize items, or generate better descriptions.
* **Key Used:** 
  * `GEMINI_API_KEY`

### 4. Fast2SMS (SMS Service)
* **Why it's needed:** This is an Indian SMS gateway used to dispatch OTPs (One Time Passwords) to users' mobile phones for login or verification.
* **Key Used:** 
  * `FAST2SMS_API_KEY`

### 5. SMTP Provider (e.g., Gmail)
* **Why it's needed:** Allows your application to send outbound email notifications (like "Your product is expiring soon!").
* **Keys Used:** 
  * `SMTP_HOST`
  * `SMTP_PORT`
  * `SMTP_USER`
  * `SMTP_PASSWORD`

### 6. Redis (Local or Cloud Cache)
* **Why it's needed:** Redis is used for fast caching (e.g., storing active OTPs temporarily, caching frequent database queries, or WebSocket pub/sub).
* **Key Used:** 
  * `REDIS_URL=redis://localhost:6379` (Requires a Redis server running on your machine/production cloud)

---


## **STEP 4: Deploy Frontend to Vercel**

1. Go to: https://vercel.com
2. Sign up with GitHub
3. Click "Import Project" → Select your `expiry-go` repo
4. Select "Next.js" as framework
5. Set Root Directory: `frontend`
6. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=[YOUR_BACKEND_URL]
   Example: https://yourapp-prod.up.railway.app
   ```
7. Click "Deploy"
8. Wait ~2-3 minutes
9. Get your frontend URL (e.g., `https://expiry-go.vercel.app`)

---

## **STEP 5: Test the Complete Flow**

Your app is now LIVE! 

### Demo Flow:

**Option 1: Shop Owner Creates Product**
1. Go to your frontend URL
2. Click "Sign Up" → Select "Shopkeeper"
3. Create account with: `shop1@test.com / password123`
4. Go to "Shop" → "Products" → "Add Product"
5. Upload a product (with image)
6. ✅ Product appears in Deals with automatic discount

**Option 2: Customer Buys Product**
1. Sign out
2. Sign up as "Customer"
3. Go to "Deals" page
4. See all products from all shops
5. Click a product → "Reserve"
6. Complete "Checkout"
7. ✅ Product reserved, pickup code shown

---

## **STEP 6: Share Your Demo URL** 🎉

- **Frontend:** `https://your-app.vercel.app`
- **Backend API:** `https://your-api.railway.app`
- **API Docs:** `https://your-api.railway.app/docs`

---

## **Test Credentials**

```
Shop Owners:
  shop1@test.com / password123
  shop2@test.com / password123
  shop3@test.com / password123

Customer:
  customer@test.com / password123
```

All shops have pre-loaded products with discounts!

---

## **Troubleshooting**

### Backend won't start
- Check DATABASE_URL is correct
- Check all env vars are set
- SSH into container and run: `python -m uvicorn backend.main:app`

### Frontend shows "Failed to fetch"
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check backend is running
- Check CORS is enabled on backend

### Images not uploading
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check Supabase Storage bucket `products` is public

---

## **Cost Breakdown**

- Vercel: **FREE** (for hobby tier)
- Railway: **FREE** first 5GB/month, then $5/month
- Supabase: **FREE** (1GB storage, 500MB database)
- **Total:** ~$5-10/month for production

---

**❓ Need help?** Check Railway docs: https://railway.app/docs

Happy deploying! 🚀
