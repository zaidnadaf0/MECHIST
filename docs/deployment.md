# Deployment

## Env
- .env.local: VITE_FIREBASE_* (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId), VITE_GEOAPIFY_KEY (optional), VITE_ML_API_URL (default http://localhost:8000)
- All secrets gitignored (.env.local); .env.example documents keys.

## Frontend (free)
- Vite build: npm run build -> dist/
- Firebase Hosting: firebase deploy --only hosting (free Spark), or Vercel/Netlify static.
- No paid billing required.

## ML API (independent)
- Local: pip install fastapi uvicorn scikit-learn; uvicorn ml.api.main:app --port 8000
- Free deploy options: Render free, Railway, Fly.io free tier, or self-host; document ML_API_URL in frontend env.
- If no deploy, frontend falls back to baseline automatically.

## Backend
- Firestore + Auth + Storage already on Firebase free tier; rules deployed via firebase deploy --only firestore:rules storage.

## Build
- npm run typecheck && npm run build && npm test && npm --prefix functions run build

Never commit secrets; never enable paid Cloud Functions/Scheduler without approval.
