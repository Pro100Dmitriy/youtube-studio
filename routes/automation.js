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
		const origLog = console.log
		const origError = console.error
		const origWarn = console.warn

		let currentEmail = null
		const toMsg = args => args.map( a => typeof a === 'object' ? JSON.stringify( a ) : String( a ) ).join( ' ' )

		console.log = ( ...args ) => { origLog( ...args ); emitSSE( { type: 'run', email: currentEmail, status: 'running', message: toMsg( args ) } ) }
		console.error = ( ...args ) => { origError( ...args ); emitSSE( { type: 'run', email: currentEmail, status: 'error', message: toMsg( args ) } ) }
		console.warn = ( ...args ) => { origWarn( ...args ); emitSSE( { type: 'run', email: currentEmail, status: 'warning', message: toMsg( args ) } ) }

		try {
			for ( const email of emails ) {
				currentEmail = email
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
		} finally {
			console.log = origLog
			console.error = origError
			console.warn = origWarn
		}
	} )()
} )


module.exports = router