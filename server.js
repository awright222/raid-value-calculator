import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Admin password from environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
app.use(cors());
app.use(express.json());

// Simple session storage (in production, use Redis or proper session store)
const sessions = new Map();

// Generate session token
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  
  next();
}

// Initialize database
const db = new Database('packs.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    energy_pots INTEGER DEFAULT 0,
    raw_energy INTEGER DEFAULT 0,
    total_energy INTEGER NOT NULL,
    cost_per_energy REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some sample data if table is empty
const count = db.prepare('SELECT COUNT(*) as count FROM packs').get();
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO packs (name, price, energy_pots, raw_energy, total_energy, cost_per_energy)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const samplePacks = [
    { name: 'Starter Energy Pack', price: 4.99, energy_pots: 3, raw_energy: 200, total_energy: 590, cost_per_energy: 0.00846 },
    { name: 'Value Energy Bundle', price: 9.99, energy_pots: 7, raw_energy: 975, total_energy: 1885, cost_per_energy: 0.00530 },
    { name: 'Premium Energy Pack', price: 14.99, energy_pots: 9, raw_energy: 1650, total_energy: 2820, cost_per_energy: 0.00532 },
    { name: 'Mega Energy Bundle', price: 24.99, energy_pots: 15, raw_energy: 2500, total_energy: 4450, cost_per_energy: 0.00561 },
  ];
  
  samplePacks.forEach(pack => {
    insert.run(pack.name, pack.price, pack.energy_pots, pack.raw_energy, pack.total_energy, pack.cost_per_energy);
  });
}

// Helper function to calculate total energy
function calculateTotalEnergy(energyPots, rawEnergy) {
  return (energyPots * 130) + rawEnergy;
}

// Helper function to calculate grade based on cost per energy
function calculateGrade(costPerEnergy, allPacks) {
  const costs = allPacks.map(pack => pack.cost_per_energy).sort((a, b) => a - b);
  const percentile = costs.findIndex(cost => cost >= costPerEnergy) / costs.length;
  
  if (percentile <= 0.1) return 'S';
  if (percentile <= 0.3) return 'A';
  if (percentile <= 0.6) return 'B';
  if (percentile <= 0.8) return 'C';
  return 'D';
}

// Routes

// Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
      const token = generateSessionToken();
      sessions.set(token, { loginTime: Date.now() });
      
      res.json({ 
        success: true, 
        token,
        message: 'Admin login successful' 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid password' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      sessions.delete(token);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check admin status
app.get('/api/admin/status', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    const isAuthenticated = token && sessions.has(token);
    
    res.json({ 
      isAuthenticated,
      adminMode: true // This endpoint always indicates admin mode is available
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/packs', (req, res) => {
  try {
    const packs = db.prepare('SELECT * FROM packs ORDER BY cost_per_energy ASC').all();
    res.json(packs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/packs', requireAdmin, (req, res) => {
  try {
    const { name, price, energy_pots = 0, raw_energy = 0 } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    
    const totalEnergy = calculateTotalEnergy(energy_pots, raw_energy);
    const costPerEnergy = price / totalEnergy;
    
    const insert = db.prepare(`
      INSERT INTO packs (name, price, energy_pots, raw_energy, total_energy, cost_per_energy)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(name, price, energy_pots, raw_energy, totalEnergy, costPerEnergy);
    
    res.json({
      id: result.lastInsertRowid,
      name,
      price,
      energy_pots,
      raw_energy,
      total_energy: totalEnergy,
      cost_per_energy: costPerEnergy
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze', (req, res) => {
  try {
    const { price, energy_pots = 0, raw_energy = 0 } = req.body;
    
    if (!price) {
      return res.status(400).json({ error: 'Price is required' });
    }
    
    const totalEnergy = calculateTotalEnergy(energy_pots, raw_energy);
    const costPerEnergy = price / totalEnergy;
    
    // Get all packs for comparison
    const allPacks = db.prepare('SELECT * FROM packs').all();
    const grade = calculateGrade(costPerEnergy, allPacks);
    
    // Find similar packs
    const similarPacks = allPacks
      .filter(pack => Math.abs(pack.cost_per_energy - costPerEnergy) < 0.002)
      .slice(0, 3);
    
    res.json({
      total_energy: totalEnergy,
      cost_per_energy: costPerEnergy,
      grade,
      similar_packs: similarPacks,
      comparison: {
        better_than_percent: Math.round((1 - (allPacks.filter(pack => pack.cost_per_energy < costPerEnergy).length / allPacks.length)) * 100),
        total_packs_compared: allPacks.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
