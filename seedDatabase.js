require('dotenv').config();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Set DNS servers to Google's public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = process.env.MONGODB_URI;

async function seedDatabase() {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
    });
    
    try {
        // Connect to MongoDB
        await client.connect();
        console.log('Connected to MongoDB Atlas successfully!');
        
        // Read seed data
        const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
        
        // Use the vehicleData database
        const db = client.db('vehicleData');
        
        // Drop existing collections if they exist (optional - for clean seed)
        const collections = ['provinces', 'districts', 'stations', 'vehicles'];
        for (const collName of collections) {
            try {
                await db.collection(collName).drop();
                console.log(`Dropped existing collection: ${collName}`);
            } catch (e) {
                // Collection might not exist, that's fine
            }
        }
        
        // Insert provinces
        if (seedData.provinces && seedData.provinces.length > 0) {
            const result = await db.collection('provinces').insertMany(seedData.provinces);
            console.log(`Inserted ${result.insertedCount} provinces`);
        }
        
        // Insert districts
        if (seedData.districts && seedData.districts.length > 0) {
            const result = await db.collection('districts').insertMany(seedData.districts);
            console.log(`Inserted ${result.insertedCount} districts`);
        }
        
        // Insert stations
        if (seedData.stations && seedData.stations.length > 0) {
            const result = await db.collection('stations').insertMany(seedData.stations);
            console.log(`Inserted ${result.insertedCount} stations`);
        }
        
        // Insert vehicles
        if (seedData.vehicles && seedData.vehicles.length > 0) {
            const result = await db.collection('vehicles').insertMany(seedData.vehicles);
            console.log(`Inserted ${result.insertedCount} vehicles`);
        }
        
        console.log('\nDatabase seeded successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await client.close();
        console.log('Connection closed.');
    }
}

seedDatabase();
