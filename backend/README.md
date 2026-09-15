# AssetHub API

Separate backend for AssetHub. It provides JWT authentication, PostgreSQL persistence through Prisma, and user-owned CRUD for vehicles, expenses, and maintenance.

## Local setup

```bash
cd backend/assethub-api
npm install
copy .env.example .env
```

For local Windows development, start PostgreSQL with Docker:

```bash
docker run -d --name assethub-postgres -e POSTGRES_USER=assethub -e POSTGRES_PASSWORD=assethub_dev_password -e POSTGRES_DB=assethub -p 5432:5432 postgres:16
```

Set `DATABASE_URL` to your PostgreSQL database and create the tables:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

For Vercel, run `npx prisma migrate deploy` once against the production `DATABASE_URL` before using the API.

The API runs at `http://localhost:4000`. The frontend should use:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Vercel setup

Deploy the `backend/assethub-api` folder as a separate Vercel project. Add these environment variables in Vercel:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` set to the deployed frontend URL

After deployment, set the frontend variable to the deployed API URL:

```env
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
```

## CRUD routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST /api/vehicles`
- `GET/PATCH/DELETE /api/vehicles/:id`
- `GET/POST /api/vehicles/:id/expenses`
- `GET/POST /api/vehicles/:id/maintenance`

Every protected request requires `Authorization: Bearer <token>`. Every query is filtered by the authenticated user ID.
