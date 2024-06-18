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



});
const Passenger=mongoose.model("passenger",PassengerSchema)
module.exports=Passenger;