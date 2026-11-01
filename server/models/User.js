const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      default: "Citizen"
    },
    locationSharingEnabled: { type: Boolean, default: true },
    emergencyAlertsEnabled: { type: Boolean, default: true },
    location: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
      address: { type: String, default: "Citizen Live Location" }
    },
    geoPoint: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [77.2090, 28.6139]
      }
    },
    locationAccuracy: { type: Number, default: 8 },
    locationUpdatedAt: { type: Date, default: Date.now },
    status: { type: String, default: "Active" }
  },
  {
    timestamps: true
  }
);

userSchema.index({ geoPoint: "2dsphere" });

module.exports = mongoose.model("User", userSchema);

