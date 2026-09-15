export type NavItem = {
  title: string;
  path: string;
  icon: string;
  group?: string;
};

export type VehicleStatus = "GOOD" | "DUE SOON" | "OVERDUE";

export type VehicleType = "Car" | "Bike";

export type UnitStatus =
  | "Occupied"
  | "Vacant"
  | "Reserved"
  | "Under Maintenance";
export type UnitType =
  | "Room"
  | "Shop"
  | "Commercial Space"
  | "Office"
  | "Floor"
  | "Warehouse"
  | "Other";
export type RentStatus = "PAID" | "PARTIALLY PAID" | "UNPAID" | "OVERDUE";

export type DashboardStat = {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  tone?: "emerald" | "blue" | "amber" | "rose" | "violet";
};

export type ActivityItem = {
  id: string;
  title: string;
  time: string;
  detail: string;
};

export type CollectionRow = {
  unit: string;
  tenant: string;
  rent: number;
  utilities: number;
  previousDue: number;
  total: number;
  paid: number;
  due: number;
  status: RentStatus;
};

export type PropertyExpenseCategory =
  | "Electricity"
  | "Water"
  | "Gas"
  | "Maintenance"
  | "Cleaning"
  | "Security"
  | "Employee Salary"
  | "Repair"
  | "Plumbing"
  | "Electrical"
  | "Painting"
  | "Tax"
  | "Legal"
  | "Construction"
  | "Other";

export type VehicleExpenseCategory =
  | "Fuel"
  | "Maintenance"
  | "Repair"
  | "Insurance"
  | "Registration"
  | "Tax Token"
  | "Fitness"
  | "Parking"
  | "Toll"
  | "Car Wash"
  | "Accessories"
  | "Fine"
  | "Other";

export type ServiceType =
  | "Engine oil / Mobil change"
  | "Oil filter change"
  | "Air filter change"
  | "Cabin filter"
  | "Brake pads"
  | "Brake fluid"
  | "Coolant"
  | "Transmission oil"
  | "Battery"
  | "Spark plugs"
  | "AC servicing"
  | "Tire replacement"
  | "Tire rotation"
  | "Wheel alignment"
  | "Suspension"
  | "Engine repair"
  | "Gearbox repair"
  | "Electrical work"
  | "Body work"
  | "General servicing"
  | "Other/custom service";

export type Vehicle = {
  id: string;
  name: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  chassisNumber: string;
  engineNumber: string;
  mileage: number;
  purchaseDate: string;
  purchasePrice: number;
  color: string;
  insuranceInfo: string;
  taxTokenInfo: string;
  fitnessExpiry: string;
  notes: string;
  image: string;
  status: VehicleStatus;
};

export type VehicleService = {
  id: string;
  vehicleId: string;
  serviceType: ServiceType;
  serviceDate: string;
  mileageAtService: number;
  workshopName: string;
  workshopLocation: string;
  mechanicName: string;
  cost: number;
  partsCost: number;
  laborCost: number;
  description: string;
  notes: string;
  nextServiceDate: string;
  nextServiceMileage: number;
  reminderEnabled: boolean;
  receiptUrl?: string;
};

export type VehicleExpense = {
  id: string;
  vehicleId: string;
  date: string;
  category: VehicleExpenseCategory;
  amount: number;
  mileage: number;
  description: string;
  receiptUrl?: string;
  paymentMethod: string;
};

export type Property = {
  id: string;
  name: string;
  location: string;
  type: string;
  unitsCount: number;
  occupancyRate: number;
};

export type PropertyUnit = {
  id: string;
  propertyId: string;
  unitNumber: string;
  unitName: string;
  unitType: UnitType;
  floor: string;
  sizeSqft: number;
  monthlyRent: number;
  securityDeposit: number;
  currentTenant: string;
  status: UnitStatus;
};

export type Tenant = {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  nidNumber?: string;
  address?: string;
  emergencyContact?: string;
  occupation?: string;
  notes?: string;
  businessName?: string;
  tradeLicense?: string;
  businessType?: string;
};

export type RentPayment = {
  id: string;
  unitId: string;
  tenantId: string;
  month: string;
  amountPayable: number;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  receiptUrl?: string;
  status: RentStatus;
};

export type PropertyExpense = {
  id: string;
  propertyId: string;
  date: string;
  category: PropertyExpenseCategory;
  amount: number;
  vendor: string;
  description: string;
  paymentMethod: string;
  receiptUrl?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "vehicle" | "property" | "system";
  date: string;
};
