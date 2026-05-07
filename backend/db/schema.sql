-- BPR Manufacturing Platform - Database Schema

CREATE TABLE IF NOT EXISTS plants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT DEFAULT 'factory' CHECK(type IN ('factory','warehouse','distribution')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','production_manager','purchase_team','warehouse_team','supplier','plant_head','ceo')),
  plant_id INTEGER,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  lead_time_days INTEGER DEFAULT 7,
  total_deliveries INTEGER DEFAULT 0,
  delayed_deliveries INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  plant_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  plant_id INTEGER NOT NULL,
  on_hand INTEGER DEFAULT 0,
  incoming_orders INTEGER DEFAULT 0,
  reserved_demand INTEGER DEFAULT 0,
  buffer_size INTEGER DEFAULT 100,
  reorder_level INTEGER DEFAULT 30,
  safety_stock INTEGER DEFAULT 20,
  daily_consumption REAL DEFAULT 5.0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plant_id INTEGER NOT NULL,
  type TEXT,
  capacity_per_hour REAL DEFAULT 100,
  current_load REAL DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK(status IN ('running','idle','maintenance','breakdown')),
  utilization_pct REAL DEFAULT 0,
  last_maintenance DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER,
  quantity INTEGER NOT NULL,
  order_date DATE NOT NULL,
  due_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','shipped','delivered','delayed','cancelled')),
  type TEXT DEFAULT 'purchase' CHECK(type IN ('purchase','sales','transfer')),
  plant_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS production_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  machine_id INTEGER NOT NULL,
  plant_id INTEGER NOT NULL,
  planned_qty INTEGER DEFAULT 0,
  actual_qty INTEGER DEFAULT 0,
  scheduled_date DATE NOT NULL,
  shift TEXT DEFAULT 'day' CHECK(shift IN ('day','night','general')),
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','delayed','cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

CREATE TABLE IF NOT EXISTS demand_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  date DATE NOT NULL,
  quantity REAL NOT NULL,
  season TEXT,
  is_spike INTEGER DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('bpr_red','bpr_yellow','supplier_risk','bottleneck','demand_spike','stockout','overstock','machine_down','general')),
  severity TEXT NOT NULL CHECK(severity IN ('critical','warning','info')),
  message TEXT NOT NULL,
  recommendation TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  plant_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_by INTEGER,
  acknowledged_at DATETIME,
  FOREIGN KEY (plant_id) REFERENCES plants(id),
  FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  supplier_id INTEGER,
  batch_number TEXT NOT NULL,
  lot_number TEXT,
  machine_id INTEGER,
  operator_name TEXT,
  quantity INTEGER DEFAULT 0,
  plant_id INTEGER,
  production_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','consumed','recalled','expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (plant_id) REFERENCES plants(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_plant ON inventory(plant_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_demand_history_product ON demand_history(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_plant ON alerts(plant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
