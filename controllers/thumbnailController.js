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
        const parts = request.parts(); // starts parsing the incoming multipart/form-data request.
        let fields = {};//placeholder to store non-file fields (videoName, version, paid, etc.)
        let filename;//we’ll store the generated filename for the uploaded image.

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
        //what we are doing above let me explain it 
        /*
        Generate a unique filename → 123456789-cat.png
          (using Date.now() to avoid collisions).
           Build a path → projectRoot/uploads/thumbnails/123456789-cat.png.
            Use Node.js streams to save the file:
            part.file is a readable stream (incoming file data).
            fs.createWriteStream(saveTo) writes the file.
            pipelineAsync safely pipes them together (promisified so we can await it).
          👉 This way, the file is streamed directly to disk without loading the whole file into memory. Super efficient.
        */

        const thumbnail = new Thumbnail({
            user: request.user._id, //assuming user is set in the request by a previous auth plugin
            videoName: fields.videoName,
            version:fields.version,
            image:`/uploads/thumbnails/${filename}`,
            paid:fields.paid === "true"
        })
        await thumbnail.save();
        reply.code(201).send(thumbnail);
        /*
        Create a new MongoDB document using your Thumbnail model.
        user: which user uploaded the file (coming from request.user set by your auth plugin/middleware).
        videoName: comes from form field.
        version: comes from form field.
       image: relative path to the uploaded file → /uploads/thumbnails/123456-cat.png.
       paid: cast "true" string → boolean true.
       👉 This way, the database stores metadata about the thumbnail, while the file itself is stored on disk.

        */
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
/*
Query MongoDB
Thumbnail.find({ user: request.user._id }) → fetches all thumbnails that belong to the authenticated user.
This ensures a user only sees their own thumbnails.
Reply with results
Sends back an array of thumbnail documents.
Error handling
If Mongo query fails (bad connection, DB issue, etc.), send error back.
👉 Basically: “Give me all thumbnails for this user.”
*/

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

/*
Find one thumbnail by ID & user
request.params.id → ID passed in the route (like /thumbnails/12345).
user: request.user.id → ensures the thumbnail belongs to the logged-in user (authorization check).
Handle not found case
If no document matches both _id and user, return 404 Not Found with "Thumbnail not found".
Send the found document
If found, return the thumbnail document.
Error handling
Same as above — catch DB/logic errors.
👉 Basically: “Give me one specific thumbnail for this user. If it doesn’t exist or isn’t theirs, throw 404.”
*/



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
        })//we used this nodejs method to delete file from file ecosystem it is an async method it requires two thing  
        //path → The path to the file you want to delete.
        //callback → Function called after attempt (error-first style).
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
    