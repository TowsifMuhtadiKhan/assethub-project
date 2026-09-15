# AssetHub

AssetHub is the frontend for the separate AssetHub API.

## Local development

Start the backend first:

```bash
cd ../backend/assethub-api
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API runs on `http://localhost:4000`. In the frontend, create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Then start the frontend:

```bash
npm install
npm run dev
```

## Deployment

Deploy `backend/assethub-api` as one Vercel project and set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`. Deploy `assethub` as a second Vercel project and set:

```env
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
```

The frontend uses JWT authentication and calls the backend with `Authorization: Bearer <token>`. Vehicle, expense, and maintenance records are filtered by the authenticated user ID.
