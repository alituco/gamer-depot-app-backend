import mongoose from "mongoose";


const cartSchema = new mongoose.Schema({
  uid: String,  // User's Firebase UID
  items: [
    {
      model: String,
      quantity: Number,
    }
  ]
});


export const Cart = mongoose.model('cartModel', cartSchema);

