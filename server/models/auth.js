// Create users
import mongoose from "mongoose";

// Define the schema for the user model
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: String,
  createdBy: String,
  createdByRole: String,
  placeOfBirth: { type: String, default: 'Western Area Urban' },
  country: { type: String, default: 'Sierra Leone' },  // Country of residence
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  sudo: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String, // This will store the user's TOTP secret in base32 format
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false, // Flag to check if 2FA is enabled for the user
  },
  lastLoginIP: {
    type: String,
  },
  lastLoginDevice: {
    type: String,
  },
  lastLoginCountry: {
    type: String,
  },
  loginHistory: [
    {
      ip: String,
      device: String,
      country: String,
      date: { type: Date, default: Date.now },
    },
  ],
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
      message: String,
      link: String,
      date: { type: Date, default: Date.now },
      replies: [
        {
          senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
          replyMessage: String,
          date: { type: Date, default: Date.now },
        }
      ]
    },
  ],
  communities: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Community', // Reference to Community model
        },
    ],
  // Reference to products created by the user
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
});

// Create the user model
const User = mongoose.model('users', userSchema);

export default User;
