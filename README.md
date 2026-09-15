# AssetHub

AssetHub is a personal asset management system for vehicles and rental properties. It has a React frontend and a separate Express API with PostgreSQL persistence. Every account has its own vehicles, expenses, maintenance records, properties, rental units, and rent payments.

## What It Does

### Vehicle management

- Add cars and bikes with free-text brand and model fields.
- Store Bangladesh registration numbers such as `Dhaka Metro LA 33-3617`.
- View vehicles in a table and open an individual vehicle workspace.
- Track fuel purchases with amount, liters, date, mileage, payment method, and notes.
- Track maintenance such as Mobil change, air filter, oil filter, AC filter, AC servicing, brake pads, or a custom maintenance type.
- Track other vehicle expenses such as repair, insurance, registration, tax, parking, tolls, and accessories.
- See total fuel, maintenance, and other expense costs.
- See each category's last-month cost and fuel liters recorded.

### Rental property management

- Add a flat, residential property, commercial property, or mixed-use property.
- Create different unit groups in one property, for example:
  - Gazipur: 40 rooms, 5 shops, and 1 floor.
  - Uttara: 1 flat.
- Manage each room, shop, floor, flat, or office separately.
- Store the tenant or rent name for each unit.
- Store the fixed monthly rent for each unit.
- Record the month and actual amount received for every rent payment.
- View payment history per unit so paid and missing rent can be compared with the fixed rent.

### Accounts and data ownership

- Register and sign in with email and password.
- JWT authentication protects the API.
- Users can only access their own vehicles, expenses, maintenance, properties, units, and rent payments.
- Data is stored in PostgreSQL and accessed through the separate backend API.

## Project Structure

```text
assethub-project/
├── frontend/              React + TypeScript + Vite application
│   ├── src/pages/         Dashboard, vehicles, vehicle details, properties
│   ├── src/services/      API client and CRUD services
│   └── package.json
├── backend/               Express + TypeScript API
│   ├── src/server.ts      Authentication and CRUD routes
│   ├── prisma/            PostgreSQL schema and migrations
│   └── package.json
└── vercel.json
```

## API

The backend runs locally at `http://localhost:4000`.

Public routes:

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Protected vehicle routes:

```text
GET    /api/vehicles
POST   /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id
GET    /api/vehicles/:id/expenses
POST   /api/vehicles/:id/expenses
GET    /api/vehicles/:id/maintenance
POST   /api/vehicles/:id/maintenance
```

Protected property routes:

```text
GET  /api/properties
POST /api/properties
GET  /api/properties/:id/units
POST /api/properties/:id/units
PATCH /api/properties/:propertyId/units/:unitId
POST /api/properties/:propertyId/units/:unitId/rent
GET  /api/properties/:id/expenses
POST /api/properties/:id/expenses
```

Protected routes require:

```text
Authorization: Bearer <jwt-token>
```

## Local Setup

### 1. Start PostgreSQL

Docker example for Windows:

```bash
docker run -d --name assethub-postgres \
  -e POSTGRES_USER=assethub \
  -e POSTGRES_PASSWORD=assethub_dev_password \
  -e POSTGRES_DB=assethub \
  -p 5432:5432 postgres:16
```

### 2. Start the backend

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Backend environment variables:

```env
DATABASE_URL=postgresql://assethub:assethub_dev_password@localhost:5432/assethub?schema=public
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
PORT=4000
```

### 3. Start the frontend

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Vercel Deployment

Deploy the frontend and backend as two separate Vercel projects from this repository.

### Backend project

Set Root Directory to:

```text
backend
```

Add these Production environment variables:

```env
DATABASE_URL=your-hosted-postgresql-url
JWT_SECRET=your-long-random-secret
CORS_ORIGIN=https://your-frontend.vercel.app
```

The backend build runs Prisma migrations automatically through the `postinstall` and `build` scripts. The production `DATABASE_URL` must point to hosted PostgreSQL, not `localhost`.

### Frontend project

Set Root Directory to:

```text
frontend
```

Add:

```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

Redeploy the frontend after changing this variable. After the frontend URL is known, update the backend `CORS_ORIGIN` to that exact URL and redeploy the backend.

## Build Checks

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm run build
```
