export type NavItem = {
  title: string;
  path: string;
  icon: string;
  group?: string;
};

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

export type PropertyExpense = {
  id: string;
  propertyId: string;
  date: string;
  category: string;
  amount: number;
  vendor: string;
  description: string;
  paymentMethod: string;
  receiptUrl?: string;
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

// 1. User & Family Profiles
export type RelationshipType =
  | "Self"
  | "Spouse"
  | "Child"
  | "Parent"
  | "Sibling"
  | "Other";

export type FamilyMemberAccess = {
  canLogin: boolean;
  loginRole: "Admin" | "Vehicle_Manager" | "Viewer" | "Custom";
  canAccessDashboard?: boolean; // Dashboard overview & metrics
  canAccessVehicles: boolean;
  assignedVehicleIds: string[]; // empty means all, or specific vehicle IDs
  canWriteFuel: boolean;
  canWriteMaintenance: boolean;
  canWriteDocuments: boolean; // Legacy upload permission, kept in sync with canCreateDocuments
  canAccessVault: boolean;
  assignedVaultFolderScope?: "all" | "specific"; // "all" = access to all folders, "specific" = restricted to assignedVaultFolders
  assignedVaultFolders?: string[]; // Empty means all folders, or specific folder names/IDs
  canCreateDocuments?: boolean; // C: Upload / create documents & folders
  canReadDocuments?: boolean; // R: View and preview documents
  canUpdateDocuments?: boolean; // U: Edit details, rename, move documents
  canDeleteDocuments?: boolean; // D: Delete documents or folders
  canAccessProperties: boolean;
  assignedPropertyIds?: string[]; // empty means all, or specific property IDs
  canWriteRent?: boolean;
  canWritePropertyMaintenance?: boolean;
  canAccessWarranties: boolean;
  canCreateWarranties?: boolean;
  canReadWarranties?: boolean;
  canUpdateWarranties?: boolean;
  canDeleteWarranties?: boolean;
  assignedWarrantyScope?: "all" | "specific";
  assignedWarrantyCategories?: string[];

  canAccessTasks?: boolean;
  canCreateTasks?: boolean;
  canReadTasks?: boolean;
  canUpdateTasks?: boolean;
  canDeleteTasks?: boolean;
  assignedTaskScope?: "all" | "specific";

  canAccessSchedule?: boolean;

  canAccessDailyExpenses?: boolean;
  canCreateExpenses?: boolean;
  canReadExpenses?: boolean;
  canUpdateExpenses?: boolean;
  canDeleteExpenses?: boolean;
  assignedExpenseScope?: "all" | "specific";

  assignedVehicleScope?: "all" | "specific";
  canCreateVehicles?: boolean;
  canReadVehicles?: boolean;
  canUpdateVehicles?: boolean;
  canDeleteVehicles?: boolean;

  assignedPropertyScope?: "all" | "specific";
  canCreateProperties?: boolean;
  canReadProperties?: boolean;
  canUpdateProperties?: boolean;
  canDeleteProperties?: boolean;
};

export type FamilyMember = {
  id: string;
  fullName: string;
  relationship: RelationshipType;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  nationality?: string;
  identificationInfo?: string;
  notes?: string;
  photoUrl?: string;
  access?: FamilyMemberAccess;
};

export type WhatsAppContact = {
  id: string;
  alias: string;
  phone: string;
  countryCode: string;
  isDefault?: boolean;
};

export type UserSettings = {
  id?: string;
  fullName: string;
  whatsappNumber: string;
  countryCode: string;
  whatsappEnabled: boolean;
  reminderDaysBefore: number;
  whatsappContacts?: WhatsAppContact[];
  googleDriveFolderId?: string;
  callmebotApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
};

// 2. Document Vault
export type DocumentCategory =
  | "Identity"
  | "Academic"
  | "Employment"
  | "Tax/Financial"
  | "Health"
  | "Legal"
  | "Travel"
  | "Vehicle"
  | "Property"
  | "Other";

export type DocumentItem = {
  id: string;
  name: string;
  category: DocumentCategory;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority: string;
  familyMemberId?: string;
  familyMemberName?: string;
  assetType?: string;
  assetId?: string;
  folderName: string;
  fileUrl?: string;
  fileType: string;
  storageProvider: "supabase" | "google_drive" | "local";
  driveFileId?: string;
  isFavorite: boolean;
  requiresRenewal: boolean;
  reminderDate?: string;
  tags: string[];
  notes?: string;
  fileSize?: number;
  createdAt?: string;
};

export type DocumentFolder = {
  id: string;
  name: string;
  parentId?: string;
  familyMemberId?: string;
  familyMemberName?: string;
  color?: string;
  createdAt?: string;
};

// 3. Licenses & Registrations
export type LicenseItem = {
  id: string;
  licenseName: string;
  licenseNumber: string;
  holderName: string;
  familyMemberId?: string;
  issuingAuthority: string;
  issueDate?: string;
  expiryDate?: string;
  renewalPeriod: string;
  renewalCost: number;
  reminderDate?: string;
  documentUrl?: string;
  notes?: string;
};

// 4. Vehicles & Records
export type VehicleStatus = "GOOD" | "DUE SOON" | "OVERDUE";
export type VehicleType =
  | "Car"
  | "Bike"
  | "Motorcycle"
  | "Scooter"
  | "Truck"
  | "Commercial"
  | "Van"
  | "Bicycle"
  | "EV"
  | "CNG"
  | "Other"
  | (string & {});

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
  ownershipInfo?: string;
  insuranceInfo: string;
  taxTokenInfo: string;
  fitnessExpiry?: string;
  taxTokenExpiry?: string;
  insuranceExpiry?: string;
  routePermitExpiry?: string;
  notes: string;
  image: string;
  status: VehicleStatus;
  cubicCapacity?: string;
  fuelType?: string;
  seatingCapacity?: string;
};

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

