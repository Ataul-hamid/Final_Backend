const express = require('express')
const app = express()
const admin = require("firebase-admin");

const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
// doctors-portal.json

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


app.use(cors());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdz4y.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
       // await client.connect();
        const database = client.db('shuffleWeb');
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');
        const orderCollection = database.collection("orders");
        const reviewCollection = database.collection("reviews");
        const paymentCollection = database.collection("payments");

        // GET API (get all products)
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        // GET API (get all orders)
        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        app.get('/orders/:orderId', async(req, res)=>{
            const orderId = req.params.orderId;
            const query = {_id: ObjectId(orderId)};
            const orders= await orderCollection.findOne(query);
            res.send(orders);
        })
        app.patch('/orders/:id', async(req,res)=>{
            const id= req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc={
                $set:{
                    paid: true,

                    transactionId:payment.transactionId,
                }
            }
            const result= await paymentCollection.insertOne(payment);
            const updatedOrders = await orderCollection.updateOne(filter, updatedDoc);
            
            res.json(updatedDoc);
        })
        // GET API (get all reviews)
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })
        // GET API (get product by id)
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })
        // GET API (get orders by email)
        app.get('/myOrders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const cursor = await orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })
        // GET API (check admin )
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        // POST API (add a new product)
        app.post('/addNewProduct', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.json(result);
        })
        // POST API (add a review)
        app.post('/addReview', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.json(result);
        })
        // POST API (add customer's order)
        app.post('/placeOrder', async (req, res) => {
            const orderDetails = req.body;
            const result = await orderCollection.insertOne(orderDetails);
            res.json(result);
        })
        // POST API (add new user)
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const result = await usersCollection.insertOne(newUser);
            res.json(result);
        });


        // DELETE API (delete order by id)
        app.delete('/deleteOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })
        // DELETE API (delete product by id)
        app.delete('/deleteProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })


        // UPDATE API (update order status)
        app.put('/approve/:id', async (req, res) => {
            const id = req.params.id;
            const approvedOrder = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: approvedOrder.status
                },
            };
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })
        // UPDATE API (update user's role to admin)
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
        })

        app.post('/create-payment-intent', async(req,res)=>{
            const paymentInfo = req.body;
         
            const amount = paymentInfo.price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
        });

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World');
})
app.listen(port, () => {
    console.log('server running on port', port);
})