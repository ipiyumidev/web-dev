
const express = require('express');
const {seedData} = require('./db')



const router = express.Router();

// Synthetic per-device API keys derived from the seeded vehicles, e.g. 'v-01' -> 'key_v01'
const deviceKeys = {};
seedData.vehicles.forEach(v => {
    const key = `v-${String(v.id).padStart(2, '0')}`;
    deviceKeys[key] = `key_${key.replace('-', '')}`;
});

function resolveVehicleId(vehicleIdParam) {
    const match = /^v-(\d+)$/.exec(vehicleIdParam);
    return match ? parseInt(match[1], 10) : null;
}



// ---------------------------------------------------------
// 4. Vehicles
// ---------------------------------------------------------

// GET /vehicles (Collection)
router.get('/', (req, res) => {
    res.status(200).json(seedData.vehicles);
});

// GET /vehicles/:vehicleId
router.get('/:vehicleId', (req, res) => {
    const id = Number(req.params.vehicleId);

    const vehicle = seedData.vehicles.find(v => v.id === id);

    if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehiclePings = seedData.pings.filter(p => p.vehicle_id === id);
    const lastPing = vehiclePings.length > 0
        ? vehiclePings[vehiclePings.length - 1]
        : null;

    res.status(200).json({
        ...vehicle,
        last_ping: lastPing
    });
});

// GET /vehicles/:vehicle-id/pings (Scoped collection)
router.get('/:vehicleId/pings', (req, res) => {
    const id = req.params.vehicleId;
    
    // First, verify the vehicle exists (to return 404 if it doesn't)
    const vehicle = seedData.vehicles.find(v => v.id == id);
    if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

    // Filter pings that belong strictly to this vehicle
    const vehiclePings = seedData.pings.filter(ping => ping.vehicle_id == id);
    res.status(200).json(vehiclePings);
});

// GET /vehicles/:vehicle-id/last-position
router.get('/:vehicleId/last-position', (req, res) => {
    const id = req.params.vehicleId;

    // First, verify the vehicle exists (to return 404 if it doesn't)
    const vehicle = seedData.vehicles.find(v => v.id == id);
    if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

    // Filter pings that belong strictly to this vehicle
    const vehiclePings = seedData.pings.filter(ping => ping.vehicle_id == id);
    res.status(200).json(vehiclePings);
});

// POST /vehicles/:vehicleId/pings (device ping ingestion, requires X-API-Key)
router.post('/:vehicleId/pings', (req, res) => {
    const vehicleIdParam = req.params.vehicleId;
    const apiKey = req.get('X-API-Key');

    if (!apiKey) {
        return res.status(401).json({ error: "X-API-Key header is required" });
    }

    const numericVehicleId = resolveVehicleId(vehicleIdParam);
    const vehicle = numericVehicleId !== null
        && seedData.vehicles.find(v => v.id === numericVehicleId);

    if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

    if (deviceKeys[vehicleIdParam] !== apiKey) {
        return res.status(403).json({ error: "API key does not match this vehicle" });
    }

    const { latitude, longitude, speed } = req.body || {};
    if (latitude === undefined || longitude === undefined || speed === undefined) {
        return res.status(400).json({ error: "latitude, longitude, and speed are required" });
    }

    const nextId = seedData.pings.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const newPing = {
        id: nextId,
        vehicle_id: vehicle.id,
        latitude,
        longitude,
        speed_kmh: speed,
        timestamp: new Date().toISOString()
    };
    seedData.pings.push(newPing);

    res
        .status(201)
        .set('Location', `${req.baseUrl}/${vehicleIdParam}/pings/${newPing.id}`)
        .set('ETag', `"${newPing.id}"`)
        .set('Last-Modified', new Date(newPing.timestamp).toUTCString())
        .json(newPing);
});

// GET /vehicles/:vehicleId/pings/:pingId
router.get('/:vehicleId/pings/:pingId', (req, res) => {
    const numericVehicleId = resolveVehicleId(req.params.vehicleId);
    const vehicle = numericVehicleId !== null
        && seedData.vehicles.find(v => v.id === numericVehicleId);

    if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

    const pingId = Number(req.params.pingId);
    const ping = seedData.pings.find(p => p.id === pingId && p.vehicle_id === vehicle.id);

    if (!ping) {
        return res.status(404).json({ error: "Ping not found" });
    }

    res.status(200).json(ping);
});


module.exports = router