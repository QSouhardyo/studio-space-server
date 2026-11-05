import express from 'express'
import cors from 'cors'
import 'dotenv/config'
const app = express()
const port = 5000

app.use(cors())
app.use(express.json())

import { MongoClient, ObjectId } from 'mongodb';

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


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/add-studio', async (req, res) => {
    const data = req.body
    const result = await studiosCollection.insertOne(data)
    res.send(result)
})

app.get('/studios', async (req, res) => {
    const result = await studiosCollection.find().toArray()
    res.send(result)
})

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

app.delete('/my-listings/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await studiosCollection.deleteOne(query)
    res.send(result)
})

app.post("/booking", async (req, res) => {
    const data = req.body;
    const result = await bookingCollection.insertOne(data);
    res.send(result);
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