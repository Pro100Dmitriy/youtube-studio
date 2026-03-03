const { loadAccountAuth } = require( '../services/auth' )
const { emitSSE } = require( './sse' )
const updateMultipleVideosFull = require( '../services/video' )
const { readVideoData } = require( '../services/videosFolder' )

const router = require( 'express' ).Router()


router.post( '/run', async ( req, res ) => {
	const { accounts: emails, videoIds } = req.body

	if ( !emails || !emails.length )
		return res.status( 400 ).json( { error: 'accounts required' } )

	if ( !videoIds || !videoIds.length )
		return res.status( 400 ).json( { error: 'videoIds required' } )

	let videos
	try {
		videos = videoIds.map( id => readVideoData( id ) )
	} catch ( err ) {
		return res.status( 400 ).json( { error: err.message } )
	}

	res.json( { ok: true, message: 'Run started' } )

	// Run in background
	;( async () => {
		for ( const email of emails ) {
			emitSSE( { type: 'run', email, status: 'started', message: 'Loading auth...' } )

			try {
				const authClient = await loadAccountAuth( email )

				emitSSE( { type: 'run', email, status: 'running', message: 'Updating videos...' } )

				const results = await updateMultipleVideosFull( authClient, videos )

				emitSSE( {
					type: 'run',
					email,
					status: 'done',
					message: `Done. Success: ${ results.success.length }, Failed: ${ results.failed.length }`
				} )
			} catch ( err ) {
				emitSSE( { type: 'run', email, status: 'error', message: err.message } )
			}
		}

		emitSSE( { type: 'run', email: null, status: 'all_done', message: 'All accounts processed' } )
	} )()
} )


module.exports = router