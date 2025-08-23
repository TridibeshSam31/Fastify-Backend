const fastify = require("fastify")({logger: true})
//logger is basically for the cleaner syntax i.e it is the alternative of console.log 
const fastifyEnv = require('@fastify/env')
//jo dotenv tha waise hi idhar bhi hota hai
const path = require("path")
const cors = require('@fastify/cors')
require('dotenv').config();


//when we declare fastifyenv then we have to define a schema so that to know what contents we have in our env file 
//for eg in the above schema we have defined we have port similarly we can say we have mongodb_uri and so onn 
//CORS KA BHI KUCH AISA HI SYSTEM HAI WAISE BUT HUMKO WOH INITIAL STAGES MAI BOTHER NHI KRENGE 

//register plugin
//@fastify/sensible isn’t a must-have — it’s more like a “quality of life” plugin that gives you a bunch of extra utilities and standardized helpers in Fastify so you don’t have to reinvent common things.
//Think of it as “Fastify + convenience features” baked in.
fastify.register(require('@fastify/sensible'))
fastify.register(require('@fastify/multipart'))
fastify.register(require('@fastify/cors'))
fastify.register(require('@fastify/env'),{
    dotenv: true,
    schema:{
        type:'object',
        required:["PORT","MONGODB_URI","JWT_SECRET"],
        properties:{
            PORT:{type:"string",default:4000},
            MONGODB_URI:{type:"string"},
            JWT_SECRET:{type:"string"}

        }
    }
    
})
fastify.register(require('@fastify/static'),{
    root: path.join(__dirname,"..","uploads"),
    prefix:"/uploads/"
})
//why we need static file serving
//in fastify we need static file serving to serve files like images,css,js,html,pdfsetc from a folder 
//basicaaly its the fastify equivalent of Express
//app.use(express.static("public"))


//REGISTER CUSTOM PLUGINS
fastify.register(require("./plugins/mongodb.js"))
fastify.register(require("./plugins/jwt.js"))


//REGISTER  ROUTES
fastify.register(require("./routes/auth.js"),{prefix:"/api/auth"})
fastify.register(require("./routes/thumbnail.js"),{prefix:"/api/thumbnails"})







//Testing database connection 
fastify.get("/test-db",async(request,reply) => {
    try {
        const mongoose = fastify.mongoose;
        const connectionState = mongoose.connection.readyState;
        let status = ""
        switch (connectionState) {
            case 0:
                status = "Disconnected";
                break;
            case 1:
                status = "Connected";
                break;
            case 2:
                status = "Connecting";
                break;
            case 3:
                status = "Disconnecting";
                break;
            default:
                status = "Unknown";
                break;
        }
        reply.send({ database: status });
    } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: "Database connection failed" });
        process.exit(1);
    }
})

// declare a route
fastify.get('/',function(request,reply){
    reply.send({hello:'world'})
});

const start = async () => {
    try {
        await fastify.listen({port: process.env.PORT})
        fastify.log.info(
            `server is running at http://localhost:${process.env.PORT}`
        )
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start() 