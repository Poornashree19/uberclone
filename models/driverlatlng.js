const mongoose = require("mongoose");

const LatlngSchema = new mongoose.Schema({

    pickupCoordinates: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function(coords) {
                    return coords.length === 2 &&
                   27.167725 >= -180 &&27.167725 <= 180 &&  
                           78.035889>= -90 && 78.035889<= 90;     
                },
                message: props => `${props.value} is not a valid coordinate pair.`
            }
        }
    },
    address: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Driverlatlng = mongoose.model("Driverlatlng", LatlngSchema);

module.exports = Driverlatlng;
