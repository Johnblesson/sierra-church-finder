
import mongoose from "mongoose";

// Define the schema for the churches model
const churchesSchema = new mongoose.Schema({
    churchName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    locationArea: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    address2: {
        type: String,
        trim: true,
        default: ""
    },
    ministry: {
        type: String,
        trim: true,
        default: ""
    },
    createdBy: {
        type: String,
        required: true
    },
    role: {
        type: String,
        trim: true,
        // default: "Member"
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Pending"],
        required: true,
        default: "Active"
    },
    comments: {
        type: String,
        trim: true,
        default: ""
    },
}, {
    timestamps: true, // Automatically manages createdAt and updatedAt
});

// Create the membership model
const Churches = mongoose.model('Churches', churchesSchema);

export default Churches;

