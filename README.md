## Installation

1. Clone the project.

```bash
git clone https://github.com/atharvasalunke/period_cycle_planner.git
```

2. Go to project directory.
```bash
cd period_cycle_planner
```

3. Install the dependencies.
```bash
npm install
```

4. Run the project
```bash
npm run dev
```

## Setup PostgreSQL
1. Start Docker Desktop.
2. Run the following
```bash
docker run --name cycle-postgres \
  -e POSTGRES_USER=cycle \
  -e POSTGRES_PASSWORD=cyclepass \
  -e POSTGRES_DB=cycleplanner \
  -p 5432:5432 \
  -d postgres:16
```

## Backend Installation
1. Go to backend directory.
```bash
cd backend
```

2. Install the dependencies and create migrations.
```bash
npm install && npm run generate && npm run migrate
```

3. Run the project
```bash
npm run dev
```

## Backend Deployment (Vultr Compute + Managed Postgres)
### Prereqs
- A Vultr Managed PostgreSQL database (note the connection string).
- A Vultr Compute instance with Docker installed.
- A domain/subdomain for the API (e.g. `api.example.com`).

### 1) Create backend env file
Create `backend/.env` on the server:
```bash
PORT=4000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
CORS_ORIGIN="https://your-frontend-domain"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="https://api.example.com/auth/google/callback"
GOOGLE_SCOPES="https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/calendar.readonly"
```

### 2) Run with Docker Compose
```bash
cd backend
docker compose up -d --build
```

### 3) Run Prisma migrations
```bash
docker compose exec api npm run prisma -- migrate deploy
```

### 4) Enable HTTPS (Let's Encrypt)
1. Edit `backend/nginx.ssl.conf` and replace `api.example.com` with your domain.
2. Generate certificates (webroot):
```bash
mkdir -p certbot/www certbot/conf
docker compose run --rm certbot \
  certonly --webroot \
  --webroot-path /var/www/certbot \
  -d api.example.com
```
3. Switch Nginx to SSL config:
```bash
cp nginx.ssl.conf nginx.conf
docker compose restart nginx
```

Note: Add a cron job to renew certificates:
```bash
docker compose run --rm certbot renew && docker compose restart nginx
```
