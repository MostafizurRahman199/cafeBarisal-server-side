const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId, CURSOR_FLAGS } = require("mongodb");
const express = require("express");
const cors = require("cors");

// ___________step 1___for jwt and cookies storage

var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// ___________step 2___for jwt and cookies storage
app.use(
  cors({
    origin: [ "http://localhost:4173", 
              "http://localhost:5173"],

    methods: ["GET", "POST", "PUT", "DELETE"],

    credentials: true,
  })
);

app.use(express.json());

// ___________step 3___for jwt and cookies storage
app.use(cookieParser());

// ________________________middle ware

const logger = async (req, res, next) => {
  console.log("Inside the logger");

  next();
};

// ___________step 5___for jwt and cookies storage

const verifyToken = async (req, res, next) => {
  console.log("Inside verify token middleware");
  const token = req?.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  // verify the token
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    } else {
      // console.log("Okay");
      req.user = decoded;
    }
    next();
  });
};

// Database connection

const uri = process.env.MONGO_URI;

// const uri = "mongodb://localhost:27017"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    // Access the database and collections

    const db = client.db("cafeBarisal");
    const menuCollection = db.collection("menu");
    const userCollection = db.collection("users");
    const reviewCollection = db.collection("reviews");
    const cartCollection = db.collection("carts");

    console.log("Successfully connected to MongoDB!");

    // auth related APIS



// use verify admin after verifyToken
const verifyAdmin = async(req, res, next)=>{
  const email = req?.user?.email;
  const user = await userCollection.findOne({email});
  const isAdmin = user?.role === "Admin";
  if(!isAdmin){
    return res.status(403).send({message: "Access Denied" });
    }
    console.log("Inside verify Admin");
    next();
}



    // ___________step 4___for jwt and cookies storage

    app.post("/jwt", async (req, res) => {
      const email = req.body.email;
      const payload = { email }; // Create a payload object
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });




    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });



    // public route
    //menuPage
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find({}).toArray();
      res.send(result);
    });




    //public route
    //testimonialSlider
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });



    //
    //order page route
    //private route

    app.post("/cart", async (req, res) => {
      try {
        const cartItems = req.body;
        console.log(cartItems);
        const result = await cartCollection.insertOne(cartItems);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    //order page route
    //private route

    app.get("/cart/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log(email);
        const result = await cartCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // UserCartHome page
    // private route
    app.delete("/cart/:id", async (req, res) => {
      try {
        // const id = req.params.id;
        console.log(id);
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.catch(500).send({ success: false, message: error.message });
      }
    });



    // users related api
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const email = user?.email;
        const existingUser = await userCollection.findOne({ email });

        if (existingUser) {
          return res.send({ success: false, message: "User already exists" });
        }

        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // _________Admin related API

    //_______________________users related api

    // AllUsers.jsx
    //private route
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await userCollection.find({}).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });




    // AllUsers.jsx
    //private route
    //admin 
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });


// _____________update user role

    app.post("/role", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const data = req.body;
        console.log(data);
        const id = data.id;
        const role = data.role;

        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the user by ID
          { $set: { role: role } } // Update the role
        );

        console.log(result);
        res.send(result);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }

      // res.send(true);
    });






//ManageItem.jsx
//admin route
    app.post("/update-menu-item", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { _id, name, recipe, category, price, image, imageUrls } = req.body;
    
        // Log received data for debugging
        // console.log("Update Data Received:", req.body);
    
        // Build the update object dynamically
        const updateFields = {
          name,
          recipe,
          category,
          price: parseFloat(price), // Ensure price is stored as a number
        };
    
        // Conditionally add image or imageUrls to the update object
        if (image) {
          updateFields.image = image;
        }
        if (imageUrls && Array.isArray(imageUrls)) {
          updateFields.imageUrls = imageUrls;
        }


        const query = {
          $or: [
            { _id: new ObjectId(_id) }, // Match ObjectId
            { _id: _id }, // Match string id
          ],
        }
    
        // Update the menu item in the database
        const result = await menuCollection.updateOne(
          query, // Match the menu item by ID
          { $set: updateFields } // Update the specified fields
        );
    
        // Log the result for debugging
        // console.log("Update Result:", result);
    
        // Respond with the result
        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Menu item updated successfully" });
        } else {
          res.status(404).json({ message: "Menu item not found or no changes made" });
        }
      } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(500).json({ message: "Failed to update menu item" });
      }
    });
    









// ____________get login user data from user db

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {

        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        if(req?.user?.email !== email){
          return res.status(403).json({ success: false, message: "forbidden access" });
        }
        if(email){
          const result =  await userCollection.findOne({ email });
          
          console.log(result)
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "User is not an admin" });
          }
        }


      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });




    // AddMenuItem.jsx
    //admin route
    //private

    app.post("/upload-menu-item",verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { name, category, price, recipe, imageUrls } = req.body;
        
        // Create menu item object
        const menuItem = {
          name,
          category,
          price: parseFloat(price), // Ensure price is a number
          recipe,
          imageUrls,
          createdAt: new Date(),
        };
          console.log(menuItem);
        // Insert menu item into MongoDB
        const result = await menuCollection.insertOne(menuItem);
    
        if (result.acknowledged) {
          res.send(result);
        } else {
          res.status(500).json({ message: "Failed to add menu item." });
        }
      } catch (error) {
        console.error("Error uploading menu item:", error.message);
        res.status(500).json({ message: "Internal server error." });
      }
    });



        // ManageMenuItem.jsx
    //private route
    //admin 
    app.delete("/menu-item/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = {
          $or: [
            { _id: new ObjectId(id) }, // Match ObjectId
            { _id: id }, // Match string id
          ],
        };
        const result = await menuCollection.deleteOne(query);
        console.log(result);
       if(result.deletedCount>0){
         res.send(result);
       }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });







    // AllUsers.jsx
    //private route
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server is running");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