export type VehicleExpense = {
  id: string;
  vehicleId: string;
  date: string;
  category: VehicleExpenseCategory;
  fuelType?: string;
  fuelLiters?: number;
  pricePerUnit?: number;
  amount: number;
  mileage: number;
  fuelStation?: string;
  description: string;
  receiptUrl?: string;
  paymentMethod: string;
};

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

export type VehicleService = {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  mileageAtService: number;
  workshopName: string;
  workshopLocation: string;
  mechanicName: string;
  partsUsed?: string;
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

export type BangladeshDocType =
  | "Tax Token"
  | "Registration Certificate"
  | "Smart Registration Card"
  | "Driving License"
  | "Fitness Certificate"
  | "Insurance Certificate"
  | "Route Permit"
  | "Custom Document";

export type VehicleDocument = {
  id: string;
  vehicleId: string;
  name: string;
  category: BangladeshDocType | string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  notes?: string;
  createdAt: string;
};

// 5. Purchases & Warranties
export type WarrantyStatus = "ACTIVE" | "EXPIRING SOON" | "EXPIRED" | "CLAIMED";

export type WarrantyItem = {
  id: string;
  productName: string;
  category: string;
  purchaseDate: string;
  warrantyStartDate?: string;
  warrantyDurationMonths: number;
  expiryDate?: string;
  seller: string;
  purchasePrice: number;
  serialNumber: string;
  invoiceNumber: string;
  receiptUrl?: string;
  warrantyDocumentUrl?: string;
  relatedAssetType?: string;
  relatedAssetId?: string;
  status: WarrantyStatus;
  notes?: string;
};

// 6. Real Estate & Properties
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
  | "Flat"
  | "Warehouse"
  | "Other";

export type RentStatus = "PAID" | "PARTIALLY PAID" | "UNPAID" | "OVERDUE";

export type Property = {
  id: string;
  name: string;
  type: string;
  address?: string;
  location: string;
  landArea?: string;
  floorArea?: string;
  sizeSqft?: number;
  ownershipPercentage?: number;
  purchaseDate?: string;
  purchaseValue?: number;
  estimatedCurrentValue?: number;
  unitsCount: number;
  occupancyRate: number;
  description?: string;
  notes?: string;
};

export type PropertyUnit = {
  id: string;
  parentUnitId?: string | null;
  rentalMode?: "whole" | "rooms";
  propertyId: string;
  unitNumber: string;
  unitName: string;
  unitType: UnitType;
  floor: string;
  sizeSqft: number;
  monthlyRent: number;
  securityDeposit: number;
  currentTenant: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantNid?: string;
  emergencyContact?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  agreementDocUrl?: string;
  status: UnitStatus;
  rentPayments?: RentPayment[];
};

export type RentPayment = {
  id: string;
  unitId: string;
  tenantId?: string;
  month: string;
  amountPayable?: number;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  receiptUrl?: string;
  status: RentStatus;
};

// 7. Tasks & To-Do Management
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskRecurrence =
  | "None"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Yearly";
export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  category: string;
  recurrence: TaskRecurrence;
  familyMemberId?: string;
  familyMemberName?: string;
  vehicleId?: string;
  vehicleName?: string;
  propertyId?: string;
  propertyName?: string;
  documentId?: string;
  status: TaskStatus;
  reminderWhatsapp: boolean;
  reminderDate?: string;
  notes?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

// 8. Notifications
export type NotificationType =
  | "document"
  | "vehicle"
  | "property"
  | "rent"
  | "warranty"
  | "task"
  | "system";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  status?: "new" | "read" | "dismissed";
  date: string;
};

