# Mini ERP + CRM Operations Portal

A production-quality Mini ERP + CRM system for wholesale/distribution companies. Built with React, Node.js, Express, PostgreSQL, and JWT authentication.

## Project Overview

This portal supports four user roles — **Admin**, **Sales**, **Warehouse**, and **Accounts** — managing customers, products, inventory, and sales challans (delivery notes) in a single internal operations dashboard.

## Features

- **Authentication & Roles** — JWT login, bcrypt password hashing, role-based API authorization
- **Customer CRM** — CRUD, search, filters, pagination, follow-up notes
- **Product & Inventory** — Product management, stock IN/OUT, movement history, low-stock alerts
- **Sales Challans** — Draft creation, atomic confirmation with stock deduction, product snapshots
- **Dashboard** — Real-time stats from the database (customers, products, low stock, month revenue, inventory value, top customers, follow-ups due, recent activity)
- **Challan Printing** — Print-ready challan view / save as PDF from the challan detail page
- **CSV Export** — One-click export of customers, products, stock movements, and challans
- **Dark Mode** — Light/dark theme toggle persisted in the browser (follows system preference by default)
- **Responsive UI** — Collapsible sidebar drawer on mobile with role-aware navigation
- **API Documentation** — Swagger UI at `/api/docs`
- **Docker Support** — Full stack via Docker Compose
- **Backend Tests** — Authentication, authorization, CRM, inventory, and challan rollback tests

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Axios, React Router |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL 16 |
| Auth | JWT + bcryptjs |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + Supertest |

## Architecture

```
┌─────────────┐     REST/JSON      ┌─────────────┐     SQL      ┌────────────┐
│   React UI  │ ◄──────────────► │  Express API │ ◄──────────► │ PostgreSQL │
│  (Vite)     │    JWT Bearer    │  (TypeScript)│              │            │
└─────────────┘                  └─────────────┘              └────────────┘
```

**Backend layers:**
- `routes/` — HTTP endpoints + middleware wiring
- `controllers/` — Request/response handling
- `services/` — Business logic and database transactions
- `validators/` — Zod schemas for input validation
- `middleware/` — Auth, authorization, error handling

**Frontend layers:**
- `pages/` — Route-level views
- `components/` — Reusable UI (layout, modals, tables)
- `services/api.ts` — Centralized Axios client with JWT interceptors
- `hooks/useAuth.tsx` — Authentication state and role checks

## Folder Structure

```
mini-erp-crm/
├── backend/          # Express API (TypeScript)
├── frontend/         # React SPA (Vite)
├── database/         # schema.sql + seed.sql
├── postman/          # Postman collection
├── docker-compose.yml
└── README.md
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | System users with roles (ADMIN, SALES, WAREHOUSE, ACCOUNTS) |
| `customers` | CRM customer records |
| `customer_followups` | Follow-up notes linked to customers |
| `products` | Product catalog with stock levels |
| `stock_movements` | Audit trail for IN/OUT stock changes |
| `challans` | Sales delivery challans |
| `challan_items` | Line items with product snapshots |
| `challan_sequences` | Year-based challan number generator |

Key constraints:
- Unique emails (users), unique SKUs (products), unique challan numbers
- `current_stock >= 0` check on products
- `quantity > 0` on stock movements and challan items
- Foreign keys with appropriate indexes

## API Documentation

Interactive docs: **http://localhost:4000/api/docs**

### Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Current user | All authenticated |
| GET | `/api/customers` | List customers | Admin, Sales, Accounts |
| GET | `/api/customers/:id` | Get customer | Admin, Sales, Accounts |
| POST | `/api/customers` | Create customer | Admin, Sales |
| PUT | `/api/customers/:id` | Update customer | Admin, Sales |
| DELETE | `/api/customers/:id` | Delete customer | Admin |
| GET | `/api/customers/:id/followups` | List follow-ups | Admin, Sales, Accounts |
| POST | `/api/customers/:id/followups` | Add follow-up | Admin, Sales |
| GET | `/api/products` | List products | All roles |
| GET | `/api/products/:id` | Get product | All roles |
| POST | `/api/products` | Create product | Admin, Warehouse |
| PUT | `/api/products/:id` | Update product | Admin, Warehouse |
| GET | `/api/stock/movements` | List movements | Admin, Warehouse, Accounts |
| POST | `/api/stock/movements` | Record movement | Admin, Warehouse |
| GET | `/api/challans` | List challans | Admin, Sales, Accounts |
| GET | `/api/challans/:id` | Get challan | Admin, Sales, Accounts |
| POST | `/api/challans` | Create draft challan | Admin, Sales |
| POST | `/api/challans/:id/confirm` | Confirm challan | Admin, Sales |
| POST | `/api/challans/:id/cancel` | Cancel draft challan | Admin, Sales |
| GET | `/api/dashboard/stats` | Dashboard data | All authenticated |
| GET | `/api/health` | Health check | Public |

### Response Format

Success:
```json
{ "success": true, "data": { ... } }
```

Error:
```json
{ "success": false, "message": "...", "errors": ["..."] }
```

Insufficient stock (challan confirm):
```json
{
  "success": false,
  "message": "Insufficient stock for Keyboard",
  "available": 3,
  "requested": 5
}
```

## Authentication

1. `POST /api/auth/login` with `{ "email", "password" }`
2. Receive JWT token in response
3. Send `Authorization: Bearer <token>` on all protected requests
4. Token expires per `JWT_EXPIRES_IN` (default: 24h)

Passwords are hashed with bcrypt (cost factor 10). `password_hash` is never returned in API responses.

## Role Permissions

| Permission | Admin | Sales | Warehouse | Accounts |
|-----------|:-----:|:-----:|:---------:|:--------:|
| Full access | ✓ | | | |
| View/create/edit customers | ✓ | ✓ | | View |
| Add follow-ups | ✓ | ✓ | | |
| View products | ✓ | ✓ | ✓ | ✓ |
| Create/edit products | ✓ | | ✓ | |
| Manage stock | ✓ | | ✓ | |
| View stock movements | ✓ | | ✓ | ✓ |
| Create/confirm challans | ✓ | ✓ | | |
| View challans | ✓ | ✓ | | ✓ |
| Delete customers | ✓ | | | |

Authorization is enforced on the backend via middleware — hiding UI buttons alone is not sufficient.

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)

### 1. Clone and install

```bash
cd mini-erp-crm
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment variables

