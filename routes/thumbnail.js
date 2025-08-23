const thumbnailController = require('../controllers/thumbnailController.js');


module.exports = async function(fastify,opts){
    fastify.register(async function (fastify){
        fastify.addHook("preHandler" , fastify.authenticate)
        fastify.post('/', thumbnailController.createThumbnail)
        fastify.get('/:id', thumbnailController.getThumbnail)
        fastify.get('/', thumbnailController.getThumbnails)
        fastify.delete('/:id', thumbnailController.deleteThumbnail)
        fastify.delete('/', thumbnailController.deleteAllThumbnails)
    })
}