const { listVideos, readVideoData } = require( '../services/videosFolder' )

const router = require( 'express' ).Router()

router.get( '/', ( req, res ) => {
	try {
		res.json( listVideos() )
	} catch ( err ) {
		res.status( 500 ).json( { error: err.message } )
	}
} )

router.get( '/:videoId', ( req, res ) => {
	try {
		res.json( readVideoData( req.params.videoId ) )
	} catch ( err ) {
		res.status( 404 ).json( { error: err.message } )
	}
} )

module.exports = router
