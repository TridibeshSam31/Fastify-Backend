const Thumbnail = require("../models/thumbnail.js");
const path = require("path")
const fs = require("fs")
const {pipeline} = require("stream"); //for file handling we use streams in fastify
const util = require("util");
const { default: fastify } = require("fastify");
const pipelineAsync = util.promisify(pipeline); //we promisify the pipeline for easier async/await usage 


//In fastify file is handeled through streams , streams are continuous flow of data (don’t wait for the whole thing)
//In express we use multer middleware inorder to handle file uploads but in fastify we use multiparts , multi part gives us a streaming API
//multiparts aren't just files they can also be text fields(like name , email,etc) , multiple files(file arrays) , mixed(fields + files together)


//going through the common syntax of mutipart given in the docs of fastiy
exports.createThumbnail = async(request,reply) => {
    try {
        const parts = request.parts(); // we get the parts from the request
        let fields = {};
        let filename;

        for await (const part of parts) {
            if (part.file) {
                // Handle file upload
                filename = `${Date.now()}-${part.filename}`
                const saveTo = path.join(__dirname, "..",
                    "uploads",
                    "thumbnails",
                    filename) ; 
                await pipelineAsync(part.file, fs.createWriteStream(saveTo)) 
               
            }else {
                fields[part.filename] = part.value;
            }
        }

        const thumbnail = new Thumbnail({
            user: request.user._id, //assuming user is set in the request by a previous auth plugin
            videoName: fields.videoName,
            version:fields.version,
            image:`/uploads/thumbnails/${filename}`,
            paid:fields.paid === "true"
        })
        await thumbnail.save();
        reply.code(201).send(thumbnail);
    } catch (error) {
        reply.send(error)
    
    }
}


exports.getThumbnails = async(request,reply) => {
    try {
        const thumbnails = await Thumbnail.find({user: request.user._id})
        reply.send(thumbnails);
    } catch (error) {
        reply.send(error)
    }
}

exports.getThumbnail = async (request,reply) => {
    try {
      //validate it first 
      const thumbnail = await Thumbnail.findOne({
        _id: request.params.id,
        user:request.user.id
      })  
      if (!thumbnail) {
        return reply.notFound("Thumbnail not found")
      }
      reply.send(thumbnail)
    } catch (error) {
        reply.send(error)
    }
}





exports.updateThumbnail = async (request,reply) => {
    try {
      const updatedData = request.body
      const thumbnail = await Thumbnail.findOneAndUpdate(
        {_id: request.params.id, user: request.user.id},
        updatedData,
        {new: true}
      )  
       if (!thumbnail) {
        return reply.notFound("Thumbnail not found")
      }
    } catch (error) {
        reply.send(error)
    }
}



exports.deleteThumbnail = async (request,reply) => {
    try {
        const thumbnail = await Thumbnail.findOneAndDelete({
            _id: request.params.id,
            user: request.user.id
        })
        if (!thumbnail) {
            return reply.notFound("Thumbnail not found")
        }
        const filePath = path.join(
            __dirname,
            "..",
            "uploads",
            "thumbnails",
            path.basename(thumbnail.image)
        )
        fs.unlink(filePath, (err) => {
            if (err) {
                fastify.log.error("Error deleting file:", err)
            }
        })
        reply.send({ message: "Thumbnail deleted successfully" })
    } catch (error) {
         reply.send(error)
    }
}


exports.deleteAllThumbnails =  async (request,reply) => {
    try {
        const thumbnails = await Thumbnail.find({ user: request.user.id })
        await Thumbnail.deleteMany({ user: request.user.id })

        for(const thumbnail of thumbnails){
            const filePath = path.join(
                __dirname,
                "..",
                "uploads",
                "thumbnails",
                path.basename(thumbnail.image)
            )
            fs.unlink(filePath, (err) => {
                if (err) {
                    fastify.log.error("Error deleting file:", err)
                }
            })
        }
        reply.send({ message: "All thumbnails deleted successfully" })
    } catch (error) {
        reply.send(error)
    }
}
    