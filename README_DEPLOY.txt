HospAI Dental Clinic Management System — Cloud Deployment Guide
================================================================

1. PREREQUISITES
   - Docker & Docker Compose (Docker v24+ / Compose v2+)

2. QUICK START (1 COMMAND — NO EXTRA SETUP REQUIRED)
   Unzip this folder, open a terminal inside the unzipped folder, and run:

     docker compose up -d --build

   Wait ~1-2 minutes for the build & database initialization to complete.
   Verify all 3 containers are healthy:

     docker ps

   Containers:
   - clinic_postgres  (PostgreSQL 16)
   - clinic_backend   (Node 20 API + Socket.IO + Prisma)
   - clinic_frontend  (Nginx + React UI on port 8080, max upload 25MB)

3. ACCESS & INITIAL LOGIN
   - URL: http://<SERVER-IP>:8080  (or map your HTTPS domain to port 8080)
   - Default Admin Login (clean database, zero demo data):
       Username: admin
       Password: admin123
   - IMPORTANT: Change the admin password after first login.

4. OPTIONAL PRODUCTION ENVIRONMENT OVERRIDES (.env)
   By default, docker-compose.yml works out of the box without a .env file.
   For production hardening, you may optionally create a .env file from .env.example
   to customize POSTGRES_PASSWORD, JWT_SECRET, FRONTEND_PORT, or CORS_ORIGIN.

5. UPDATING LATER WITHOUT LOSING DATA
   Replace the source files (keeping the clinic_pgdata Docker volume intact) and run:

     docker compose up -d --build

   NEVER run "docker compose down -v" in production, as "-v" deletes the database volume.
