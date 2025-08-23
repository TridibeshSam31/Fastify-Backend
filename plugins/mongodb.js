const fp = require('fastify-plugin');


const mongoose = require("mongoose");




module.exports = fp(async (fastify, opts) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        fastify.decorate("mongoose");
        fastify.log.info("MONGODB CONNECTED SUCCESSFULLY")
    } catch (error) {
        fastify.log.error(error);
        process.exit(1)
    }
});


//NOW WE HAVE TO REGISTER THIS PLUGIN SO DO IT IN  SERVER.JS
