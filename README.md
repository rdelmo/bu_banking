# Lion Kings Bank

A demo banking application built for JPMorgan. Includes a customer-facing web app and a bank management portal.

---

## What you need first

Install **Docker Desktop** — this is the only thing you need.

- Mac / Windows: https://www.docker.com/products/docker-desktop
- After installing, open Docker Desktop and wait for the whale icon to appear in your menu bar (it means Docker is ready)

---

## Starting the app

Open **Terminal** (Mac) or **Command Prompt** (Windows) and run these two commands:

```
git clone https://github.com/rdelmo/bu_banking.git
cd bu_banking
docker compose up -d
```

That's it. Wait about 30 seconds for everything to start.

---

## Opening the app

| What | Address |
|------|---------|
| 🏦 Banking app (customers) | http://localhost:3000 |
| ⚙️ Admin / Bank portal | http://localhost:3000 → log in as admin |

**Login details:**

| Role | Username | Password |
|------|----------|----------|
| Bank Admin (Greg) | `admin` | `admin123` |
| Demo Customer | `john_doe` | `password123` |

---

## Stopping the app

```
docker compose down
```

Your data is saved automatically — nothing is lost when you stop.

---

## Starting again next time

```
cd bu_banking
docker compose up -d
```

---

## Troubleshooting

**"Cannot connect" or blank page** — Docker Desktop may still be starting. Wait 30 seconds and refresh.

**App looks wrong after an update** — run this to rebuild:
```
docker compose up --build -d
```

**Start completely fresh** (wipes all data):
```
docker compose down -v
docker compose up -d
```

