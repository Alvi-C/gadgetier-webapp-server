
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 4000
const app = express()


// middleware
app.use(cors())
app.use(express.json())

// checking server
app.get("/", (req, res) => {
    res.send("Gadgetier server is running");
});

// --------database connection--------
// Accessing Secrets
const { MONGO_URI, DB_NAME } = process.env;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        // create database and collections to store data
        const database = client.db(DB_NAME);





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // If MongoDB connection is successful, start the server
        app.listen(port, () => {
            console.log(`Gadgetier server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);