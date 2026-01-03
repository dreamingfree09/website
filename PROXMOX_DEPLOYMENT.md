# Proxmox Deployment Guide (From Scratch)

This guide explains how to deploy **Piqniq** from scratch on a **Proxmox VE** host.

It’s written for a typical home-lab / VPS-style Proxmox setup and aims to be:
- Repeatable
- Secure-by-default
- Operationally practical (updates, backups, logs)

## What you will deploy

- **App**: Node.js + Express (`app.js`)
- **DB**: MongoDB
- **Reverse proxy** (recommended): Nginx (for TLS and nice domain routing)

You have two main deployment styles:

1) **Docker Compose inside a Proxmox VM** (recommended)
- Easiest to maintain and matches the repo’s `Dockerfile` + `docker-compose.yml`.

2) **Native install inside a Proxmox VM** (systemd + Node + Mongo)
- More “bare metal” control, fewer moving parts.

Both are described below.

---

## 0) Prerequisites

- Proxmox VE installed and reachable via web UI
- A DNS record pointing to your public IP (if exposing to the Internet)
  - Example: `community.example.com -> <your WAN IP>`
- Basic network knowledge (NAT/port forward if needed)

### Recommended OS for the VM
- Ubuntu Server 22.04 LTS or 24.04 LTS
- Debian 12 also works

### Ports
- If using Nginx + TLS:
  - 80/tcp (Let’s Encrypt HTTP challenge)
  - 443/tcp (HTTPS)

---

## 1) Create a VM in Proxmox

In the Proxmox UI:

1. **Create VM**
2. **OS**: attach Ubuntu/Debian ISO
3. **System**:
   - OVMF/UEFI is fine; BIOS is fine too
4. **CPU**:
   - Start with 2 cores
5. **Memory**:
   - Start with 2–4 GB RAM
6. **Disk**:
   - Start with 20–40 GB
   - Use SSD-backed storage if available
7. **Network**:
   - VirtIO (paravirtualized)

Install the OS, enable SSH, and update packages:

```bash
sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get -y install ca-certificates curl git
```

---

## 2) Choose deployment method

### Option A (recommended): Docker Compose (inside the VM)

This uses the repo’s existing:
- `Dockerfile`
- `docker-compose.yml`

#### A1) Install Docker

Ubuntu/Debian (recommended official install):

```bash
# Ubuntu/Debian prerequisites
sudo apt-get update
sudo apt-get -y install ca-certificates curl gnupg

# Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Docker repo (Ubuntu example)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Optional: run docker without sudo (log out/in after)
sudo usermod -aG docker $USER
```

Verify:

```bash
docker version
docker compose version
```

#### A2) Clone the repo

```bash
sudo mkdir -p /opt/piqniq
sudo chown -R $USER:$USER /opt/piqniq

cd /opt/piqniq
git clone <YOUR_REPO_URL> .
```

#### A3) Create `.env`

Create `/opt/piqniq/.env`:

```env
# Required
SESSION_SECRET=<generate-a-long-random-secret>

# Docker Compose MongoDB credentials (used by docker-compose.yml)
MONGO_USERNAME=admin
MONGO_PASSWORD=<replace-me>

# Recommended for production
NODE_ENV=production
BASE_URL=https://community.example.com
ALLOWED_ORIGINS=https://community.example.com

# Optional
IMAGE_OPTIMIZATION=true
NEWS_CACHE_TTL_MS=600000
NEWS_FETCH_TIMEOUT_MS=7000
NEWS_MAX_BYTES=750000

# Logging
LOG_MAX_BYTES=10485760

# Privacy-minded hashing salt (used to pseudonymize some telemetry)
PII_HASH_SALT=<another-random-secret>
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### A4) Start containers

```bash
cd /opt/piqniq

# Build and start
docker compose up -d --build

