# Nayakar Pure E-Commerce

Full-stack e-commerce website for **Nayakar Pure** — 100% Natural Peanut Butter.

## Features

- Home, Shop, About, Contact pages with brand-matched design
- User authentication with JWT
- Product catalog with search and filters
- Shopping cart
- Checkout with delivery partner and payment options
- Order history

## Getting Started

Requires [MongoDB](https://www.mongodb.com/) running locally (or set `MONGODB_URI` in `server/.env`).

```bash
# Terminal 1 — API (from project root)
cd server && npm install && npm run dev

# Terminal 2 — Website (from project root, not inside server/)
cd client && npm install && npm run dev
```

Website: http://localhost:5173 (run the client — this is the store UI)  
API: http://localhost:5000 (backend only; `/` redirects to the website)
