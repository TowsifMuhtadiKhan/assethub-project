export interface ExtractedVehicleSpecs {
  engineNumber?: string;
  chassisNumber?: string;
  registrationNumber?: string;
  cubicCapacity?: string;
  fuelType?: string;
  seatingCapacity?: string;
  manufacturingYear?: number;
  color?: string;
  brand?: string;
  model?: string;
  documentNumber?: string;
  expiryDate?: string;
  detectedDocType?: string;
  confidence: "high" | "medium" | "estimated";
}

/**
 * Reads explicitly recorded specifications from plain-text documents.
 * Never infers vehicle identifiers or specifications from model names.
 */
export async function extractVehicleSpecsFromDocument(
  file: File,
  currentVehicle?: {
    brand?: string;
    model?: string;
    type?: string;
    year?: number;
    color?: string;
    registrationNumber?: string;
    engineNumber?: string;
    chassisNumber?: string;
  }
): Promise<ExtractedVehicleSpecs> {
  if (!file.type.startsWith("text/") && !/\.txt$/i.test(file.name)) {
    throw new Error("Image/PDF OCR is not available. Enter the vehicle details manually or upload a plain-text document.");
  }
  const combined = (await file.text()).toUpperCase();
  const documentType = combined.match(/VEHICLE\s+(?:TYPE|CLASS)\s*:\s*(CAR|MOTOR\s*CAR|BIKE|MOTORCYCLE|SCOOTER)\b/)?.[1];
  if (documentType && currentVehicle?.type) {
    const twoWheeler = /bike|motorcycle|scooter/i.test(currentVehicle.type);
    if (twoWheeler !== /BIKE|MOTORCYCLE|SCOOTER/.test(documentType)) {
      throw new Error("The document vehicle type does not match this vehicle. No specifications were applied.");
    }
  }

  let engineNumber: string | undefined;
  let chassisNumber: string | undefined;
  let registrationNumber: string | undefined;
  let cubicCapacity: string | undefined;
  let fuelType: string | undefined;
  let seatingCapacity: string | undefined;
  let manufacturingYear: number | undefined;
  let color: string | undefined;
  let documentNumber: string | undefined;
  let expiryDate: string | undefined;
  let detectedDocType: string | undefined;
  let confidence: "high" | "medium" | "estimated" = "estimated";

  // 1. Detect Document Type
  if (combined.includes("SMART") || combined.includes("REGISTRATION") || combined.includes("FORM 23")) {
    detectedDocType = "Smart Registration Card";
  } else if (combined.includes("FITNESS")) {
    detectedDocType = "Fitness Certificate";
  } else if (combined.includes("TAX") || combined.includes("TOKEN")) {
    detectedDocType = "Tax Token";
  } else if (combined.includes("INSURANCE")) {
    detectedDocType = "Insurance Certificate";
  }

  // 2. Extract Engine Number
  const engMatch = combined.match(/(?:ENGINE|ENG|MOTOR)\s*(?:NUMBER|NO\.?|#)?[:\s]*([A-Z0-9]+(?:[-_][A-Z0-9]+)+)\b/);
  if (engMatch && engMatch[1]) {
    engineNumber = engMatch[1].replace(/_/g, "-");
    confidence = "high";
  } else {
    // Specific engine models: 1NZ-FE-xxxx, 2ZR-FAE-xxxx, LEB-H1-xxxx, K12M-xxxx, etc.
    const specificEngMatch = combined.match(/\b(1NZ[-_]FE[-_]?[0-9A-Z]{4,8}|2ZR[-_]FAE[-_]?[0-9A-Z]{4,8}|1KR[-_]FE[-_]?[0-9A-Z]{4,8}|LEB[-_]H1[-_]?[0-9A-Z]{4,8}|K12M[-_]?[0-9A-Z]{4,8}|G3J4E[-_]?[0-9A-Z]{4,8}|KC28E[-_]?[0-9A-Z]{4,8}|DHGB[-_]?[0-9A-Z]{4,8})\b/);
    if (specificEngMatch && specificEngMatch[1]) {
      engineNumber = specificEngMatch[1].replace(/_/g, "-");
      confidence = "high";
    }
  }

  // 3. Extract Chassis / VIN Number
  const chsMatch = combined.match(/(?:CHASSIS|CHASIS|FRAME|VIN)\s*(?:NO|NUMBER|#)?[:\s._-]*([A-Z0-9]{3,8}[-_][A-Z0-9]{4,10})/);
  if (chsMatch && chsMatch[1]) {
    chassisNumber = chsMatch[1].replace(/_/g, "-");
    confidence = "high";
  } else {
    // 17-character VIN standard
    const vinMatch = combined.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
    if (vinMatch && vinMatch[1]) {
      chassisNumber = vinMatch[1];
      confidence = "high";
    } else {
      // Common Japanese / BD chassis codes: NZT260-xxxx, ZRT260-xxxx, NZE161-xxxx, RU3-xxxx, etc.
      const specificChsMatch = combined.match(/\b(NZT260[-_]?[0-9]{5,8}|ZRT260[-_]?[0-9]{5,8}|NZE161[-_]?[0-9]{5,8}|NKE165[-_]?[0-9]{5,8}|RU3[-_]?[0-9]{5,8}|GM6[-_]?[0-9]{5,8}|GP5[-_]?[0-9]{5,8}|ME1RG[-_]?[0-9A-Z]{5,8})\b/);
      if (specificChsMatch && specificChsMatch[1]) {
        chassisNumber = specificChsMatch[1].replace(/_/g, "-");
        confidence = "high";
      }
    }
  }

  // 4. Extract Registration Number
  const regMatch = combined.match(/\b(DHAKA|CHATTOGRAM|SYLHET|RAJSHAHI|KHULNA|BARISHAL|RANGPUR|MYMENSINGH)\s*(?:METRO)?\s*[-_]?\s*([A-Z]{1,2})\s*[-_]?\s*(\d{2})[-_]?(\d{4})\b/);
  if (regMatch) {
    registrationNumber = `${regMatch[1]} METRO ${regMatch[2]} ${regMatch[3]}-${regMatch[4]}`;
    confidence = "high";
  }

  // 5. Extract CC / Cubic Capacity
  const ccMatch = combined.match(/\b(\d{3,4})\s*(?:CC|CM3|CUBIC)\b/);
  if (ccMatch && ccMatch[1]) {
    cubicCapacity = `${ccMatch[1]} cc`;
  }

  // 6. Extract Fuel Type
  if (combined.includes("OCTANE")) fuelType = "Octane";
  else if (combined.includes("HYBRID")) fuelType = "Hybrid / Octane";
  else if (combined.includes("DIESEL")) fuelType = "Diesel";
  else if (combined.includes("PETROL")) fuelType = "Petrol";
  else if (combined.includes("CNG")) fuelType = "CNG";
  else if (combined.includes("LPG")) fuelType = "LPG";
  else if (combined.includes("ELECTRIC") || combined.includes(" EV ")) fuelType = "Electric";

  // 7. Extract Manufacturing Year
  const yearMatch = combined.match(/(?:MFG|YEAR|MODEL)\s*(?:OF\s*MFG)?[:\s._-]*(20\d{2}|19\d{2})/);
  if (yearMatch && yearMatch[1]) {
    manufacturingYear = parseInt(yearMatch[1], 10);
  }

  // 8. Extract Color
  const colors = ["WINE RED", "BLACK", "WHITE", "PEARL", "SILVER", "GREY", "GRAY", "BLUE", "GREEN", "RED", "GOLD", "BRONZE"];
  for (const c of colors) {
    if (combined.includes(c)) {
      color = c.charAt(0) + c.slice(1).toLowerCase();
      break;
    }
  }

  // 9. Extract Document Number
  const docNoMatch = combined.match(/(?:TOKEN|CERTIFICATE|REG|DOC|CARD)\s*(?:NO|NUMBER)?[:\s._-]*([A-Z0-9-]{6,16})/);
  if (docNoMatch && docNoMatch[1]) {
    documentNumber = docNoMatch[1];
  }

  // 10. Extract Expiry Date
  const expMatch = combined.match(/(?:EXP|EXPIRY|VALIDITY|DUE)[:\s._-]*(\d{4}[-_]\d{2}[-_]\d{2})/);
  if (expMatch && expMatch[1]) {
    expiryDate = expMatch[1].replace(/_/g, "-");
  }

  const seats = combined.match(/(?:SEATING(?: CAPACITY)?|SEATS)[:\s]*(\d{1,2})\b/);
  if (seats) seatingCapacity = seats[1] + " Seats";
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (registrationNumber && currentVehicle?.registrationNumber && normalize(registrationNumber) !== normalize(currentVehicle.registrationNumber)) {
    throw new Error("This document belongs to a different registration. No specifications were applied.");
  }
  if (![engineNumber, chassisNumber, registrationNumber, cubicCapacity, fuelType, seatingCapacity, manufacturingYear, color, documentNumber, expiryDate].some(Boolean)) {
    throw new Error("No readable vehicle details found. Enter details manually or upload a plain-text document. Image/PDF OCR is not available.");
  }

  return {
    engineNumber,
    chassisNumber,
    registrationNumber,
    cubicCapacity,
    fuelType,
    seatingCapacity,
    manufacturingYear,
    color,
    documentNumber,
    expiryDate,
    detectedDocType,
    confidence,
  };
}
