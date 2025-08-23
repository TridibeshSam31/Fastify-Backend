const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    videoName:{type:String , required:true},
    version:{type:String},
    image:{type:String,required:true},
    paid:{type:String,default:false}

})

module.exports = mongoose.model("Thumbnail",userSchema);