**Backend** (`backend/.env`):
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini_erp_crm
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:4000/api
```

### 3. Database setup

Create the database:
```bash
createdb mini_erp_crm
```

Run schema + seed:
```bash
cd backend
npm run seed
```

This creates tables, seeds four role-based users, sample customers, and products.

### 4. Running the backend

```bash
cd backend
npm run dev
```

API: http://localhost:4000  
Swagger: http://localhost:4000/api/docs

### 5. Running the frontend

```bash
cd frontend
npm run dev
```

App: http://localhost:5173

## Docker Setup

Ensure Docker Desktop is running, then:

```bash
cp .env.example .env
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432

Seed the database after first start:
```bash
docker compose exec backend node -e "require('child_process').execSync('npm run seed', {stdio:'inherit'})"
```

Or run seed locally against the Docker Postgres:
```bash
cd backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini_erp_crm npm run seed
```

## Postman Usage

1. Import `postman/Mini-ERP-CRM.postman_collection.json`
2. Set collection variable `base_url` to `http://localhost:4000/api`
3. Run **Authentication > Login** — token is saved automatically
4. All other requests use the saved Bearer token

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Password123! |
| Sales | sales@example.com | Password123! |
| Warehouse | warehouse@example.com | Password123! |
| Accounts | accounts@example.com | Password123! |

## Running Tests

Requires a running PostgreSQL instance with `DATABASE_URL` configured in `backend/.env`:

```bash
cd backend
npm test
```

Tests cover:
- Authentication (login, invalid password, missing auth)
- Authorization (permitted/forbidden roles)
- Customer CRUD and validation
- Product creation, validation, duplicate SKU
- Stock IN/OUT and negative stock prevention
- Challan draft, confirm, insufficient stock rollback, duplicate confirm, cancel

## Business Logic: Challan Confirmation

The challan confirmation workflow is the most critical business operation:

1. **Begin PostgreSQL transaction**
2. Load challan with `FOR UPDATE` lock
3. Verify status is `DRAFT`
4. Load all challan items
5. For each item, lock product row and verify sufficient stock
6. If **any** product lacks stock → rollback, return 400 with available/requested counts
7. If all pass → deduct stock, create OUT movements, set status to `CONFIRMED`, commit

This is **atomic**: if a 5-product challan fails on product 5, products 1–4 are not deducted.

Challan items store **product snapshots** (name, SKU, price) so historical records remain accurate even if products are later edited.

Challan numbers are auto-generated: `SC-2026-00001`, `SC-2026-00002`, etc.

## Deployment

### Database — Neon or Supabase

1. Create a PostgreSQL database
2. Run `database/schema.sql` via the provider's SQL editor
3. Run `npm run seed` with the production `DATABASE_URL`

### Backend — Render

1. Create a Web Service from the repo
2. Root directory: `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Environment variables:
   - `DATABASE_URL` — Neon/Supabase connection string
   - `JWT_SECRET` — strong random secret
   - `JWT_EXPIRES_IN=24h`
   - `CORS_ORIGIN` — your Vercel frontend URL
   - `NODE_ENV=production`

### Frontend — Vercel

1. Import repo, root directory: `frontend`
2. Build: `npm run build`
3. Output: `dist`
4. Environment variable:
   - `VITE_API_URL=https://your-render-app.onrender.com/api`

### Production Checklist

- [ ] Strong `JWT_SECRET` set on Render
- [ ] `CORS_ORIGIN` matches Vercel URL exactly
- [ ] Database SSL enabled (automatic on Neon/Supabase)
- [ ] Frontend `VITE_API_URL` points to production backend
- [ ] No secrets committed to Git

## Known Limitations

- No email notifications for follow-ups
- No multi-warehouse stock allocation
- No audit log beyond stock movements
- Pagination max 100 items per page
- Seed script drops and recreates schema (development only)

## Future Improvements

- Email/SMS follow-up reminders
- Advanced reporting and analytics
- Barcode scanning for warehouse
- Multi-warehouse inventory
- Audit trail for all entity changes
- Refresh token rotation

## License

MIT
