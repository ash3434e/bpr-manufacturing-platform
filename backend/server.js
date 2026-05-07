// BPR Manufacturing Platform - Express Server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDb, closeDb } = require('./db/init');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/dashboard', authenticate, require('./routes/dashboard'));
app.use('/api/inventory', authenticate, require('./routes/inventory'));
app.use('/api/suppliers', authenticate, require('./routes/suppliers'));
app.use('/api/production', authenticate, require('./routes/production'));
app.use('/api/forecast', authenticate, require('./routes/forecast'));
app.use('/api/alerts', authenticate, require('./routes/alerts'));
app.use('/api/traceability', authenticate, require('./routes/traceability'));
app.use('/api/audit', authenticate, require('./routes/audit'));
app.use('/api/scheduling', authenticate, require('./routes/scheduling'));
app.use('/api/manage', authenticate, require('./routes/manage'));
app.use('/api/emergency', authenticate, require('./routes/emergency'));
app.use('/api/export', authenticate, require('./routes/export'));
app.use('/api/users', authenticate, require('./routes/users'));

// Serve frontend static files for browser access (cross-device demo)
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  // SPA catch-all: serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDb();
  process.exit(0);
});

// Initialize database and start server
async function start() {
  await initDb();
  
  // Auto-seed if database is empty (e.g. fresh cloud deploy)
  try {
    const { dbGet } = require('./db/init');
    const userCount = dbGet('SELECT COUNT(*) as count FROM users');
    if (!userCount || userCount.count === 0) {
      console.log('Empty database detected. Auto-seeding demo data...');
      const { seed } = require('./db/seed');
      await seed();
      console.log('Auto-seed complete!');
    }
  } catch (e) {
    console.log('Auto-seed check:', e.message);
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏭 BPR Manufacturing Platform API`);
    console.log(`   Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    
    // Show LAN IP for cross-device access
    try {
      const os = require('os');
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`\n   📱 Cross-device access: http://${net.address}:${PORT}`);
          }
        }
      }
    } catch(e) {}
    
    console.log(`\n   Press Ctrl+C to stop\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
