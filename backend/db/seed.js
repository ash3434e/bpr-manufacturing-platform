// Database Seed Script - Generates realistic manufacturing sample data
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { initDb, dbRun, dbAll, closeDb } = require('./init');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDb();

  // Clear existing data AND reset autoincrement counters
  const tables = ['batches', 'audit_log', 'alerts', 'demand_history', 'production_schedule', 'orders', 'machines', 'inventory', 'products', 'suppliers', 'users', 'plants'];
  tables.forEach(t => dbRun(`DELETE FROM ${t}`));
  // Reset autoincrement so IDs start from 1 — critical for FK relationships
  try { dbRun(`DELETE FROM sqlite_sequence`); } catch(e) { /* table may not exist */ }

  // === PLANTS ===
  const plants = [
    ['Pune Manufacturing Unit', 'Pune, Maharashtra', 'factory'],
    ['Chennai Production Hub', 'Chennai, Tamil Nadu', 'factory'],
    ['Mumbai Distribution Center', 'Mumbai, Maharashtra', 'warehouse']
  ];
  plants.forEach(p => dbRun('INSERT INTO plants (name, location, type) VALUES (?, ?, ?)', p));

  // === USERS ===
  const hash = bcrypt.hashSync('password123', 10);
  const users = [
    ['admin', hash, 'System Administrator', 'admin', null, 'admin@bprmanuf.com'],
    ['prod_manager', hash, 'Rajesh Sharma', 'production_manager', 1, 'rajesh@bprmanuf.com'],
    ['purchase_lead', hash, 'Priya Patel', 'purchase_team', 1, 'priya@bprmanuf.com'],
    ['warehouse_mgr', hash, 'Suresh Kumar', 'warehouse_team', 3, 'suresh@bprmanuf.com'],
    ['plant_head_pune', hash, 'Anand Deshmukh', 'plant_head', 1, 'anand@bprmanuf.com'],
    ['plant_head_chennai', hash, 'Karthik Rajan', 'plant_head', 2, 'karthik@bprmanuf.com'],
    ['ceo', hash, 'Vikram Mehta', 'ceo', null, 'vikram@bprmanuf.com']
  ];
  users.forEach(u => dbRun('INSERT INTO users (username, password_hash, full_name, role, plant_id, email) VALUES (?,?,?,?,?,?)', u));

  // === SUPPLIERS ===
  const suppliers = [
    ['Tata Steel Supply', 'Arun Tiwari', 'arun@tatasteel.com', '+91-9876543210', 'Jamshedpur', 5, 120, 8, 'active'],
    ['Reliance Polymers', 'Meena Gupta', 'meena@reliancepoly.com', '+91-9876543211', 'Vadodara', 7, 95, 22, 'active'],
    ['Bharat Electronics', 'Sanjay Rao', 'sanjay@bel.com', '+91-9876543212', 'Bangalore', 10, 80, 5, 'active'],
    ['Hindustan Copper', 'Deepak Joshi', 'deepak@hincopper.com', '+91-9876543213', 'Kolkata', 8, 60, 18, 'active'],
    ['JSW Steel Traders', 'Ravi Desai', 'ravi@jswsteel.com', '+91-9876543214', 'Bellary', 6, 110, 12, 'active'],
    ['Mahindra Components', 'Kavita Nair', 'kavita@mahindra.com', '+91-9876543215', 'Nashik', 4, 150, 6, 'active'],
    ['Asian Paints Raw Mat.', 'Nitin Shah', 'nitin@asianpaints.com', '+91-9876543216', 'Ankleshwar', 3, 200, 30, 'active'],
    ['Godrej Precision Eng.', 'Amita Kulkarni', 'amita@godrej.com', '+91-9876543217', 'Mumbai', 12, 45, 15, 'suspended']
  ];
  suppliers.forEach(s => dbRun('INSERT INTO suppliers (name, contact_person, email, phone, location, lead_time_days, total_deliveries, delayed_deliveries, status) VALUES (?,?,?,?,?,?,?,?,?)', s));

  // === PRODUCTS ===
  const products = [
    ['Steel Shaft Assembly', 'SSA-001', 'Assemblies', 'pcs', 1],
    ['Copper Wire Harness', 'CWH-002', 'Components', 'meters', 1],
    ['Polymer Housing Unit', 'PHU-003', 'Components', 'pcs', 1],
    ['Electronic Control Board', 'ECB-004', 'Electronics', 'pcs', 1],
    ['Bearing Assembly SK-200', 'BAS-005', 'Assemblies', 'pcs', 1],
    ['Rubber Gasket Set', 'RGS-006', 'Consumables', 'sets', 1],
    ['Aluminum Frame Type-A', 'AFT-007', 'Frames', 'pcs', 2],
    ['Stainless Steel Bolt M10', 'SSB-008', 'Fasteners', 'kg', 2],
    ['Hydraulic Cylinder HC-50', 'HCY-009', 'Hydraulics', 'pcs', 2],
    ['Paint Primer PX-100', 'PPX-010', 'Consumables', 'liters', 2],
    ['Gearbox Assembly GB-30', 'GBA-011', 'Assemblies', 'pcs', 2],
    ['Finished Motor Unit FM-1', 'FMU-012', 'Finished Goods', 'pcs', 3],
    ['Packaged Pump Set PS-5', 'PPS-013', 'Finished Goods', 'pcs', 3],
    ['Spare Parts Kit SPK-A', 'SPK-014', 'Spares', 'kits', 3]
  ];
  products.forEach(p => dbRun('INSERT INTO products (name, sku, category, unit, plant_id) VALUES (?,?,?,?,?)', p));

  // === INVENTORY ===
  const inventoryData = [
    [1, 1, 180, 50, 30, 300, 90, 60, 15],
    [2, 1, 40, 20, 50, 200, 60, 40, 12],
    [3, 1, 80, 30, 40, 200, 60, 40, 8],
    [4, 1, 15, 10, 20, 150, 45, 30, 10],
    [5, 1, 120, 40, 20, 250, 75, 50, 7],
    [6, 1, 50, 15, 40, 150, 45, 30, 9],
    [7, 2, 200, 60, 25, 400, 120, 80, 18],
    [8, 2, 30, 10, 35, 100, 30, 20, 14],
    [9, 2, 60, 20, 30, 150, 45, 30, 6],
    [10, 2, 25, 5, 20, 80, 24, 16, 11],
    [11, 2, 90, 35, 15, 200, 60, 40, 5],
    [12, 3, 300, 100, 50, 500, 150, 100, 20],
    [13, 3, 70, 20, 60, 200, 60, 40, 15],
    [14, 3, 20, 5, 30, 100, 30, 20, 8]
  ];
  inventoryData.forEach(d => dbRun('INSERT INTO inventory (product_id, plant_id, on_hand, incoming_orders, reserved_demand, buffer_size, reorder_level, safety_stock, daily_consumption) VALUES (?,?,?,?,?,?,?,?,?)', d));

  // === MACHINES ===
  const machines = [
    ['CNC Lathe CL-01', 1, 'CNC', 100, 92, 'running', 92],
    ['Milling Machine MM-02', 1, 'Milling', 80, 45, 'running', 56],
    ['Assembly Robot AR-03', 1, 'Assembly', 120, 110, 'running', 91.7],
    ['Press Brake PB-04', 1, 'Pressing', 60, 58, 'running', 96.7],
    ['Welding Station WS-05', 1, 'Welding', 50, 30, 'maintenance', 60],
    ['CNC Lathe CL-06', 2, 'CNC', 100, 75, 'running', 75],
    ['Painting Line PL-07', 2, 'Painting', 90, 88, 'running', 97.8],
    ['Hydraulic Press HP-08', 2, 'Pressing', 70, 42, 'running', 60],
    ['Assembly Line AL-09', 2, 'Assembly', 150, 130, 'running', 86.7],
    ['Quality Check QC-10', 2, 'Inspection', 200, 100, 'running', 50]
  ];
  machines.forEach(m => dbRun('INSERT INTO machines (name, plant_id, type, capacity_per_hour, current_load, status, utilization_pct) VALUES (?,?,?,?,?,?,?)', m));

  // === ORDERS ===
  const orderData = [
    [1, 1, 100, dateOffset(-20), dateOffset(-10), dateOffset(-9), 'delivered', 'purchase', 1],
    [1, 5, 150, dateOffset(-5), dateOffset(5), null, 'shipped', 'purchase', 1],
    [2, 4, 80, dateOffset(-15), dateOffset(-5), dateOffset(-2), 'delivered', 'purchase', 1],
    [2, 4, 120, dateOffset(-3), dateOffset(7), null, 'confirmed', 'purchase', 1],
    [3, 2, 60, dateOffset(-10), dateOffset(-3), dateOffset(0), 'delayed', 'purchase', 1],
    [4, 3, 50, dateOffset(-8), dateOffset(2), null, 'shipped', 'purchase', 1],
    [7, 1, 200, dateOffset(-12), dateOffset(-2), dateOffset(-1), 'delivered', 'purchase', 2],
    [8, 5, 100, dateOffset(-4), dateOffset(6), null, 'confirmed', 'purchase', 2],
    [9, 6, 40, dateOffset(-7), dateOffset(3), null, 'shipped', 'purchase', 2],
    [10, 7, 50, dateOffset(-6), dateOffset(4), null, 'delayed', 'purchase', 2],
    [12, null, 80, dateOffset(-2), dateOffset(8), null, 'pending', 'sales', 3],
    [13, null, 60, dateOffset(-1), dateOffset(10), null, 'confirmed', 'sales', 3],
  ];
  orderData.forEach(d => dbRun('INSERT INTO orders (product_id, supplier_id, quantity, order_date, due_date, delivery_date, status, type, plant_id) VALUES (?,?,?,?,?,?,?,?,?)', d));

  // === PRODUCTION SCHEDULE ===
  const prodData = [
    [1, 1, 1, 100, 95, dateOffset(0), 'day', 'in_progress'],
    [1, 3, 1, 80, 0, dateOffset(1), 'day', 'scheduled'],
    [2, 2, 1, 60, 60, dateOffset(-1), 'day', 'completed'],
    [3, 4, 1, 40, 38, dateOffset(0), 'night', 'in_progress'],
    [5, 1, 1, 50, 0, dateOffset(2), 'day', 'scheduled'],
    [7, 6, 2, 120, 115, dateOffset(0), 'day', 'in_progress'],
    [8, 8, 2, 80, 0, dateOffset(1), 'day', 'scheduled'],
    [9, 9, 2, 60, 55, dateOffset(0), 'night', 'in_progress'],
    [11, 9, 2, 40, 0, dateOffset(2), 'general', 'scheduled'],
  ];
  prodData.forEach(d => dbRun('INSERT INTO production_schedule (product_id, machine_id, plant_id, planned_qty, actual_qty, scheduled_date, shift, status) VALUES (?,?,?,?,?,?,?,?)', d));

  // === DEMAND HISTORY (90 days) ===
  const majorProducts = [1, 2, 3, 4, 7, 8, 12, 13];
  majorProducts.forEach(pid => {
    const baseQty = 30 + Math.floor(Math.random() * 50);
    for (let d = 90; d >= 0; d--) {
      const date = dateOffset(-d);
      const seasonal = Math.sin(d / 15) * 10;
      const random = (Math.random() - 0.5) * 20;
      const isSpike = Math.random() < 0.05;
      const spike = isSpike ? baseQty * 0.5 : 0;
      const qty = Math.max(5, Math.round(baseQty + seasonal + random + spike));
      const month = new Date(date).getMonth();
      const season = month <= 1 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
      dbRun('INSERT INTO demand_history (product_id, date, quantity, season, is_spike) VALUES (?,?,?,?,?)', [pid, date, qty, season, isSpike ? 1 : 0]);
    }
  });

  // === ALERTS ===
  const alertsData = [
    ['bpr_red', 'critical', 'Copper Wire Harness (CWH-002) has entered Red Zone — BPR at 85%', 'Increase purchase order quantity immediately. Contact supplier Hindustan Copper.', 'product', 2, 1],
    ['bpr_red', 'critical', 'Electronic Control Board (ECB-004) buffer critically low — BPR at 90%', 'Emergency procurement needed. Check alternate supplier Bharat Electronics.', 'product', 4, 1],
    ['bpr_yellow', 'warning', 'Polymer Housing Unit (PHU-003) approaching Yellow Zone — BPR at 55%', 'Monitor closely. Consider placing advance order with Reliance Polymers.', 'product', 3, 1],
    ['supplier_risk', 'warning', 'Supplier Reliance Polymers — risk score 23.2%. Multiple delivery delays.', 'Evaluate alternate suppliers. Consider Mahindra Components as backup.', 'supplier', 2, null],
    ['supplier_risk', 'critical', 'Supplier Godrej Precision Eng. suspended — risk score 33.3%', 'Supplier suspended due to quality issues. Redistribute orders.', 'supplier', 8, null],
    ['bottleneck', 'critical', 'Press Brake PB-04 utilization at 96.7% — critical bottleneck', 'Consider overtime, load redistribution, or capacity expansion.', 'machine', 4, 1],
    ['bottleneck', 'critical', 'Painting Line PL-07 utilization at 97.8% — critical bottleneck', 'Reduce painting lot size or add parallel painting capacity.', 'machine', 7, 2],
    ['demand_spike', 'warning', 'Demand for Steel Shaft Assembly expected to increase 20% next week', 'Pre-build safety stock. Confirm raw material availability.', 'product', 1, 1],
    ['bpr_red', 'critical', 'Stainless Steel Bolt M10 (SSB-008) Red Zone — BPR 95%', 'Urgent reorder needed from JSW Steel Traders.', 'product', 8, 2],
    ['overstock', 'info', 'Finished Motor Unit FM-1 stock above optimal — consider reducing production', 'Current stock covers 17+ days. Reduce production by 20%.', 'product', 12, 3],
  ];
  alertsData.forEach(a => dbRun('INSERT INTO alerts (type, severity, message, recommendation, entity_type, entity_id, plant_id) VALUES (?,?,?,?,?,?,?)', a));

  // === BATCHES (expanded for Traceability demo) ===
  const batchData = [
    [1, 1, 'BATCH-SSA-2026-001', 'LOT-A1001', 1, 'Ramesh Patil', 100, 1, dateOffset(-30), 'consumed'],
    [1, 5, 'BATCH-SSA-2026-002', 'LOT-A1002', 3, 'Sunil Jadhav', 80, 1, dateOffset(-20), 'consumed'],
    [1, 1, 'BATCH-SSA-2026-003', 'LOT-A1003', 1, 'Ramesh Patil', 120, 1, dateOffset(-5), 'active'],
    [2, 4, 'BATCH-CWH-2026-001', 'LOT-B2001', 2, 'Anil Sawant', 200, 1, dateOffset(-25), 'consumed'],
    [2, 4, 'BATCH-CWH-2026-002', 'LOT-B2002', 2, 'Anil Sawant', 150, 1, dateOffset(-3), 'active'],
    [3, 2, 'BATCH-PHU-2026-001', 'LOT-C1001', 4, 'Sachin Wagh', 90, 1, dateOffset(-15), 'active'],
    [4, 3, 'BATCH-ECB-2026-001', 'LOT-D1001', 3, 'Pradeep Naik', 50, 1, dateOffset(-8), 'active'],
    [5, 6, 'BATCH-BAS-2026-001', 'LOT-E1001', 1, 'Ganesh More', 60, 1, dateOffset(-12), 'consumed'],
    [7, 1, 'BATCH-AFT-2026-001', 'LOT-F1001', 6, 'Muthu Krishnan', 150, 2, dateOffset(-18), 'consumed'],
    [7, 5, 'BATCH-AFT-2026-002', 'LOT-F1002', 6, 'Muthu Krishnan', 200, 2, dateOffset(-4), 'active'],
    [9, 6, 'BATCH-HCY-2026-001', 'LOT-G1001', 8, 'Arjun Reddy', 40, 2, dateOffset(-7), 'active'],
    [11, 1, 'BATCH-GBA-2026-001', 'LOT-H1001', 9, 'Kiran Yadav', 90, 2, dateOffset(-10), 'active'],
    [12, null, 'BATCH-FMU-2026-001', 'LOT-J1001', null, 'Vinod Sharma', 300, 3, dateOffset(-14), 'active'],
    [13, null, 'BATCH-PPS-2026-001', 'LOT-K1001', null, 'Manoj Tiwari', 60, 3, dateOffset(-6), 'active'],
    [6, 7, 'BATCH-RGS-2026-001', 'LOT-L1001', 4, 'Suresh Bhosale', 50, 1, dateOffset(-40), 'expired'],
  ];
  batchData.forEach(b => dbRun('INSERT INTO batches (product_id, supplier_id, batch_number, lot_number, machine_id, operator_name, quantity, plant_id, production_date, status) VALUES (?,?,?,?,?,?,?,?,?,?)', b));

  // === AUDIT LOG (for Audit Trail page demo) ===
  const auditData = [
    [1, 'login', null, null, 'User admin logged in', dateOffset(-5)],
    [2, 'login', null, null, 'User prod_manager logged in', dateOffset(-5)],
    [1, 'create_order', 'order', 1, '{"product":"Steel Shaft Assembly","qty":100,"supplier":"Tata Steel Supply"}', dateOffset(-4)],
    [2, 'update_schedule', 'production', 1, '{"product":"Steel Shaft Assembly","machine":"CNC Lathe CL-01","shift":"day"}', dateOffset(-4)],
    [3, 'create_order', 'order', 4, '{"product":"Copper Wire Harness","qty":120,"supplier":"Hindustan Copper"}', dateOffset(-3)],
    [1, 'acknowledge_alert', 'alert', 1, '{"alert":"BPR Red Zone - Copper Wire Harness","action":"acknowledged"}', dateOffset(-3)],
    [4, 'update_inventory', 'inventory', 12, '{"product":"Finished Motor Unit","adjustment":"+50 pcs","reason":"Production completed"}', dateOffset(-2)],
    [2, 'emergency_purchase', 'order', 6, '{"product":"Electronic Control Board","qty":50,"supplier":"Bharat Electronics","reason":"Red zone emergency"}', dateOffset(-2)],
    [1, 'update_supplier', 'supplier', 8, '{"supplier":"Godrej Precision Eng.","status_change":"active → suspended","reason":"Quality issues"}', dateOffset(-2)],
    [5, 'login', null, null, 'User plant_head_pune logged in', dateOffset(-1)],
    [7, 'login', null, null, 'User ceo logged in', dateOffset(-1)],
    [7, 'export_data', null, null, '{"type":"inventory_report","format":"CSV","scope":"all_plants"}', dateOffset(-1)],
    [2, 'create_batch', 'batch', 3, '{"batch":"BATCH-SSA-2026-003","product":"Steel Shaft Assembly","qty":120}', dateOffset(-1)],
    [1, 'escalation', 'alert', 9, '{"message":"SSB-008 Red Zone critical","priority":"high","escalated_to":"plant_head"}', dateOffset(0)],
    [1, 'login', null, null, 'User admin logged in', dateOffset(0)],
  ];
  auditData.forEach(a => dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, timestamp) VALUES (?,?,?,?,?,?)', a));

  console.log('Database seeded successfully!');
  console.log('  - 3 plants, 7 users, 8 suppliers, 14 products');
  console.log('  - 14 inventory records, 10 machines, 12 orders');
  console.log('  - 90 days demand history, 10 alerts, 15 batches, 15 audit entries');
  console.log('\nDefault credentials:');
  console.log('  Username: admin / prod_manager / purchase_lead / warehouse_mgr / ceo');
  console.log('  Password: password123');
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

if (require.main === module) {
  seed().then(() => closeDb()).catch(console.error);
}

module.exports = { seed };
