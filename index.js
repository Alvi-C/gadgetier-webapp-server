
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

// ----------health check----------------------
app.get('/health', async (req, res) => {
    res.send({ message: 'OK' });
})
app.put('/health', async (req, res) => {
    const update = await productCollection.updateMany({}, { $set: { featured: "no" } });
    res.send({ message: 'OK' });
})
// --------------------------------



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
        const productCollection = database.collection('products');
        const reviewCollection = database.collection('reviews');
        const userVotesCollection = database.collection('userVotes');

        /* ----------------------jwt api---------------------- */

        app.post("/jwt", (req, res) => {
            // console.log(req.body);
            try {
                const user = req.body
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "1h",
                });
                res.send({ token })
            } catch (error) {
                console.error("Error creating JWT:", error)
                res.status(500).send({ message: "Internal server error" })
            }
        });

        // verify token middleware
        const verifyToken = (req, res, next) => {
            // console.log('inside verified token: ', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send('unauthorized access')
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                req.decoded = decoded
                next()
            })
        }

        //// verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        //// verify moderator middleware
        const verifyModerator = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query)
            const isModerator = user?.role === 'moderator'
            if (!isModerator) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }



        /* ----------------------all user related api---------------------- */

        //// add user to database api
        app.post("/users", async (req, res) => {
            try {
                const userData = req.body
                // console.log(userData);
                // Insert email if the user doesn't exist
                const query = { email: userData.email }
                const existingUser = await userCollection.findOne(query)
                if (existingUser) {
                    return res.send({ message: "User already exists", insertedId: null })
                }
                const result = await userCollection.insertOne(userData)
                res.send(result)
            } catch (error) {
                console.error("Error adding user:", error)
                res.status(500).send({ message: "Internal server error" })
            }
        });

        //// get a single user data from database api
        app.get("/users/:email", async (req, res) => {
            try {
                const email = req.params.email
                // console.log(email);
                const query = { email: email }
                const result = await userCollection.findOne(query)
                res.send(result)
            } catch (error) {
                console.error("Error getting user data:", error)
                res.status(500).send({ message: "Internal server error" })
            }
        });

        //// get all user data from database api
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result)
            } catch (error) {
                console.error("Error getting user data:", error)
                res.status(500).send({ message: "Internal server error" })
            }
        });

        //// admin api
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            // check email is admin or not
            // if (req.decoded.email !== email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            // if email is admin send admin is true
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user?.role === 'admin') {
                admin = true
            }
            // res.send({ admin })
            res.send({ admin })
        })

        //// moderator api
        app.get('/users/moderator/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log(email);
            // check email is moderator or not
            // if (req.decoded.email !== email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            // if email is moderator send moderator is true
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let moderator = false;
            if (user?.role === 'moderator') {
                moderator = true;
            }
            res.send({ moderator })
        })

        /* ----------------------all admin pannel api for user---------------------- */
        //// post product by user api
        app.post("/products", async (req, res) => {
            try {
                const productData = req.body
                // console.log(productData);
                const result = await productCollection.insertOne(productData)
                res.send(result)
            } catch (error) {
                console.error("Error adding product:", error)
                res.status(500).send({ message: "Internal server error" })
            }
        })

        //// get specific users products by user's email api
        app.get('/products/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });

        //// get a specific product by id api
        app.get('/updateProduct/:id', async (req, res) => {
            try {
                const id = req.params.id;
                // console.log(id);
                const query = { _id: new ObjectId(id) };
                const product = await productCollection.findOne(query);

                if (!product) {
                    return res.status(404).send({ message: 'Product not found' });
                }

                res.send(product);
            } catch (error) {
                console.error('Error fetching product:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });


        //// update three specific fields of a product api
        app.patch('/updateProduct/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { productName, productImage, description } = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        productName: productName,
                        image: productImage,
                        description: description
                    }
                };

                const result = await productCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: 'Product not found' });
                }

                res.send({ message: 'Product updated successfully', result });
            } catch (error) {
                console.error('Error updating product:', error);
                res.status(500).send({ message: 'Error updating product', error: error.message });
            }
        });

        //// delete a product api
        app.delete('/deleteProduct/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productCollection.deleteOne(query);

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Product not found' });
                } else {
                    res.send({ message: 'Product deleted successfully', result });
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                res.status(500).send({ message: 'Error deleting product', error: error.message });
            }
        });

        /* ----------------------admin pannel api for moderator---------------------- */
        //// get all pending product api
        app.get('/allRequestProducts', verifyToken, verifyModerator, async (req, res) => {
            try {
                const pendingProducts = await productCollection.find().toArray();
                res.status(200).send(pendingProducts);
            } catch (error) {
                console.error('Error fetching pending products:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });

        //// approve a pending product api
        app.patch('/acceptProduct/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                // console.log('line no: 301: ', id);
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status: 'approved'
                    }
                };

                // Perform the update operation on the collection
                const result = await productCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Product approved successfully.', result });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// reject a pending product api
        app.patch('/rejectProduct/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status: 'rejected'
                    }
                };

                // Perform the update operation on the collection
                const result = await productCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Product rejected successfully.', result });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// featured a product api
        app.patch('/createFeatured/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        featured: 'yes'
                    }
                };

                // Perform the update operation on the collection
                const result = await productCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Product is featured now.', result });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// cancel a featured product api
        app.patch('/cancelFeatured/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        featured: 'no'
                    }
                };

                // Perform the update operation on the collection
                const result = await productCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Product featured is canceled.', result });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //----------------------//
        //// get all reported product api
        app.get('/allReportedProducts', verifyToken, verifyModerator, async (req, res) => {
            try {
                const query = { reported: 'yes' };
                const reportedProducts = await productCollection.find(query).toArray();
                res.status(200).send(reportedProducts);
            } catch (error) {
                console.error('Error fetching reported products:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });

        //// cancel the report of a reported product api
        app.patch('/cancelReport/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        reported: 'no'
                    }
                };

                // Perform the update operation on the collection
                const result = await productCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Product report is canceled.', result });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// delete a reported product api from database
        app.delete('/deleteReportedProduct/:id', verifyToken, verifyModerator, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productCollection.deleteOne(query);

                if (result.deletedCount === 1) {
                    res.status(200).send({ message: 'Product successfully deleted', result });
                } else {
                    res.status(404).send({ message: 'No product found with the specified ID' });
                }
            } catch (error) {
                res.status(500).send({ message: 'An error occurred while deleting the product', error: error.message });
            }
        });

        /* ----------------------admin pannel api for admin---------------------- */
        //// make a user as moderator api
        app.patch('/makeModerator/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        role: 'moderator',
                        status: 'verified'
                    }
                };

                // Perform the update operation on the collection
                const result = await userCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'User is moderator now.', result });
                } else {
                    res.status(404).send({ message: 'user not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        })

        //// cancel a user's moderator role api
        app.patch('/cancelModerator/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        role: 'user',
                        status: 'unverified'
                    }
                };

                // Perform the update operation on the collection
                const result = await userCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'User is no longer moderator now.', result });
                } else {
                    res.status(404).send({ message: 'user not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        })


        //// make a user as admin api
        app.patch('/makeAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        role: 'admin',
                        status: 'verified'
                    }
                };

                // Perform the update operation on the collection
                const result = await userCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'User is admin now.', result });
                } else {
                    res.status(404).send({ message: 'user not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        })

        //// cancel a user's admin role api
        app.patch('/cancelAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        role: 'user',
                        status: 'unverified'
                    }
                };

                // Perform the update operation on the collection
                const result = await userCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'User is no longer admin now.', result });
                } else {
                    res.status(404).send({ message: 'user not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        })

        /* ----------------------Homepage api---------------------- */
        //// get featured products api only 4 items
        app.get('/featuredProducts', async (req, res) => {
            try {
                const query = { featured: 'yes' };
                const cursor = productCollection.find(query);
                const products = await cursor.limit(4).toArray();
                res.send(products);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        })

        //// get all products api with pagination sorting 8 items per page
        app.get('/showProducts', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 8;
                const sort = req.query.sort || 'createdAt';

                const skip = (page - 1) * limit;

                const query = {};
                const cursor = productCollection.find(query).sort({ [sort]: 1 }).skip(skip).limit(limit);
                const products = await cursor.toArray();
                const totalProducts = await productCollection.countDocuments(query);

                res.send({
                    products,
                    totalProducts,
                    page,
                    totalPages: Math.ceil(totalProducts / limit),
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// get a single product api
        app.get('/product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const product = await productCollection.findOne(query);
                res.send(product);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// post a review api
        app.post('/postReview', async (req, res) => {
            try {
                const { userEmail, productId } = req.body;
                const existingReview = await reviewCollection.findOne({ userEmail, productId });

                if (existingReview) {
                    // If a review already exists, send a message to the user
                    res.status(409).send({ message: 'You have already reviewed this product.' });
                } else {
                    // If no review exists, insert the new review
                    const review = req.body;
                    const result = await reviewCollection.insertOne(review);
                    res.send(result);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// get all the reviews according to the product id api
        app.get('/allReviews/:id', async (req, res) => {

            try {
                const productId = req.params.id;
                const query = { productId: productId };
                const reviews = await reviewCollection.find(query).toArray();
                // console.log('line no 640:', reviews);

                if (reviews.length > 0) {
                    res.send(reviews);
                } else {
                    res.status(404).send({ message: 'No reviews found for this product.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });


        //// get products by id
        app.get('/singleProduct/:productId', async (req, res) => {
            try {
                const productId = req.params.productId;
                const product = await productCollection.findOne({ _id: productId });

                if (product) {
                    res.send({
                        ...product,
                        posterUserId: product.userId // Send the poster's user ID
                    });
                } else {
                    res.status(404).send({ message: 'Product not found.' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
            }
        });

        //// vote api
        app.post('/vote/:productId', async (req, res) => {
            try {
                const productId = req.params.productId;
                const { userId, voteType } = req.body;

                // Fetch the product to check if the user is trying to vote on their own product
                const product = await productCollection.findOne({ _id: productId });

                if (!product) {
                    return res.status(404).send({ message: 'Product not found.' });
                }

                if (product.userId === userId) {
                    return res.status(403).send({ message: "You cannot vote on your own product." });
                }

                // Check if the user has already voted for this product
                const existingVote = await userVotesCollection.findOne({ userId, productId });

                if (existingVote) {
                    return res.status(409).send({ message: 'You have already voted for this product.' });
                }

                // Update the product's vote count
                const voteField = voteType === 'upVote' ? 'upVote' : 'downVote';
                const update = { $inc: { [voteField]: 1 } };
                await productCollection.updateOne({ _id: productId }, update);

                // Record the user's vote
                await userVotesCollection.insertOne({ userId, productId, voteType });

                res.send({ message: 'Vote recorded successfully.' });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error.' });
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