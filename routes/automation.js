const { loadAccountAuth } = require( '../services/auth' )
const { emitSSE } = require( './sse' )
const updateMultipleVideosFull = require( '../services/video' )

const router = require( 'express' ).Router()


router.post( '/run', async ( req, res ) => {
	const { accounts: emails, videos } = req.body

	if ( !emails || !emails.length )
		return res.status( 400 ).json( { error: 'accounts required' } )

	if ( !videos || !videos.length )
		return res.status( 400 ).json( { error: 'videos required' } )

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