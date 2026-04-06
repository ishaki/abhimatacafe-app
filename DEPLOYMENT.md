# AbhimataCafe — Deployment Guide (Railway)

> **Target**: Deploy AbhimataCafe POS to the internet via Railway
> **Scale**: 5 admin users, 5 concurrent customers, ~30 users/day
> **Estimated Cost**: ~$2-5/month
> **Status**: All code changes in Section 2 and Section 4 (CRITICAL + HIGH) have been implemented.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Deployment Code Changes](#2-pre-deployment-code-changes)
3. [Railway Deployment Steps](#3-railway-deployment-steps)
4. [Security Hardening Checklist](#4-security-hardening-checklist)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Maintenance & Monitoring](#6-maintenance--monitoring)

---

## 1. Architecture Overview

### Current Stack
| Component | Technology | Deployment Strategy |
|-----------|-----------|-------------------|
| Frontend | React 18 + Vite + Tailwind CSS | Build to static files, served by Flask |
| Backend | Flask + Flask-SocketIO + Eventlet | Single Railway service with Gunicorn |
| Database | SQLite | Persistent Railway Volume |
| Real-time | Socket.IO (WebSocket) | Supported natively on Railway |

### Production Architecture

```
Internet → Railway (HTTPS) → Gunicorn + Eventlet
                                  ├── Flask API (/api/*)
                                  ├── Flask-SocketIO (WebSocket)
                                  ├── Static Files (React build)
                                  └── SQLite (Railway Volume)
```

Single service deployment — Flask serves both the API and the built frontend static files.

---

## 2. Pre-Deployment Code Changes

### 2.1 Add Production Dependencies

**File: `backend/requirements.txt`** — Add:
```
gunicorn==21.2.0
```

### 2.2 Create Procfile

**File: `Procfile`** (project root)
```
web: cd backend && gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```

> **Important**: Use only 1 worker (`-w 1`) — SQLite does not handle concurrent writes well, and Socket.IO requires sticky sessions.

### 2.3 Create `railway.toml`

**File: `railway.toml`** (project root)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd frontend && npm install && npm run build && cp -r dist ../backend/static_frontend && cd ../backend && pip install -r requirements.txt && gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### 2.4 Update Backend — Production Config

**File: `backend/app.py`** — Changes required:

#### a) Remove debug mode, add health check
```python
import os
from pathlib import Path

def create_app():
    app = Flask(__name__,
                static_folder='static_frontend',
                static_url_path='')

    # Configuration
    environment = os.environ.get('FLASK_ENV', 'production')

    # CRITICAL: Enforce secret keys in production
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

    if environment == 'production':
        if not app.config['SECRET_KEY'] or not app.config['JWT_SECRET_KEY']:
            raise RuntimeError("SECRET_KEY and JWT_SECRET_KEY must be set in production!")
    else:
        app.config['SECRET_KEY'] = app.config['SECRET_KEY'] or 'fallback-dev-key'
        app.config['JWT_SECRET_KEY'] = app.config['JWT_SECRET_KEY'] or 'fallback-jwt-key'

    # Database — use volume path in production
    db_path = os.environ.get('DATABASE_PATH', 'abhimata_cafe.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)

    # ... (rest of initialization)
```

#### b) Update CORS for production
```python
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

    CORS(app,
         origins=allowed_origins,
         methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=True,
         max_age=3600)
```

#### c) Remove the manual preflight handler
Delete the entire `handle_preflight()` function — Flask-CORS already handles this. The manual handler echoes back any Origin header, which is a security risk.

#### d) Add health check endpoint
```python
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy'}), 200
```

#### e) Serve frontend from Flask
```python
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        return app.send_static_file('index.html')
```

#### f) Fix production entry point
```python
app, socketio = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_ENV') != 'production'
    socketio.run(app, host='0.0.0.0', port=5000, debug=debug)
```

### 2.5 Fix WebSocket CORS

**File: `backend/socketio_instance.py`**
```python
import os

def init_socketio(app):
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    socketio = SocketIO(app, cors_allowed_origins=allowed_origins, async_mode='eventlet')
    return socketio
```

### 2.6 Update Frontend — Environment-Based API URL

**File: `frontend/src/services/api.js`**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});
```

**File: `frontend/src/services/websocket.js`**
```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Use relative URL in production (same origin)
const socket = io(SOCKET_URL, { ... });
```

**File: `frontend/src/contexts/AuthContext.jsx`**
Replace all hardcoded `http://localhost:5000/api` with the `api` service import.

### 2.7 Update Frontend Build Config

**File: `frontend/vite.config.js`**
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Don't expose source maps in production
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
});
```

### 2.8 Remove Default Credentials from Login Page

**File: `frontend/src/pages/Login.jsx`**
Remove the section that displays `admin / admin123` on the login page.

---

## 3. Railway Deployment Steps

### 3.1 Prerequisites
- GitHub account with the repo: `https://github.com/ishaki/abhimatacafe-app.git`
- Railway account (sign up at https://railway.app)

### 3.2 Create Railway Project

1. Go to https://railway.app/new
2. Select **"Deploy from GitHub Repo"**
3. Connect your GitHub account and select `ishaki/abhimatacafe-app`
4. Railway will auto-detect the project

### 3.3 Add Persistent Volume (for SQLite)

1. In your Railway service, go to **Settings → Volumes**
2. Click **"Add Volume"**
3. Set mount path: `/data`
4. This ensures your SQLite database survives redeploys

### 3.4 Set Environment Variables

In Railway dashboard → **Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `SECRET_KEY` | *(generate: `python -c "import secrets; print(secrets.token_hex(32))"`)* | Flask session key |
| `JWT_SECRET_KEY` | *(generate another one)* | JWT signing key |
| `FLASK_ENV` | `production` | Disables debug mode |
| `DATABASE_PATH` | `/data/abhimata_cafe.db` | Points to persistent volume |
| `ALLOWED_ORIGINS` | `https://your-app.up.railway.app` | Your Railway domain |
| `PORT` | `5000` | Railway sets this automatically |

### 3.5 Configure Custom Domain (Optional)

1. Go to **Settings → Networking → Custom Domain**
2. Add your domain (e.g., `pos.abhimatacafe.com`)
3. Add the CNAME record to your DNS provider
4. Railway provides free SSL automatically
5. Update `ALLOWED_ORIGINS` to include your custom domain

### 3.6 Deploy

Railway auto-deploys on every push to `main`. You can also trigger manual deploys from the dashboard.

### 3.7 Initialize Database

After first deploy, open the Railway shell (Settings → Shell) and run:
```bash
cd backend && python init_db.py
```

**Important:** After initializing, immediately change the default admin password through the app.

---

## 4. Security Hardening Checklist

### CRITICAL — Must Fix Before Going Live

| # | Issue | What to Do | File(s) |
|---|-------|-----------|---------|
| 1 | Debug mode in production | Use `FLASK_ENV` to control debug flag | `backend/app.py` |
| 2 | Hardcoded fallback secrets | Crash on startup if secrets not set in production | `backend/app.py` |
| 3 | WebSocket CORS wildcard `*` | Use `ALLOWED_ORIGINS` env var | `backend/socketio_instance.py` |
| 4 | Manual preflight echoes any Origin | Remove `handle_preflight()`, rely on Flask-CORS | `backend/app.py` |
| 5 | Hardcoded `localhost` API URLs | Use relative URLs / env vars | `frontend/src/services/api.js`, `websocket.js`, `AuthContext.jsx` |
| 6 | Default credentials shown on login page | Remove the credentials display | `frontend/src/pages/Login.jsx` |

### HIGH — Fix Before Production Use

| # | Issue | What to Do | File(s) |
|---|-------|-----------|---------|
| 7 | Weak password policy (length only) | Require uppercase, lowercase, number, min 8 chars | `backend/routes/auth.py` |
| 8 | No account lockout | Lock account after 5 failed attempts for 15 minutes | `backend/routes/auth.py` |
| 9 | No password change feature | Add `/api/auth/change-password` endpoint | `backend/routes/auth.py` |
| 10 | Missing authorization on GET endpoints | Verify user role before returning data | `backend/routes/orders.py`, etc. |
| 11 | No server-side price validation | Recalculate total from DB prices, ignore client total | `backend/routes/orders.py` |
| 12 | JWT token in sessionStorage | Move to httpOnly cookie (prevents XSS token theft) | `backend/app.py`, `frontend/src/contexts/AuthContext.jsx` |

### MEDIUM — Improve for Robustness

| # | Issue | What to Do | File(s) |
|---|-------|-----------|---------|
| 13 | Weak input sanitization | Use `markupsafe.escape()` or `bleach` library | `backend/utils/validators.py` |
| 14 | Error details leaked to client | Return generic messages, log details server-side | `backend/routes/settings.py` |
| 15 | Incomplete audit logging | Log all auth events (login, failed login, password change) | `backend/utils/audit.py` |
| 16 | No CSRF protection | Add CSRF tokens for state-changing requests | `backend/app.py` |
| 17 | Source maps in production build | Set `sourcemap: false` in Vite config | `frontend/vite.config.js` |
| 18 | No request Content-Type validation | Verify `Content-Type: application/json` on POST/PUT | `backend/app.py` |

### Security Headers (Already Partially Implemented)

The app already sets these headers in `app.py`. Verify they are correct for production:

```python
X-Content-Type-Options: nosniff          # Prevents MIME sniffing
X-Frame-Options: DENY                     # Prevents clickjacking
X-XSS-Protection: 1; mode=block          # Legacy XSS protection
Strict-Transport-Security: max-age=31536000; includeSubDomains  # Force HTTPS
Content-Security-Policy: default-src 'self'; ...  # CSP — review and tighten
```

**Update CSP for production** (adjust based on actual needs):
```python
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "  # Tailwind needs unsafe-inline
    "img-src 'self' data:; "
    "connect-src 'self' wss://your-domain.up.railway.app; "  # WebSocket
    "frame-ancestors 'none';"
)
```

---

## 5. Post-Deployment Verification

### 5.1 Smoke Test Checklist

After deploying, verify these work:

- [ ] App loads at `https://your-app.up.railway.app`
- [ ] Login with admin credentials works
- [ ] Change default admin password immediately
- [ ] Create a test order
- [ ] Kitchen display receives order in real-time (WebSocket)
- [ ] Billing/payment works
- [ ] Reports page loads data
- [ ] Refresh page on any route (SPA routing works)
- [ ] Open browser DevTools → Network: all requests go to HTTPS
- [ ] Open browser DevTools → Console: no errors

### 5.2 Security Verification

- [ ] Visit `http://` (non-HTTPS) → should redirect to `https://`
- [ ] Check response headers (DevTools → Network → any request → Headers):
  - `Strict-Transport-Security` present
  - `X-Content-Type-Options: nosniff` present
  - `X-Frame-Options: DENY` present
- [ ] Try accessing `/api/orders` without token → should return 401
- [ ] Try 6+ rapid login attempts → should be rate limited
- [ ] Check that login page does NOT show default credentials

---

## 6. Maintenance & Monitoring

### 6.1 Database Backups

SQLite on a Railway volume needs manual backup strategy:

**Option A: Scheduled Railway Cron**
- Create a second Railway service that runs daily
- Copies `/data/abhimata_cafe.db` to cloud storage (S3, Google Drive, etc.)

**Option B: Manual Export**
- Use Railway shell periodically:
  ```bash
  sqlite3 /data/abhimata_cafe.db .dump > /data/backup_$(date +%Y%m%d).sql
  ```

**Recommendation**: For a cafe POS handling real financial data, set up automated daily backups. Data loss = lost sales records.

### 6.2 Monitoring

Railway provides built-in:
- **Deploy logs** — check for startup errors
- **Runtime logs** — application logs (Flask logging)
- **Metrics** — CPU, memory, network usage

### 6.3 Updating the App

1. Push code changes to `main` branch on GitHub
2. Railway auto-deploys within ~2 minutes
3. Zero-downtime deploys (Railway spins up new instance before shutting old one)

**Warning**: Database migrations need care with SQLite. Before any model changes:
1. Back up the database
2. Write a migration script (like the existing `migrate_*.py` files)
3. Run migration via Railway shell after deploy

### 6.4 Scaling Considerations

If you outgrow this setup (unlikely at 30 users/day):

| Signal | Action |
|--------|--------|
| SQLite write contention | Migrate to PostgreSQL (Railway addon, ~$5/month) |
| Need multiple workers | Switch to PostgreSQL first (required for multi-worker) |
| 100+ concurrent WebSocket connections | Upgrade Railway plan, add Redis for Socket.IO |
| Need audit compliance | Add structured logging, ship to external service |

---

## Quick Reference — Environment Variables

```env
# Required in production
SECRET_KEY=<random-64-char-hex>
JWT_SECRET_KEY=<random-64-char-hex>
FLASK_ENV=production
DATABASE_PATH=/data/abhimata_cafe.db
ALLOWED_ORIGINS=https://your-app.up.railway.app

# Generate secrets with:
# python -c "import secrets; print(secrets.token_hex(32))"
```
