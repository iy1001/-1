# Trading Dashboard

Cryptocurrency K-line analysis dashboard with real-time data from Binance.

## Tech Stack

- **Frontend:** Vite + React, SVG candlestick chart with neon glow
- **Backend:** Express v5 + ccxt (Binance REST API proxy)
- **Real-time:** Binance WebSocket (direct, no proxy)
- **Deployment:** Vercel (auto-deploy via GitHub Actions)

## Quick Start

```bash
npm install
npm start
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express backend |
| `npm start` | Run both concurrently |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run test` | Vitest unit tests |

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```
PORT=3001
HTTPS_PROXY=http://127.0.0.1:7897
```

## CI/CD

- **CI** (every push/PR): ESLint → Prettier → Vitest → Vite build
- **CD** (push to main): Auto-deploy to Vercel
