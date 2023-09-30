import mongoose from "mongoose";
import shortid from "shortid"

// Update the OrderSchema in the models/orders.js file:
const OrderSchema = mongoose.Schema({
    uid: String,
    refNumber: {
        type: String,
        default: shortid.generate,
        unique: true
    },
    createdAt: Date,
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    whatsappNumber: String,
    benefitPayNumber: String,
    emailAddress: String,
    totalPrice: Number,
    cartItems: [{
        model: String,
        quantity: Number
    }]
},{
    timestamps: true  // This option will automatically manage `createdAt` and `updatedAt` fields
});


export const Order = mongoose.model('Order', OrderSchema);