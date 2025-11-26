# EzBooks - Small Business Bookkeeping App

AI-powered receipt management and bookkeeping application for small businesses.

## Features

- 📸 **Receipt Upload & OCR**: Automatic extraction of vendor, amount, date, and tax using AWS Textract
- 🏢 **Vendor Management**: Auto-matching and manual vendor organization
- 💼 **Job Tracking**: Organize receipts by projects/jobs
- 📊 **Export**: CSV and PDF export with filtering
- 🔐 **Secure Authentication**: Supabase-powered auth with email and Google OAuth
- 💳 **Payment Method Tracking**: Track cash and card payments
- 📧 **Email Notifications**: Alerts for pending receipts

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: AWS DynamoDB
- **Storage**: AWS S3
- **OCR**: AWS Textract + Google Gemini (fallback)
- **Authentication**: Supabase JWT

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Auth**: Supabase Client
- **Routing**: React Router v7

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- AWS Account with DynamoDB and S3
- Supabase Account

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Create DynamoDB tables**
   ```bash
   python create_table.py
   python create_users_table.py
   ```

6. **Run development server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:5173
   ```

## Production Deployment

### Backend

1. **Set all required environment variables** (see `.env.example`)

2. **Run production server**
   ```bash
   ./start-prod.sh
   ```
   
   Or manually:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

### Frontend

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy `dist/` folder** to:
   - Vercel
   - Netlify
   - Cloudflare Pages
   - AWS S3 + CloudFront
   - Any static hosting service

## Environment Variables

### Backend (.env)

```bash
# AWS Configuration (REQUIRED)
AWS_REGION=ca-central-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# S3 Configuration (REQUIRED)
S3_BUCKET_RECEIPTS=your-bucket-name
S3_REGION=ca-central-1

# DynamoDB Tables (REQUIRED)
DDB_TABLE_VENDORS=EzBooks-Vendors
DDB_TABLE_CARDS=EzBooks-Cards
DDB_TABLE_JOBS=EzBooks-Jobs
DDB_TABLE_RECEIPTS=EzBooks-Receipts
DDB_TABLE_CATEGORIES=EzBooks-Categories
DDB_TABLE_USERS=EzBooks-Users

# Supabase JWT Validation (REQUIRED)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# CORS (optional)
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Email Configuration (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Gemini API (optional)
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env)

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL (optional, defaults to /api)
VITE_API_BASE_URL=http://localhost:8000
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
ezbooks/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Configuration & auth
│   │   └── utils/        # Utility functions
│   ├── parser/           # OCR and receipt parsing
│   ├── requirements.txt
│   └── start-prod.sh     # Production startup script
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components
│   │   └── pages/        # Page components
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Usage Limits

- **Free Tier**: 20 receipts per month
- **Pro Tier**: Unlimited (coming soon)

## Support

For issues or questions, please open an issue on GitHub.

## License

See LICENSE file for details.
