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
                           coords[0] >= -180 && coords[0] <= 180 &&  
                           coords[1] >= -90 && coords[1] <= 90;     
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