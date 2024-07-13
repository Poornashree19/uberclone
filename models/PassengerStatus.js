const mongoose=require("mongoose");
const StatusSchema= new mongoose.Schema({
    Status:{
        type:String,
        default:"none"

    }

})
const  PassengerStatus=new mongoose.model("PassengerStatus",StatusSchema);
module.exports=PassengerStatus;