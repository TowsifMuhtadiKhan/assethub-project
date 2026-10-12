import { useState } from "react";
import { Bike, Car } from "lucide-react";

const brands = new Set(["toyota", "honda", "yamaha", "suzuki", "bmw", "mercedesbenz", "audi", "nissan", "hyundai", "kia", "ford", "volkswagen", "mitsubishi", "mazda", "tata", "bajaj", "ktm", "ducati", "royalenfield", "hero"]);

export function VehicleBrandLogo({ brand = "", type = "" }: { brand?: string; type?: string }) {
  const normalized = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = ({ mercedes: "mercedesbenz", heromotocorp: "hero", bajajauto: "bajaj", yamahamotor: "yamaha" } as Record<string, string>)[normalized] || normalized;
  const [failed, setFailed] = useState("");
  const Icon = /bike|motorcycle|scooter|bicycle/i.test(type) ? Bike : Car;
  return brands.has(key) && failed !== key
    ? <img src={`/brands/${key}.svg`} alt={`${brand} logo`} className="h-6 w-6 object-contain" onError={() => setFailed(key)} />
    : <Icon aria-label={brand || type} className="h-5 w-5" />;
}
