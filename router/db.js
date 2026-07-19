require('dotenv').config();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Set DNS servers for MongoDB Atlas connection
dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
});

let db = null;

async function connectToDatabase() {
    if (db) return db;
    try {
        await client.connect();
        db = client.db('vehicleData');
        console.log('Connected to MongoDB Atlas');
        return db;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

// Initialize connection
connectToDatabase();

// Load seed data for backward compatibility (fallback)
let seedData = {
    provinces: [],
    districts: [],
    stations: [],
    vehicles: [],
    pings: [] 
};

try {
    const DATA_PATH = path.join(__dirname, '..', 'seed.json');
    seedData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (error) {
    console.warn("Could not load seed.json. Running with empty arrays.");
}

module.exports = { seedData, connectToDatabase, client }