import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bike,
  CarFront,
  CirclePlus,
  DatabaseZap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listVehicles } from "../services/vehicleService";
import type { Vehicle } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVehicles().then((data) => {
      setVehicles(data);
      setLoading(false);
    });
  }, []);

  const cars = vehicles.filter((vehicle) => vehicle.type === "Car");
  const bikes = vehicles.filter((vehicle) => vehicle.type === "Bike");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-600">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Your assets
          </h1>
          <p className="mt-2 text-slate-600">
            Add your own vehicles and properties to see your real dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/vehicles/cars")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          <CirclePlus className="h-4 w-4" /> Add vehicle
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
        <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">Your data is ready to add</div>
          <p className="mt-1 text-cyan-700">
            Vehicle entries are saved through the separate AssetHub API.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Cars"
          count={cars.length}
          icon={<CarFront className="h-5 w-5" />}
          onClick={() => navigate("/vehicles/cars")}
        />
        <SummaryCard
          label="Bikes"
          count={bikes.length}
          icon={<Bike className="h-5 w-5" />}
          onClick={() => navigate("/vehicles/bikes")}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Vehicle list</h2>
        <p className="mt-1 text-sm text-slate-500">
          {loading
            ? "Loading your entries..."
            : `${vehicles.length} saved vehicle${vehicles.length === 1 ? "" : "s"}`}
        </p>
        {!loading && vehicles.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
            Nothing here yet. Select Add vehicle or use Quick Add to enter your
            first car or bike.
          </div>
        )}
        {!loading && vehicles.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <img
                  src={vehicle.image}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {vehicle.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {vehicle.type} · {vehicle.brand} {vehicle.model}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="font-semibold text-slate-900">Properties</h2>
        <p className="mt-1 text-sm text-slate-600">
          No properties added yet. Open Properties from the sidebar when you are
          ready to add one.
        </p>
        <button
          type="button"
          onClick={() => navigate("/properties")}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-600"
        >
          Open properties <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-cyan-300"
    >
      <span>
        <span className="block text-sm text-slate-500">{label}</span>
        <span className="mt-1 block text-3xl font-bold text-slate-900">
          {count}
        </span>
      </span>
      <span className="rounded-xl bg-cyan-50 p-3 text-cyan-600">{icon}</span>
    </button>
  );
}
