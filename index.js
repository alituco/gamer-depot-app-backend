import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { gpuModel } from "./models/graphic_cards.js";
import {Cart} from "./models/logged_in_cart.js";
import { Order } from "./models/orders.js";
import dotenv from 'dotenv';
import path from 'path';


dotenv.config();

const app = express();
mongoose.connect(process.env.MONGODB_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to db successfully")
}).catch((err) => {
    console.log("Connection to db failed. Error: ", err)
});

const whitelist = ['https://main--lively-daffodil-df0457.netlify.app', 'http://localhost:3000'];

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {  
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, Express!')
});

app.get('/nvidia-gpu', (req, res) => {
    gpuModel.find({ chipset: "NVIDIA" })
        .then(nvidia_graphic_cards => {
            res.json(nvidia_graphic_cards);
        })
        .catch(err => {
            res.status(500).json({ error: "An error occurred" });
        });
});

app.get('/amd-gpu', (req, res) => {
    gpuModel.find({ chipset: "AMD" })
        .then(amd_graphic_cards => {
            res.json(amd_graphic_cards);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: "An error occurred" });
        });
});


app.get('/api/models', async (req, res) => {
    try {
      const selectedChipset = req.query.chipset;
      const models = await gpuModel.find({ chipset: selectedChipset }).distinct('model');
      res.json(models);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  });

app.get('/api/series', async (req, res) => {
    try {
      const selectedChipset = req.query.chipset;
      const series = await gpuModel.find({ chipset: selectedChipset }).distinct('series');
      res.json(series);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  });
  
  app.get('/api/models-by-series', async (req, res) => {
    try {
      const selectedSeries = req.query.series;
      const models = await gpuModel.find({ series: selectedSeries }).distinct('model');
      res.json(models);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  app.get('/api/gpu-id', async (req, res) => {
    try {
      const selectedSeries = req.query.series;
      const selectedModel = req.query.model;
      const gpu = await gpuModel.findOne({ series: selectedSeries, model: selectedModel });
      if (gpu) {
        res.json({ id: gpu._id, model: gpu.model, price: gpu.value });
      } else {
        res.status(404).json({ error: 'GPU not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  app.get('/api/user-cart', async (req, res) => {
    const uid = req.query.uid;
    
    if (!uid) {
        return res.status(400).json({error: 'UID is missing'});
    }

    try {
        const cart = await Cart.findOne({uid: uid});
        
        if (!cart || !cart.items) {
            return res.status(404).json({error: "Can't find cart for user with UID: " + uid});
        }
        
        // Fetch GPU details for each item in the cart
        const detailedCartItems = await Promise.all(cart.items.map(async item => {
            const gpu = await gpuModel.findOne({model: item.model });

            if (!gpu) {
                return {
                    ...item.toObject(),
                    error: 'GPU not found'
                };
            }

            return {
                ...item.toObject(),
                id: gpu._id,
                price: gpu.value
            };
        }));

        res.json(detailedCartItems);

    } catch (error) {
        console.error("Error fetching user cart. ", error);
        res.status(500).json({error: "Internal Server error."});
    }
});


  app.post('/remove-from-cart', async (req, res) => {
    const { uid, model } = req.body;
  
    try {
      let cart = await Cart.findOne({ uid: uid });
      if (!cart) {
        return res.status(404).json({ error: "Can't find user cart" });
      }
  
      // Find the index of the item with the given model
      const itemIndex = cart.items.findIndex(item => item.model === model);
  
      // If the item is found in the cart
      if (itemIndex !== -1) {
        // Decrease the quantity
        cart.items[itemIndex].quantity -= 1;
  
        // If the quantity is zero or less, remove the item from the array
        if (cart.items[itemIndex].quantity <= 0) {
          cart.items.splice(itemIndex, 1);
        }
  
        // Save the updated cart
        await cart.save();
  
        return res.status(200).json({ message: 'Item quantity updated' });
      } else {
        return res.status(404).json({ error: 'Item not found in cart' });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Internal Server Error.' });
    }
  });

  app.post('/api/clear-cart', async (req, res) => {
    const { uid } = req.body;

    if (!uid) {
        return res.status(400).json({ error: "UID is required" });
    }

    try {
        await Cart.findOneAndUpdate({ uid: uid }, { items: [] }); // Empty the cart items array
        res.status(200).send({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
  });

  
  

  ///HANDLE ADD PARTS TO LOGGED IN USER'S CART
  app.post('/addToCart', async (req, res) => {
    const { uid, model } = req.body;
    
  
    try {
      let cart = await Cart.findOne({ uid: uid });
      if (!cart) {
        cart = new Cart({
          uid: uid,
          items: []
        });
      }
  
      cart.items.push({
        model: model,
        quantity: 1
      });
      
      await cart.save();
      res.status(200).json({ message: "Item added to cart." });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error." });
    }
  });
  

  app.post('/api/orders' ,async (req, res) => {
    const orderData = req.body;

    try {
      const newOrder = new Order(orderData);
      await newOrder.save();
      res.status(200).send({message: 'Order saved successfully.'});
    } catch(error) {
      res.status(500).json({error: 'Order save failed'})
    }
  });
  
  

  app.get('/api/getOrders', async (req, res) => {

  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).json({ error: "Can't find user uid"});
  }

    try {
      const orders = await Order.find({ uid: uid});
      if (!orders) {
        return res.status(400).json({ error: "Can't find matching orders for user uid."});
      }
    res.json(orders);
    } catch (err) {
      return res.status(500).json({ error: "Server error."})
    }
  });

  app.get('/api/getOrder', async (req, res) => {
    const refNumber = req.query.refNumber;

    if (!refNumber) {
      res.status(400).json('Order not found.')
    }

    try {
      const order = await Order.find({ refNumber: refNumber });
      if (!order) {
        res.status(400).json({ error: "Can't find order with matching ref number." })
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({error: "Server error."})
    }
  })

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log("Server running on port: ", PORT)
});