import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReport, reportCsv, sumMoney } from '../src/utils/assetReports.ts';
import { extractVehicleSpecsFromDocument } from '../src/utils/vehicleSpecs.ts';

const entry = (overrides = {}) => ({ id: '1', assetId: 'bike', asset: 'Bike', date: '2026-10-01', category: 'Fuel', description: '', income: 0, expense: 100, ...overrides });
test('report filters by inclusive dates and asset, then sums each recorded invoice once', () => {
  const report = calculateReport([entry(), entry({ id: '2', date: '2026-10-31', category: 'Servicing', expense: 1200 }), entry({ id: '3', date: '2026-09-30', expense: 500 }), entry({ id: '4', assetId: 'car', expense: 600 })], '2026-10-01', '2026-10-31', 'bike');
  assert.equal(report.rows.length, 2); assert.equal(report.expense, 1300); assert.equal(report.fuel, 100);
});
test('property cash income subtracts expenses and handles fractional currency', () => {
  const report = calculateReport([entry({ income: 10000.25, expense: 0 }), entry({ income: 4000, expense: 0 }), entry({ expense: 1250.10 })], '', '');
  assert.equal(report.net, 12750.15); assert.equal(sumMoney([0.1, 0.2]), 0.3);
});
test('invalid range and invalid amounts cannot silently generate reports', () => {
  assert.throws(() => calculateReport([], '2026-11-01', '2026-10-01'));
  assert.throws(() => calculateReport([entry({ expense: NaN })], '', ''));
  assert.equal(calculateReport([], '', '').expense, 0);
});
test('CSV escapes quoted multiline text and neutralizes spreadsheet formulas', () => {
  const csv = reportCsv([['=SUM(A1)', 'a,"b"\nc', -10]]);
  assert.ok(csv.includes('"\'=SUM(A1)"')); assert.ok(csv.includes('"a,""b""\nc"')); assert.ok(csv.includes('"-10"'));
});
test('bike extraction uses document content without fabricated missing identifiers', async () => {
  const result = await extractVehicleSpecsFromDocument(new File(['CC 155 cc\nSEATING CAPACITY: 2\nYEAR: 2026\nDHAKA METRO LA 68-2993'], 'bike.txt', { type: 'text/plain' }), { type: 'Bike', brand: 'Yamaha', registrationNumber: 'DHAKA METRO LA 68-2993' });
  assert.equal(result.cubicCapacity, '155 cc'); assert.equal(result.seatingCapacity, '2 Seats');
  assert.equal(result.engineNumber, undefined); assert.equal(result.chassisNumber, undefined);
});
test('missing bike specifications never fall back to car or model presets', async () => {
  const result = await extractVehicleSpecsFromDocument(new File(['YEAR: 2026'], '1496cc_5seats.txt', { type: 'text/plain' }), { type: 'Bike', brand: 'Yamaha' });
  assert.equal(result.cubicCapacity, undefined); assert.equal(result.seatingCapacity, undefined); assert.equal(result.fuelType, undefined);
});
test('unsupported scans, empty documents and other registrations are rejected', async () => {
  await assert.rejects(extractVehicleSpecsFromDocument(new File([''], 'bike.pdf', { type: 'application/pdf' })), /OCR/);
  await assert.rejects(extractVehicleSpecsFromDocument(new File([''], '1496cc.txt', { type: 'text/plain' })), /No readable/);
  await assert.rejects(extractVehicleSpecsFromDocument(new File(['DHAKA METRO GA 33-3617'], 'car.txt', { type: 'text/plain' }), { registrationNumber: 'DHAKA METRO LA 68-2993' }), /different registration/);
});
test('car documents cannot supply bike specifications even without a registration', async () => {
  await assert.rejects(extractVehicleSpecsFromDocument(new File(['VEHICLE TYPE: CAR\n1496 cc'], 'car.txt', { type: 'text/plain' }), { type: 'Bike' }), /vehicle type/);
});
test('complete engine identifiers are preserved and green paint is recognized', async () => {
  const result = await extractVehicleSpecsFromDocument(new File(['ENGINE NO: 1NZ-FE-1234567\nCOLOR: GREEN'], 'registration.txt', { type: 'text/plain' }));
  assert.equal(result.engineNumber, '1NZ-FE-1234567'); assert.equal(result.color, 'Green');
});
