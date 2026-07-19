
const express = require('express');
const { seedData, connectToDatabase } = require('./db')



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

// GET /vehicles (Collection) - MongoDB
router.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const vehicles = await db.collection('vehicles').find({}).toArray();
        res.status(200).json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});

// GET /vehicles/:vehicleId - MongoDB
router.get('/:vehicleId', async (req, res) => {
    try {
        const id = Number(req.params.vehicleId);
        const db = await connectToDatabase();
        
        const vehicle = await db.collection('vehicles').findOne({ id: id });

        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Get last ping from pings collection if it exists
        const lastPing = await db.collection('pings').findOne(
            { vehicle_id: id },
            { sort: { _id: -1 } }
        );

        res.status(200).json({
            ...vehicle,
            last_ping: lastPing || null
        });
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle' });
    }
});

// GET /vehicles/:vehicle-id/pings (Scoped collection) - MongoDB
router.get('/:vehicleId/pings', async (req, res) => {
    try {
        const id = Number(req.params.vehicleId);
        const db = await connectToDatabase();
        
        // First, verify the vehicle exists (to return 404 if it doesn't)
        const vehicle = await db.collection('vehicles').findOne({ id: id });
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Get pings that belong to this vehicle
        const vehiclePings = await db.collection('pings').find({ vehicle_id: id }).toArray();
        res.status(200).json(vehiclePings);
    } catch (error) {
        console.error('Error fetching vehicle pings:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle pings' });
    }
});

// GET /vehicles/:vehicle-id/last-position - MongoDB
router.get('/:vehicleId/last-position', async (req, res) => {
    try {
        const id = Number(req.params.vehicleId);
        const db = await connectToDatabase();

        // First, verify the vehicle exists (to return 404 if it doesn't)
        const vehicle = await db.collection('vehicles').findOne({ id: id });
        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        // Get the last ping for this vehicle
        const lastPing = await db.collection('pings').findOne(
            { vehicle_id: id },
            { sort: { _id: -1 } }
        );
        res.status(200).json(lastPing || null);
    } catch (error) {
        console.error('Error fetching last position:', error);
        res.status(500).json({ error: 'Failed to fetch last position' });
    }
});

// POST /vehicles/:vehicleId/pings (device ping ingestion, requires X-API-Key) - MongoDB
router.post('/:vehicleId/pings', async (req, res) => {
    try {
        const vehicleIdParam = req.params.vehicleId;
        const apiKey = req.get('X-API-Key');

        if (!apiKey) {
            return res.status(401).json({ error: "X-API-Key header is required" });
        }

        const numericVehicleId = resolveVehicleId(vehicleIdParam);
        const db = await connectToDatabase();
        const vehicle = numericVehicleId !== null
            && await db.collection('vehicles').findOne({ id: numericVehicleId });

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

        // Get next id
        const lastPing = await db.collection('pings').findOne({}, { sort: { id: -1 } });
        const nextId = lastPing ? lastPing.id + 1 : 1;
        
        const newPing = {
            id: nextId,
            vehicle_id: vehicle.id,
            latitude,
            longitude,
            speed_kmh: speed,
            timestamp: new Date().toISOString()
        };
        
        await db.collection('pings').insertOne(newPing);

        res
            .status(201)
            .set('Location', `${req.baseUrl}/${vehicleIdParam}/pings/${newPing.id}`)
            .set('ETag', `"${newPing.id}"`)
            .set('Last-Modified', new Date(newPing.timestamp).toUTCString())
            .json(newPing);
    } catch (error) {
        console.error('Error creating ping:', error);
        res.status(500).json({ error: 'Failed to create ping' });
    }
});

// GET /vehicles/:vehicleId/pings/:pingId - MongoDB
router.get('/:vehicleId/pings/:pingId', async (req, res) => {
    try {
        const numericVehicleId = resolveVehicleId(req.params.vehicleId);
        const db = await connectToDatabase();
        const vehicle = numericVehicleId !== null
            && await db.collection('vehicles').findOne({ id: numericVehicleId });

        if (!vehicle) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        const pingId = Number(req.params.pingId);
        const ping = await db.collection('pings').findOne({ id: pingId, vehicle_id: vehicle.id });

        if (!ping) {
            return res.status(404).json({ error: "Ping not found" });
        }

        res.status(200).json(ping);
    } catch (error) {
        console.error('Error fetching ping:', error);
        res.status(500).json({ error: 'Failed to fetch ping' });
    }
});


module.exports = router