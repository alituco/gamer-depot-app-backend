import mongoose from "mongoose";

const GraphicsCardSchema = new mongoose.Schema({
    chipset: String,
    series: String,
    model: String,
    value: Number
});

export const gpuModel = mongoose.model('graphic_cards', GraphicsCardSchema);