// 9. Calendar Events
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "task" | "document_expiry" | "rent_due" | "service_due" | "warranty_expiry";
  details?: string;
  link?: string;
};

// 10. Personal & Family Daily Expenses
export type DailyExpenseCategory =
  | "Food & Dining"
  | "Groceries & Market"
  | "Transport & Commute"
  | "Shopping & Personal"
  | "Bills & Utilities"
  | "Healthcare & Medicine"
  | "Education"
  | "Entertainment"
  | "Family & Home"
  | "Loan & EMI Repayment"
  | "DPS & Savings Deposit"
  | "Others"
  | (string & {});

export type DailyExpensePaymentMethod =
  | "Cash"
  | "bKash"
  | "Nagad"
  | "Bank Card"
  | "Rocket"
  | "Other";

export type DailyExpense = {
  id: string;
  familyMemberId: string;
  familyMemberName?: string;
  date: string;
  amount: number;
  category: DailyExpenseCategory;
  paymentMethod: DailyExpensePaymentMethod;
  description: string;
  merchant?: string;
  receiptUrl?: string;
  notes?: string;
  linkedLoanId?: string;
  linkedSegmentId?: string;
  linkedSavingsId?: string;
  linkedDepositLogId?: string;
  createdAt?: string;
};

// 11. Loans, Borrowings & Segment Repayments (Car Loan, EMI, Personal Debt)
export type LoanRepaymentSegment = {
  id: string;
  loanId: string;
  installmentNo?: number;
  monthLabel?: string; // e.g. "November, 26"
  dueDate?: string;
  amount: number;
  isPaid?: boolean;
  paymentDate?: string;
  paymentMethod?: DailyExpensePaymentMethod;
  notes?: string;
  receiptUrl?: string;
  createdAt?: string;
};

export type MemberLoan = {
  id: string;
  familyMemberId: string;
  familyMemberName?: string;
  loanTitle: string; // e.g. "Light EMI", "Drone EMI", "Car Loan - Toyota"
  loanType:
    | "Consumer EMI"
    | "Credit Card EMI"
    | "Credit Card Bill"
    | "Car Loan"
    | "Home Loan"
    | "Personal Loan"
    | "Education Loan"
    | "Business Loan"
    | "Friend/Family"
    | "Other";
  lenderName: string; // e.g. "bKash", "City Bank", "BRAC Bank", "Daraz"
  principalAmount: number;
  totalRepayableAmount: number; // Principal + Interest
  interestRate?: number;
  tenureMonths?: number;
  startDate: string;
  targetEndDate?: string;
  monthlyEmiAmount?: number;
  repayments: LoanRepaymentSegment[];
  status: "ACTIVE" | "PAID_OFF" | "DEFAULTED";
  reminderDayOfMonth?: number;
  reminderEnabled?: boolean;
  notes?: string;
  createdAt?: string;
};

// 12. Savings, DPS & Term Deposits (FDR, Sanchayapatra, Mutual Funds)
export type MemberSavingsType = "DPS" | "FDR" | "Sanchayapatra" | "Other";
export type MemberSavingsStatus = "ACTIVE" | "MATURED" | "CLOSED";

export type SavingsDepositLog = {
  id: string;
  savingsId: string;
  installmentNo?: number;
  monthLabel?: string;
  dueDate?: string;
  amount: number;
  isPaid?: boolean;
  depositDate?: string;
  paymentMethod?: DailyExpensePaymentMethod;
  notes?: string;
  receiptUrl?: string;
  createdAt?: string;
};

export type MemberSavings = {
  id: string;
  familyMemberId: string;
  familyMemberName?: string;
  title: string;
  type: MemberSavingsType;
  institutionName: string;
  accountNumber?: string;
  monthlyInstallment?: number;
  principalAmount?: number;
  tenureYears?: number;
  tenureMonths?: number;
  startDate: string;
  maturityDate?: string;
  interestRate?: number;
  maturityAmount?: number;
  depositDayOfMonth?: number;
  profitPayoutFrequency?: "On Maturity" | "Monthly" | "Quarterly" | "Half-Yearly";
  depositLogs: SavingsDepositLog[];
  status: MemberSavingsStatus;
  nomineeName?: string;
  notes?: string;
  createdAt?: string;
};
