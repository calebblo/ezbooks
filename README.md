# ezbooks
Small business book keeping app

## Run locally
// run setup Backend env: copy `backend/.env.example` to `backend/.env` and fill AWS region/keys, DynamoDB table names, and S3 bucket.
// run setup Backend deps: `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
// run setup Backend server: from `backend`, `uvicorn app.main:app --reload --port 8000`.
// run setup Frontend env: copy `frontend/.env.local.example` to `frontend/.env.local` (tweak API URLs if needed).
// run setup Frontend deps/server: `cd frontend && npm install && npm run dev` (opens on http://localhost:5173, proxies `/api` to backend).
