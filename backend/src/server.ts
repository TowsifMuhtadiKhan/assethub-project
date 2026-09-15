import "dotenv/config";
import cors from "cors";
import bcrypt from "bcryptjs";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) throw new Error("JWT_SECRET is required");

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Origin is not allowed"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

type AuthRequest = Request & { userId?: string };
function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ message: "Authorization token required" });
  try {
    req.userId = (jwt.verify(token, jwtSecret) as { sub: string }).sub;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const vehicleInput = z.object({
  name: z.string().min(1),
  type: z.enum(["Car", "Bike"]),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int(),
  registrationNumber: z.string().optional(),
  mileage: z.coerce.number().int().nonnegative().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  image: z.string().optional(),
  status: z.string().optional(),
});
const expenseInput = z.object({
  date: z.coerce.date(),
  category: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  mileage: z.coerce.number().int().nonnegative().optional(),
  description: z.string().min(1),
  paymentMethod: z.string().min(1),
  receiptUrl: z.string().optional(),
  fuelLiters: z.coerce.number().positive().optional(),
});
const maintenanceInput = z.object({
  serviceType: z.string().min(1),
  serviceDate: z.coerce.date(),
  mileageAtService: z.coerce.number().int().nonnegative().optional(),
  workshopName: z.string().min(1),
  cost: z.coerce.number().nonnegative(),
  description: z.string().min(1),
  nextServiceDate: z.coerce.date().optional(),
  receiptUrl: z.string().optional(),
});
const propertyInput = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  type: z.string().min(1),
  unitsCount: z.coerce.number().int().nonnegative().optional(),
  occupancyRate: z.coerce.number().int().min(0).max(100).optional(),
});
const unitInput = z.object({
  unitNumber: z.string().min(1),
  unitType: z.string().min(1),
  tenantName: z.string().optional(),
  monthlyRent: z.coerce.number().nonnegative(),
});
const rentInput = z.object({
  month: z.string().min(1),
  amountPaid: z.coerce.number().nonnegative(),
});
const tokenFor = (id: string) =>
  jwt.sign({ sub: id }, jwtSecret, { expiresIn: "30d" });

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "assethub-api" }),
);
app.post("/api/auth/register", async (req, res) => {
  try {
    const input = credentials.parse(req.body);
    const exists = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
    res.status(201).json({
      token: tokenFor(user.id),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const input = credentials.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({
      token: tokenFor(user.id),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
});
app.get("/api/auth/me", auth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });
  res.json(user);
});

app.get("/api/vehicles", auth, async (req: AuthRequest, res) =>
  res.json(
    await prisma.vehicle.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: "desc" },
    }),
  ),
);
app.post("/api/vehicles", auth, async (req: AuthRequest, res) => {
  try {
    const input = vehicleInput.parse(req.body);
    const vehicle = await prisma.vehicle.create({
      data: {
        ...input,
        ownerId: req.userId!,
        registrationNumber: input.registrationNumber ?? "",
        mileage: input.mileage ?? 0,
        color: input.color ?? "",
        notes: input.notes ?? "",
        image: input.image ?? "",
        status: input.status ?? "GOOD",
      },
    });
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Could not create vehicle",
    });
  }
});
app.get("/api/vehicles/:id", auth, async (req: AuthRequest, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: String(req.params.id), ownerId: req.userId },
  });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
  res.json(vehicle);
});
app.patch("/api/vehicles/:id", auth, async (req: AuthRequest, res) => {
  try {
    const input = vehicleInput.partial().parse(req.body);
    const result = await prisma.vehicle.updateMany({
      where: { id: String(req.params.id), ownerId: req.userId },
      data: input,
    });
    if (!result.count)
      return res.status(404).json({ message: "Vehicle not found" });
    res.json(
      await prisma.vehicle.findUnique({ where: { id: String(req.params.id) } }),
    );
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Could not update vehicle",
    });
  }
});
app.delete("/api/vehicles/:id", auth, async (req: AuthRequest, res) => {
  const result = await prisma.vehicle.deleteMany({
    where: { id: String(req.params.id), ownerId: req.userId },
  });
  if (!result.count)
    return res.status(404).json({ message: "Vehicle not found" });
  res.status(204).end();
});

app.get("/api/properties", auth, async (req: AuthRequest, res) =>
  res.json(
    await prisma.property.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: "desc" },
    }),
  ),
);
app.post("/api/properties", auth, async (req: AuthRequest, res) => {
  try {
    const input = propertyInput.parse(req.body);
    const property = await prisma.property.create({
      data: {
        ...input,
        ownerId: req.userId!,
        unitsCount: input.unitsCount ?? 0,
        occupancyRate: input.occupancyRate ?? 0,
      },
    });
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Could not create property",
    });
  }
});

