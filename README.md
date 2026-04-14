# India Geo SaaS API Platform

A production-grade B2B SaaS platform providing REST API access to India's complete village-level geographical data.

## What it does
- Serves 619,225 villages across 30 states via REST API
- Powers address form dropdowns and autocomplete for B2B clients
- Manages API keys, rate limiting, and billing tiers

## Live URLs
https://india-geo-saas-obt4.vercel.app


## API Quick Start
```bash
# Get all states
curl https://your-api.vercel.app/api/v1/geo/states \
  -H "X-API-Key: your_key"

# Search villages
curl "https://your-api.vercel.app/api/v1/search?q=manibeli" \
  -H "X-API-Key: your_key"

# Autocomplete
curl "https://your-api.vercel.app/api/v1/autocomplete?q=man" \
  -H "X-API-Key: your_key"
```

## Tech Stack
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL (NeonDB)
- Cache: Redis (Upstash)
- Frontend: React + Vite + Recharts
- Deployment: Vercel

## Subscription Tiers
| Plan | Daily Requests | Price |
|------|---------------|-------|
| Free | 5,000 | ₹0 |
| Premium | 50,000 | ₹999/mo |
| Pro | 300,000 | ₹4,999/mo |
| Unlimited | 1,000,000 | Custom |

