const mongoose=require("mongoose");
const DriverSchema=mongoose.Schema({
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
  
    password:{
        type:Number,
        required:true
    },
    cpass:{
        type:Number,
        required:true
    },
    license:{
        type:Number,
        required:[true,"please enter your number"],
    },
    // image:{
    //     type:String,
    //     required:true
    // },
    exp:{
        type:Number,
        required:[true,"enter your year of experience"]
    },
    phone:{
        type:Number,
        required:true
    },
    cartype:{
        type:String,
        required:true
    }

});
const Driver=mongoose.model("drivers",DriverSchema)
module.exports=Driver;