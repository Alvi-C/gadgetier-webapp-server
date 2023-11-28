
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 8000
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

        // create database
        const database = client.db(DB_NAME);
        /* -----------------all mongoDB connections----------------- */
        const userCollection = database.collection('users');

        /* ----------------------jwt api---------------------- */

        app.post("/jwt", (req, res) => {
            try {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "1h",
                });
                res.send({ token });
            } catch (error) {
                console.error("Error creating JWT:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });

        // verify token middleware
        const verifyToken = (req, res, next) => {
            // console.log('inside verified token: ', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send('unauthorized access');
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        //// verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //// verify moderator middleware
        const verifyModerator = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);
            const isModerator = user?.role === 'moderator';
            if (!isModerator) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }



        /* ----------------------all user related api---------------------- */

        //// add user to database api
        app.post("/users", async (req, res) => {
            try {
                const userData = req.body;
                // Insert email if the user doesn't exist
                const query = { email: userData.email };
                const existingUser = await userCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: "User already exists", insertedId: null });
                }
                const result = await userCollection.insertOne(userData);
                res.send(result);
            } catch (error) {
                console.error("Error adding user:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });

        //// get all user data from database api
        app.get("/users", async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error getting user data:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });









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