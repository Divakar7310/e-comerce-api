const port = 4000;
const express = require("express")
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error } = require("console");
const { type } = require("os");

app.use(cors())
app.use(express.json());
// Database connected
mongoose.connect("mongodb+srv://greatstack:greatstack@cluster0.k3skldq.mongodb.net/e-commerc")

// API Creation

app.get("/", (req, res) => {
    res.send("Express App is Running")
})
// Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cd) => {
        return cd(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({ storage: storage })

// creating Upload Endpoint for images

app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for creating Products

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        reuired: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    avilable: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})
// Creating API For Deleting Products

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Shema creating for User model

const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Map,
        of: Number,
        default: {},
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating Endpoint for registering the use
app.post('/signup', async (req, res) => {
    try {
        // Check if the user already exists
        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
        }

        // Initialize cartData with 300 items set to 0
        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        // Log cart data for debugging
        console.log("Initialized cartData: ", cart);

        // Create a new user
        const user = new Users({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });
        console.log("User =>" + user);

        // Save the user to the database
        await user.save();

        // Verify that cartData is saved
        const savedUser = await Users.findOne({ email: req.body.email });
        console.log("Saved user's cartData: ", savedUser.cartData);

        // Create a JWT token
        const data = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// creating endpoint for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, error: "Wrong Password" });
        }
    }
    else {
        res.json({ success: false, error: "Wrong Email Id" })
    }
})

// creating endPoint for newCollection data
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

// creating endpoint for popular in women section
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" })
    let popular_in_women = products.slice(0, 4);
    console.log("Populr in women fetched");
    res.send(popular_in_women);
})


// crating middelware to fetch user

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using valid Token" })

    }
    else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ errors: "Pleas autheticate using a valid token" })
        }
    }
}

// creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added",req.body.itemId);
    try {

        let userData = await Users.findOne({ _id: req.user.id });
        let itemId = String(req.body.itemId);
        if (!userData.cartData.has(itemId)) {
            userData.cartData.set(itemId, 1);
        } else {
            userData.cartData.set(itemId, userData.cartData.get(itemId) + 1);
        }
        await userData.save();
        res.send("Added");
    } catch (err) {
        console.log(err);
        res.send(err)
    }
})
// creating endpoint to remove product from cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        console.log('user->', req.user.id);
        console.log("Removed", req.body.itemId);

        // Find the user by ID
        let userData = await Users.findOne({ _id: req.user.id });

        if (!userData) {
            return res.status(404).send("User not found");
        }

        // Set the item count in cartData to 0
        let itemId = String(req.body.itemId); // Ensure the itemId is a string

        if (userData.cartData.has(itemId)) {
            userData.cartData.set(itemId, 0);
            console.log(userData.cartData.get(itemId));

            // Save the updated user document
            await userData.save();

            res.send("Removed");
        } else {
            res.status(400).send("Item not found in cart");
        }
    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).send("Internal server error");
    }
});

// creating end point to get cartdata
app.post('/getcart',fetchUser,async (req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);

})
  
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port:" + port);
    }
    else {
        console.log("Error:" + error);
    }
})