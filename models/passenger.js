const mongoose=require("mongoose");
const PassengerSchema=mongoose.Schema({
    name:{
        type:String,
        required:[true,"please enter your name"],
        default:0
    },
    email:{
        type:String,
        required:[true,"please enter your email"],
        default:0
    },
    dob:Date,
    address:{
        type:String,
        required:true,
        default:0
    },
  
    password:{
        type:Number,
        required:true
    },
    cpass:{
        type:Number,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        default:"none"

    },
    pickupCoordinates: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false,
            default: []
            // validate: {
            //     validator: function(coords) {
            //         return coords.length === 2 &&
            //                coords[0] >= -180 && coords[0] <= 180 &&  
            //                coords[1] >= -90 && coords[1] <= 90;     
            //     },
            //     message: props => `${props.value} is not a valid coordinate pair.`
            // }
        }
    },
    dropCoordinates: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false,
            default: []
        }
    },
    driverDetail: {
        type: {
            type: [Object],
            required: false,
            default: []
        }
    },

});
const Passenger=mongoose.model("passenger",PassengerSchema)
module.exports=Passenger;