
const express = require('express');
const {seedData} = require('./db')


const router = express.Router();



// ---------------------------------------------------------
// 5. Pings
// ---------------------------------------------------------

// GET /pings (Collection)
router.get('/', (req, res) => {
    res.status(200).json(seedData.pings);
});

// GET /pings/:pingId (Atomic member)
router.get('/:pingId', (req, res) => {
    const id = req.params.pingId;
    const ping = seedData.pings.find(p => p.id == id);

    if (ping) {
        res.status(200).json(ping);
    } else {
        res.status(404).json({ error: "Ping not found" });
    }
});

// POST /pings (submit a GPS ping from an onboard device)
router.post('/', (req, res) => {
    const { device_id, latitude, longitude, speed_kmh, heading, timestamp } = req.body || {};

    if (!device_id || latitude === undefined || longitude === undefined || !timestamp) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "device_id, latitude, longitude, and timestamp are required"
            }
        });
    }

    const vehicle = seedData.vehicles.find(v => v.device_id === device_id);
    if (!vehicle) {
        return res.status(404).json({
            error: {
                code: "NOT_FOUND",
                message: `Vehicle with device_id ${device_id} not found`
            }
        });
    }

    const nextId = seedData.pings.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const newPing = {
        id: nextId,
        vehicle_id: vehicle.id,
        latitude,
        longitude,
        speed_kmh: speed_kmh !== undefined ? speed_kmh : 0,
        heading,
        timestamp
    };
    seedData.pings.push(newPing);

    res
        .status(201)
        .set('Location', `${req.baseUrl}/${newPing.id}`)
        .json(newPing);
});



module.exports = router