# Check health
docker compose ps
curl -fsS http://localhost:3000/api/system/health
```

Notes:
- MongoDB data persists in the Docker volume `mongodb_data`.
- Logs persist in `/opt/piqniq/logs` (mounted into the container).
- By default the database is **not published** on the host (no public `27017`). If you need to inspect it, use:

```bash
docker compose exec mongodb mongosh -u "$MONGO_USERNAME" -p "$MONGO_PASSWORD" --authenticationDatabase admin
```

#### A5) Put Nginx in front (recommended)

You can either:
- run Nginx on the VM (outside Docker), or
- add the optional nginx service in `docker-compose.yml`.

VM-level Nginx is often simpler.

Install:

```bash
sudo apt-get -y install nginx
```

Create a site config (example: `/etc/nginx/sites-available/piqniq`):

```nginx
server {
  listen 80;
  server_name community.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable it:

```bash
sudo ln -sf /etc/nginx/sites-available/piqniq /etc/nginx/sites-enabled/piqniq
sudo nginx -t
sudo systemctl reload nginx
```

#### A6) Enable TLS (Let’s Encrypt)

```bash
sudo apt-get -y install certbot python3-certbot-nginx
sudo certbot --nginx -d community.example.com
```

Then confirm:
- `BASE_URL` is `https://...`
- `ALLOWED_ORIGINS` includes your https origin

---

### Option B: Native install (systemd + Node + Mongo)

This runs MongoDB and Node directly on the VM.

#### B1) Install MongoDB

In production you typically want a pinned MongoDB version from the official repo.
If you’re in a lab environment, you can use Ubuntu packages, but official Mongo is recommended.

After installing, ensure Mongo is running:

```bash
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod --no-pager
```

#### B2) Install Node.js 18

Use NodeSource or nvm. Example NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get -y install nodejs
node --version
npm --version
```

#### B3) Create app user and deploy

```bash
sudo useradd -m -s /bin/bash piqniq
sudo mkdir -p /opt/piqniq
sudo chown -R piqniq:piqniq /opt/piqniq

sudo -u piqniq bash -lc "cd /opt/piqniq && git clone <YOUR_REPO_URL> ."
```

#### B4) Configure environment

Create `/opt/piqniq/.env` (owned by `piqniq`):

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/piqniq
SESSION_SECRET=<long-random-secret>
BASE_URL=https://community.example.com
ALLOWED_ORIGINS=https://community.example.com
```

Important:
- This repo uses `patch-package` in `postinstall` to apply a patch (see `patches/`).
  Do not disable install scripts unless you understand the implications.

Install dependencies:

```bash
sudo -u piqniq bash -lc "cd /opt/piqniq && npm ci"
```

#### B5) systemd service

Create `/etc/systemd/system/piqniq.service`:

```ini
[Unit]
Description=Piqniq web app
After=network.target mongod.service

[Service]
Type=simple
User=piqniq
WorkingDirectory=/opt/piqniq
EnvironmentFile=/opt/piqniq/.env
ExecStart=/usr/bin/node /opt/piqniq/app.js
Restart=always
RestartSec=3

# Hardening (reasonable defaults)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Enable/start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable piqniq
sudo systemctl start piqniq
sudo systemctl status piqniq --no-pager
curl -fsS http://127.0.0.1:3000/api/system/health
```

Then add Nginx + TLS exactly like in Option A.

---

## 3) First-time platform bootstrap

### Create the owner/superadmin account

Auto “first user becomes superadmin” is disabled by default.

On the VM:

```bash
cd /opt/piqniq
npm run admin:bootstrap
```

This seeds system roles and promotes/creates the owner account safely.

### Seed curated content (recommended)

```bash
cd /opt/piqniq
npm run seed:curated
```

---

## 4) Backups (Proxmox + app data)

### Proxmox VM backups

- Configure scheduled backups in Proxmox (preferred baseline).

### MongoDB data

- Docker: ensure the `mongodb_data` volume is included in backups.
- Native: back up MongoDB with `mongodump` or filesystem snapshots.

Example (native):

```bash
mongodump --uri="mongodb://127.0.0.1:27017/piqniq" --out /var/backups/piqniq-mongodump
```

### Logs / uploads

- Logs: `logs/`
- Public uploads (avatars, post images, resource PDFs): `public/uploads/`
- Private uploads (documents, chat uploads): `uploads/`
- Images: `public/Images/`

Back these up if you care about persistent user-uploaded files.

---

## 5) Operations

### Update the app

Docker:

```bash
cd /opt/piqniq
git pull
docker compose up -d --build
```

Native:

```bash
cd /opt/piqniq
git pull
npm ci
sudo systemctl restart piqniq
```

### Health check

```bash
curl -fsS https://community.example.com/api/system/health
```

### MongoDB admin access (mongosh / MongoDB Compass)

By default (recommended), the Docker setup does **not** publish MongoDB on host port 27017.
You have three safe options when you need to inspect/admin the database.

#### Option 1: Use `mongosh` inside the Mongo container (recommended)

```bash
cd /opt/piqniq
docker compose exec mongodb mongosh -u "$MONGO_USERNAME" -p "$MONGO_PASSWORD" --authenticationDatabase admin
```

This avoids exposing MongoDB to the network entirely.

#### Option 2: SSH tunnel to MongoDB (good for MongoDB Compass)

1) Temporarily bind MongoDB on **localhost only** on the VM by adding this to the `mongodb` service in `docker-compose.yml`:

```yaml
ports:
  - "127.0.0.1:27017:27017"
```

2) Apply the change:

```bash
cd /opt/piqniq
docker compose up -d
```

3) From your laptop/workstation, open a tunnel:

```bash
ssh -L 27017:127.0.0.1:27017 <vm-user>@<vm-ip>
```

4) In MongoDB Compass, connect to:

```text
mongodb://<MONGO_USERNAME>:<MONGO_PASSWORD>@localhost:27017/piqniq?authSource=admin
```

When you’re done:
- Remove the localhost-only `ports:` mapping and run `docker compose up -d` again.

#### Option 3: Temporary host port publish (not recommended)

Only use this if you fully understand firewalling and never expose MongoDB to the public Internet.
If you must publish a port, prefer binding to `127.0.0.1` (localhost-only) as shown above.

### Troubleshooting

- Nginx errors: `sudo journalctl -u nginx -n 200 --no-pager`
- systemd app logs: `sudo journalctl -u piqniq -n 200 --no-pager`
- Docker logs: `docker compose logs -f --tail=200`

---

## 6) Security notes (production)

- Set a strong `SESSION_SECRET` (sessions become invalid if it changes).
- Set `BASE_URL=https://...` so cookies and generated links behave correctly.
- Set `ALLOWED_ORIGINS` to your domain (never `*` with credentials).
- Keep invite tokens private (personal portfolios are invite-only).
- Keep MongoDB private (bind to localhost or Docker network; don’t expose 27017 publicly).
