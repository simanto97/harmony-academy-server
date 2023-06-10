const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

// verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vqdm4bk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const instructorsCollection = client
      .db("harmonyDB")
      .collection("instructors");
    const usersCollection = client.db("harmonyDB").collection("users");
    const classesCollection = client.db("harmonyDB").collection("classes");
    const cartsCollection = client.db("harmonyDB").collection("carts");

    // jwt related apis
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // users related apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // instructors related apis
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // classes related apis
    app.get("/classes", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      if (req.query?.approve) {
        query = { status: "approved" };
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const classData = req.body;
      classData.price = parseFloat(classData.price);
      classData.availableSeats = parseFloat(classData.availableSeats);
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      body.price = parseFloat(req.body.price);
      body.availableSeats = parseInt(req.body.availableSeats);
      const query = { _id: new ObjectId(id) };
      const classData = {
        $set: {
          image: body.image,
          name: body.name,
          price: body.price,
          availableSeats: body.availableSeats,
        },
      };
      const result = await classesCollection.updateOne(query, classData);
      res.send(result);
    });

    app.patch("/classes/status/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body.status;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { status: body } };
      const result = await classesCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // carts related apis

    app.get("/dashboard/carts", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/dashboard/carts", async (req, res) => {
      const item = req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/dashboard/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("DB connected!✅");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Assignment 12 server is running");
});

app.listen(port, (req, res) => {
  console.log(`assignment 12 server is running on port☣️: ${port}`);
});
