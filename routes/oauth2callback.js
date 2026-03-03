const { emitSSE } = require( './sse' )
const { finalizeOAuth } = require( '../services/auth' )

const router = require( 'express' ).Router()


router.get( '/oauth2callback', async ( req, res ) => {
	const { code, state: email, error } = req.query

	if ( error ) {
		emitSSE( { type: 'status', email, status: 'error', message: error } )

		return res.send( `<h2>OAuth error: ${ error }</h2>` )
	}

	if ( !code || !email )
		return res.status( 400 ).send( '<h2>Missing code or state</h2>' )

	try {
		await finalizeOAuth( email, code, emitSSE )

		res.send( '<h2>Authorization successful! You can close this tab.</h2>' )
	} catch ( err ) {
		res.status( 500 ).send( `<h2>Error: ${ err.message }</h2>` )
	}
} )


module.exports = router