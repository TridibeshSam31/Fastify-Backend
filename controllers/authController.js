const User = require("../models/user.js");
const crypto = require("crypto");
//this is default it is generally provided so we dont need to install it

const bcrypt = require("bcrypt");
const { request } = require("http");



exports.register = async (request , reply) => {
    try {
        //validate the body 
        const {name , email , password , country} = request.body;
        //validate fields
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            country
        })

        await user.save();
        reply.code(201).send({message:"user registered successfully"})
    } catch (error) {
        reply.send(error);
    }
}



exports.login = async (request , reply) => {
    try {
        //validate the body 
        const {name , email , password , country} = request.body;
        const user = await User.findOne({email});
        if(!user){
            return reply.code(400).send({message:"Invalid email or password"})

        }
        //validate the password

        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid){
            return reply.code(400).send ({message:"Invalid email or password"})
        }

        const token = request.server.jwt.sign({id:user._id});
        reply.send({token});


    } catch (error) {
        reply.send(error);
    }
}



exports.forgotPassword = async (request,reply) => {
    try {
        const {email} = request.body
        const user = await User.findOne({email});
        if(!user){
            return reply.notFound({message:"User not found"})
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetPasswordeExpiry = Date.now() + 10*60*1000;

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetPasswordeExpiry;
        await user.save({validateBeforeSave: false});


        const resetUrl = `http://localhost:${process.env.PORT}/api/auth/reset-password/${resetToken}`
        reply.send({resetUrl});
    } catch (error) {
        reply.send(error);
    }
}


exports.resetPassword = async (request,reply) => {
    try {
        const resetToken = request.params.token;
        const {newPassword} = request.body

        const user = await User.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpiry: { $gt: Date.now() }
        })
        if(!user) {
            return reply.badRequest({message:"Invalid or expired reset token"})
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        reply.send({message:"Password reset successfully"})
    } catch (error) {
        reply.send(error);
    }
}


exports.logout = async(request ,reply) => {
    //JWT are stateless, we can't really log out a user
    //But we can send a response back to the client
    reply.send({message:"Logged out successfully"})
}