app.get("/api/properties/:id/units", auth, async (req: AuthRequest, res) => {
  res.json(
    await prisma.propertyUnit.findMany({
      where: { propertyId: String(req.params.id), ownerId: req.userId },
      include: { rentPayments: true },
      orderBy: { unitNumber: "asc" },
    }),
  );
});
app.post("/api/properties/:id/units", auth, async (req: AuthRequest, res) => {
  try {
    const input = unitInput.parse(req.body);
    const property = await prisma.property.findFirst({
      where: { id: String(req.params.id), ownerId: req.userId },
    });
    if (!property)
      return res.status(404).json({ message: "Property not found" });
    const unit = await prisma.propertyUnit.create({
      data: {
        ...input,
        ownerId: req.userId!,
        propertyId: property.id,
        tenantName: input.tenantName ?? "",
      },
    });
    res.status(201).json(unit);
  } catch (error) {
    res
      .status(400)
      .json({
        message:
          error instanceof Error ? error.message : "Could not create unit",
      });
  }
});
app.patch(
  "/api/properties/:propertyId/units/:unitId",
  auth,
  async (req: AuthRequest, res) => {
    try {
      const input = unitInput.partial().parse(req.body);
      const result = await prisma.propertyUnit.updateMany({
        where: {
          id: String(req.params.unitId),
          propertyId: String(req.params.propertyId),
          ownerId: req.userId,
        },
        data: input,
      });
      if (!result.count)
        return res.status(404).json({ message: "Unit not found" });
      res.json(
        await prisma.propertyUnit.findUnique({
          where: { id: String(req.params.unitId) },
        }),
      );
    } catch (error) {
      res
        .status(400)
        .json({
          message:
            error instanceof Error ? error.message : "Could not update unit",
        });
    }
  },
);
app.post(
  "/api/properties/:propertyId/units/:unitId/rent",
  auth,
  async (req: AuthRequest, res) => {
    try {
      const input = rentInput.parse(req.body);
      const unit = await prisma.propertyUnit.findFirst({
        where: {
          id: String(req.params.unitId),
          propertyId: String(req.params.propertyId),
          ownerId: req.userId,
        },
      });
      if (!unit) return res.status(404).json({ message: "Unit not found" });
      const payment = await prisma.rentPayment.create({
        data: { ...input, ownerId: req.userId!, unitId: unit.id },
      });
      res.status(201).json(payment);
    } catch (error) {
      res
        .status(400)
        .json({
          message:
            error instanceof Error ? error.message : "Could not save rent",
        });
    }
  },
);

app.get("/api/vehicles/:id/expenses", auth, async (req: AuthRequest, res) =>
  res.json(
    await prisma.vehicleExpense.findMany({
      where: { vehicleId: String(req.params.id), ownerId: req.userId },
      orderBy: { date: "desc" },
    }),
  ),
);
app.post("/api/vehicles/:id/expenses", auth, async (req: AuthRequest, res) => {
  try {
    const input = expenseInput.parse(req.body);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: String(req.params.id), ownerId: req.userId },
    });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    const row = await prisma.vehicleExpense.create({
      data: {
        ...input,
        ownerId: req.userId!,
        vehicleId: vehicle.id,
        mileage: input.mileage ?? 0,
        fuelLiters: input.fuelLiters,
      },
    });
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Could not create expense",
    });
  }
});
app.get("/api/vehicles/:id/maintenance", auth, async (req: AuthRequest, res) =>
  res.json(
    await prisma.maintenance.findMany({
      where: { vehicleId: String(req.params.id), ownerId: req.userId },
      orderBy: { serviceDate: "desc" },
    }),
  ),
);
app.post(
  "/api/vehicles/:id/maintenance",
  auth,
  async (req: AuthRequest, res) => {
    try {
      const input = maintenanceInput.parse(req.body);
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: String(req.params.id), ownerId: req.userId },
      });
      if (!vehicle)
        return res.status(404).json({ message: "Vehicle not found" });
      const row = await prisma.maintenance.create({
        data: {
          ...input,
          ownerId: req.userId!,
          vehicleId: vehicle.id,
          mileageAtService: input.mileageAtService ?? 0,
        },
      });
      res.status(201).json(row);
    } catch (error) {
      res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Could not create maintenance",
      });
    }
  },
);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) =>
  res.status(500).json({ message: error.message }),
);
export default app;
if (process.env.VERCEL !== "1")
  app.listen(Number(process.env.PORT ?? 4000), () =>
    console.log(
      `AssetHub API running on http://localhost:${process.env.PORT ?? 4000}`,
    ),
  );
