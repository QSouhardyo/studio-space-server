import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose'
const app = express()
const port = 5000

app.use(cors())
app.use(express.json())



const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const connectClient = await connectToMongoDB()
const db = connectClient.db('studio-space')
const studiosCollection = db.collection('studios')
const bookingCollection = db.collection('booking')

// একই Studio-তে একটির বেশি Booking আটকাবে
await bookingCollection.createIndex(
    { studioId: 1 },
    { unique: true }
);

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).send({ msg: "Unauthorized" })
    }

    const token = authHeader.split(' ')[1]

    console.log(token);
    if (!token) {
        return res.status(401).send({ msg: "Unauthorized" })
    }
    const JWKS = createRemoteJWKSet(
        new URL('http://localhost:3000/api/auth/jwks')
    )

    try {
        const { payload } = await jwtVerify(token, JWKS)
        next()
    }
    catch (error) {
        return res.status(500).send({ msg: 'Server Error' })
    }
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/add-studio', verifyToken, async (req, res) => {
    const data = req.body
    const result = await studiosCollection.insertOne(data)
    res.send(result)
})

app.get('/studios', async (req, res) => {
    const result = await studiosCollection.find().toArray()
    res.send(result)
})

// Get 6 Featured Studios
app.get("/featured-studios", async (req, res) => {
    try {
        const studios = await studiosCollection
            .find()
            .sort({
                rating: -1,
                createdAt: -1,
            })
            .limit(6)
            .toArray();

        res.send(studios);

    } catch (error) {
        console.error("Featured Studios Error:", error);

        res.status(500).send({
            message: "Failed to fetch featured studios",
        });
    }
});

app.get('/studios/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await studiosCollection.findOne(query)

    res.send(result)
})

app.patch('/studios/edit/:id', async (req, res) => {
    const id = req.params.id
    const data = req.body
    const query = { _id: new ObjectId(id) }
    const updateDoc = { $set: data }
    const result = await studiosCollection.updateOne(query, updateDoc)

    res.send(result)
})

app.get('/my-listings/:email', async (req, res) => {
    const email = req.params.email
    const query = { ownerEmail: email }
    const result = await studiosCollection.find(query).toArray()
    res.send(result)
})

app.delete('/my-listings/:id', verifyToken, async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await studiosCollection.deleteOne(query)
    res.send(result)
})

app.post("/booking", verifyToken, async (req, res) => {
    // const data = req.body;
    // const result = await bookingCollection.insertOne(data);
    // res.send(result);
    try {
        const data = req.body;

        const studioId = String(data.studioId || "");

        // Required information 
        if (!studioId || !data.userEmail || !data.date || !data.time) {
            return res.send({
                message: "Required information is missing."
            });
        }

        // Check studio ID
        if (!ObjectId.isValid(studioId)) {
            return res.send({
                message: "Invalid studio ID."
            });
        }

        // Check studio exists
        const studio = await studiosCollection.findOne({
            _id: new ObjectId(studioId)
        });

        if (!studio) {
            return res.send({
                message: "Studio not found."
            });
        }

        const bookingData = {
            ...data,
            studioId,
            status: "pending",
            createdAt: new Date()
        };

        const result = await bookingCollection.insertOne(bookingData);

        res.send(result);

    } catch (error) {
        if (error.code === 11000) {
            return res.send({
                message: "This studio is already booked."
            });
        }

        console.error("Booking Error:", error);

        res.send({
            message: "Booking failed!"
        });
    }
    ;
});

// Check Studio Booking Availability
app.get("/booking/studio/:studioId", async (req, res) => {
    try {
        const studioId = String(req.params.studioId);

        const booking = await bookingCollection.findOne({
            studioId: studioId
        });

        res.send({
            booked: Boolean(booking)
        });

    } catch (error) {
        console.error("Availability Check Error:", error);

        res.send({
            message: "Failed to check booking availability."
        });
    }
});

app.get('/my-bookings/:email', async (req, res) => {
    const email = req.params.email
    const query = { userEmail: email }
    const result = await bookingCollection.find(query).toArray()
    res.send(result)
})

app.delete('/my-bookings/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await bookingCollection.deleteOne(query)
    res.send(result)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

export default app



