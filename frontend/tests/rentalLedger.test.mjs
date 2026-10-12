import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRentalLedger, validateSchedule, monthsBetween, normalizeLegacyMonth } from '../src/utils/rentalLedger.ts';
import { parseMaintenanceReceipt } from '../src/utils/receiptParser.ts';
const tenant = { id: 'tenant', unit_id: 'flat', tenant_name: 'Test Tenant', start_month: '2026-01-01', end_month: null };
const rate = (id, from, to, rent, charges = []) => ({ id, tenancy_id: 'tenant', from_month: from, to_month: to, base_rent: rent, charges });
const rates = [rate('1', '2026-01', '2026-03', 20000), rate('2', '2026-04', '2026-06', 21000), rate('3', '2026-07', '2026-12', 25000)];
const payment = (month, amount, extra = {}) => ({ id: 'pay', tenancy_id: 'tenant', unit_id: 'flat', month, amount_paid: amount, voided_at: null, ...extra });
test('exact user example: historical rates give 273000 for the year', () => {
  const rows = buildRentalLedger([tenant], rates, [], '2026-01', '2026-12');
  assert.deepEqual(rows.map(r => r.expected), [20000,20000,20000,21000,21000,21000,25000,25000,25000,25000,25000,25000]);
  assert.equal(rows.reduce((sum, row) => sum + row.expected, 0), 273000);
  const increased = rates.map(r => r.id === '3' ? {...r, base_rent: 30000} : r);
  assert.equal(buildRentalLedger([tenant], increased, [], '2026-01', '2026-01')[0].expected, 20000);
});
test('breakdown, partial payment, advance payment, credit and voided records', () => {
  const schedules = [rate('1', '2026-01', null, 20000, [{label:'Service',amount:2000},{label:'Gas',amount:1500},{label:'Electricity',amount:2500}])];
  const rows = buildRentalLedger([tenant], schedules, [payment('2026-01',10000),payment('2026-01',2000,{voided_at:'2026-02-01'}),payment('2026-02',27000),payment('2026-04',26000)], '2026-01','2026-04','2026-02');
  assert.equal(rows[0].expected,26000); assert.equal(rows[0].outstanding,16000); assert.equal(rows[0].status,'Partial');
  assert.equal(rows[1].status,'Paid'); assert.equal(rows[1].credit,1000); assert.equal(rows[2].status,'Upcoming'); assert.equal(rows[3].status,'Paid');
});
test('missing rates stay unknown, periods cannot overlap, and tenant boundaries are inclusive', () => {
  assert.throws(() => validateSchedule(rate('4','2026-03','2026-04',22000),rates),/overlap/);
  assert.throws(() => buildRentalLedger([tenant],[...rates,rate('4','2026-03','2026-04',22000)],[],'2026-01','2026-12'),/Overlapping/);
  const rows = buildRentalLedger([{...tenant,start_month:'2026-02-01',end_month:'2026-04-01'}],[],[],'2026-01','2026-12');
  assert.equal(rows.length,3); assert.equal(rows[0].expected,null); assert.equal(rows[0].status,'Rate missing');
});
test('legacy month labels, separate tenant payments and year boundaries', () => {
  assert.equal(normalizeLegacyMonth('January 2026'),'2026-01');
  assert.equal(buildRentalLedger([tenant],rates,[payment('January 2026',20000,{tenancy_id:null}),payment('2026-01',999,{tenancy_id:'other'})],'2026-01','2026-01')[0].received,20000);
  assert.deepEqual(monthsBetween('2025-12','2026-02'),['2025-12','2026-01','2026-02']);
  assert.throws(() => monthsBetween('2026-03','2026-02'));
  assert.throws(() => validateSchedule(rate('bad','2026-01',null,-1),[]));
});
test('receipt parsing uses explicit totals, not invoice numbers, dates or subtotals', () => {
  const receipt = parseMaintenanceReceipt('Vendor: Dhaka Plumbing\nInvoice 20261011\nDate: 11/10/2026\nSubtotal: 1200\nGrand Total: BDT 1,500.50');
  assert.equal(receipt.amount,1500.50); assert.equal(receipt.date,'2026-10-11'); assert.equal(receipt.vendor,'Dhaka Plumbing'); assert.equal(receipt.category,'Plumbing');
  assert.equal(parseMaintenanceReceipt('Invoice 12345\nSubtotal 1500').amount,undefined);
  assert.equal(parseMaintenanceReceipt('Total: 1500\nTotal: 1600').ambiguousTotal,true);
});
test('Bangla numbers and totals, invalid dates, and blank OCR do not invent amounts', () => {
  const receipt = parseMaintenanceReceipt('তারিখ: ১১/১০/২০২৬\nসর্বমোট: ২,৫০০ টাকা');
  assert.equal(receipt.amount,2500); assert.equal(receipt.date,'2026-10-11');
  assert.equal(parseMaintenanceReceipt('Date: 31/02/2026').date,undefined);
  assert.equal(parseMaintenanceReceipt('').amount,undefined);
});
