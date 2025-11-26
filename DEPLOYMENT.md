# EzBooks Deployment Guide

Step-by-step guide to deploy EzBooks to production.

## Pre-Deployment Checklist

- [x] JWT signature verification enabled
- [x] Environment variable validation added
- [ ] All environment variables configured
- [ ] DynamoDB tables created
- [ ] S3 bucket created and configured
- [ ] Supabase project configured
- [ ] Domain name ready (optional)

## AWS Setup

### 1. Create DynamoDB Tables

Run these scripts from the `backend/` directory:

```bash
cd backend
source venv/bin/activate
python create_table.py
python create_users_table.py
```

This creates the following tables:
- `EzBooks-Users`
- `EzBooks-Receipts`
- `EzBooks-Vendors`
- `EzBooks-Cards`
- `EzBooks-Jobs`
- `EzBooks-Categories`

### 2. Enable Point-in-Time Recovery

For each table in AWS Console:
1. Go to DynamoDB → Tables → [Table Name]
2. Click "Backups" tab
3. Enable "Point-in-time recovery"

### 3. Create S3 Bucket

```bash
aws s3 mb s3://ezbooks-receipts-prod --region ca-central-1
```

Configure CORS for the bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["https://yourdomain.com"],
        "ExposeHeaders": []
    }
]
```

### 4. Create IAM User

Create an IAM user with these permissions:
- `AmazonDynamoDBFullAccess`
- `AmazonS3FullAccess`
- `AmazonTextractFullAccess`

Save the Access Key ID and Secret Access Key.

## Supabase Setup

### 1. Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for project to be ready

### 2. Configure Authentication

1. Go to Authentication → Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Enable Google OAuth:
   - Go to Authentication → Providers
   - Enable Google
   - Add OAuth credentials from Google Cloud Console
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `https://yourdomain.com/auth/callback`

### 3. Get Credentials

From Settings → API:
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`
- Copy **JWT Secret** → `SUPABASE_JWT_SECRET`

## Backend Deployment

### Option 1: Render.com (Recommended for MVP)

1. **Create account** at https://render.com

2. **Create Web Service**
   - Connect your GitHub repository
   - Select `backend` directory as root
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `./start-prod.sh`

3. **Set Environment Variables**
   - Add all variables from `.env.example`
   - Set `ALLOWED_ORIGINS` to your frontend URL

4. **Deploy**
   - Render will auto-deploy on push to main branch

### Option 2: AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Open ports 80, 443, 8000

2. **SSH into instance and setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3 python3-pip python3-venv -y

# Clone repository
git clone https://github.com/yourusername/ezbooks.git
cd ezbooks/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
# Paste your environment variables

# Test the app
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. **Setup systemd service**

Create `/etc/systemd/system/ezbooks.service`:

```ini
[Unit]
Description=EzBooks Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/ezbooks/backend
Environment="PATH=/home/ubuntu/ezbooks/backend/venv/bin"
ExecStart=/home/ubuntu/ezbooks/backend/start-prod.sh

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ezbooks
sudo systemctl start ezbooks
sudo systemctl status ezbooks
```

4. **Setup Nginx reverse proxy**

```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/ezbooks`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/ezbooks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Setup SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Create Procfile** in `backend/`:
   ```
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
   ```
3. **Deploy**:
   ```bash
   heroku create ezbooks-api
   heroku config:set AWS_REGION=ca-central-1
   # ... set all other env vars
   git push heroku main
   ```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Configure environment variables**
   Create `frontend/.env.production`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

3. **Deploy**
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Configure custom domain** (optional)
   - Go to Vercel dashboard
   - Add custom domain
   - Update DNS records

### Option 2: Netlify

1. **Build the app**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy via Netlify CLI**
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

3. **Or use Netlify UI**
   - Drag and drop `dist/` folder
   - Configure environment variables in Netlify dashboard

### Option 3: AWS S3 + CloudFront

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Create S3 bucket**
   ```bash
   aws s3 mb s3://ezbooks-frontend-prod
   aws s3 website s3://ezbooks-frontend-prod --index-document index.html
   ```

3. **Upload files**
   ```bash
   aws s3 sync dist/ s3://ezbooks-frontend-prod --delete
   ```

4. **Create CloudFront distribution**
   - Origin: S3 bucket
   - Default root object: `index.html`
   - Error pages: 404 → /index.html (for SPA routing)

## Post-Deployment

### 1. Test All Endpoints

```bash
# Health check
curl https://api.yourdomain.com/health

# Should return: {"status":"healthy"}
```

### 2. Test Authentication Flow

1. Visit your frontend URL
2. Sign up with email
3. Check email for verification
4. Log in
5. Upload a test receipt
6. Verify OCR extraction

### 3. Setup Monitoring

**Sentry** (recommended):
```bash
pip install sentry-sdk[fastapi]
```

Add to `backend/app/main.py`:
```python
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0,
)
```

**AWS CloudWatch**:
- Enable CloudWatch Logs for your deployment
- Set up alarms for error rates
- Monitor DynamoDB and S3 usage

### 4. Setup Backups

- DynamoDB: Point-in-time recovery (already enabled)
- S3: Enable versioning and lifecycle policies
- Database exports: Schedule weekly exports to S3

### 5. Cost Monitoring

Set up AWS billing alerts:
1. Go to AWS Billing Dashboard
2. Create budget alert
3. Set threshold (e.g., $50/month)
4. Add email notification

## Troubleshooting

### Backend won't start

Check environment variables:
```bash
python -c "from app.core import config"
```

If this fails, you're missing required env vars.

### JWT validation errors

Verify Supabase JWT secret:
1. Go to Supabase → Settings → API
2. Copy JWT Secret
3. Update `SUPABASE_JWT_SECRET` in backend

### OCR not working

Check AWS credentials:
```bash
aws sts get-caller-identity
```

Verify Textract permissions in IAM.

### CORS errors

Update `ALLOWED_ORIGINS` in backend `.env`:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Scaling Considerations

### When to scale:

- **100+ users**: Upgrade to t3.medium EC2 or Render Pro
- **1000+ receipts/day**: Add DynamoDB auto-scaling
- **High OCR volume**: Consider batch processing with SQS
- **Global users**: Add CloudFront CDN for frontend

### Performance optimizations:

1. **Enable DynamoDB caching** with DAX
2. **Add Redis** for session storage
3. **Use S3 Transfer Acceleration** for uploads
4. **Implement CDN** for receipt images
5. **Add database indexes** for common queries

## Security Checklist

- [x] JWT signature verification enabled
- [ ] HTTPS enabled (SSL/TLS)
- [ ] Environment variables secured
- [ ] S3 bucket not publicly accessible
- [ ] DynamoDB tables have proper IAM policies
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers added (Nginx/CloudFront)
- [ ] Regular dependency updates scheduled

## Maintenance

### Weekly:
- Check error logs
- Review usage metrics
- Monitor costs

### Monthly:
- Update dependencies
- Review and optimize DynamoDB usage
- Check S3 storage costs
- Review user feedback

### Quarterly:
- Security audit
- Performance optimization
- Feature planning

---

**Congratulations!** Your EzBooks application is now in production. 🎉

For support, check the main README or open an issue on GitHub.
