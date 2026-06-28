const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Load seed data into memory at startup
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));

app.get('/', (req, res) => {
  res.json(dseedData.vehicles);
});

// GET /provinces - Get all provinces
app.get('/provinces', (req, res) => {
  res.json(seedData.provinces);
});

// GET /provinces/:provinceId - Get a specific province
app.get('/provinces/:provinceId', (req, res) => {
  const provinceId = parseInt(req.params.provinceId);
  const province = seedData.provinces.find(p => p.id === provinceId);
  
  if (!province) {
    return res.status(404).json({ error: 'Province not found' });
  }
  
  res.json(province);
});

// GET /districts - Get all districts
app.get('/districts', (req, res) => {
  res.json(seedData.districts);
});

// GET /districts/:districtId - Get a specific district
app.get('/districts/:districtId', (req, res) => {
  const districtId = parseInt(req.params.districtId);
  const district = seedData.districts.find(d => d.id === districtId);
  
  if (!district) {
    return res.status(404).json({ error: 'District not found' });
  }
  
  res.json(district);
});

// GET /stations - Get all stations
app.get('/stations', (req, res) => {
  res.json(seedData.stations);
});

// GET /stations/:stationId - Get a specific station
app.get('/stations/:stationId', (req, res) => {
  const stationId = parseInt(req.params.stationId);
  const station = seedData.stations.find(s => s.id === stationId);
  
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  
  res.json(station);
});

// GET /vehicles - Get all vehicles
app.get('/vehicles', (req, res) => {
  res.json(seedData.vehicles);
});

// GET /vehicles/:vehicleId - Get a specific vehicle
app.get('/vehicles/:vehicleId', (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);
  const vehicle = seedData.vehicles.find(v => v.id === vehicleId);
  
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  res.json(vehicle);
});

// GET /vehicles/:vehicleId/pings - Get all pings for a specific vehicle
app.get('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);
  const vehicle = seedData.vehicles.find(v => v.id === vehicleId);
  
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  const pings = seedData.pings.filter(p => p.vehicle_id === vehicleId);
  res.json(pings);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});