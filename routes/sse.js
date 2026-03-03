const router = require( 'express' ).Router()


const sseClients = new Set()

function emitSSE( data ) {
	const msg = `data: ${ JSON.stringify( data ) }\n\n`

	for ( const res of sseClients ) {
		res.write( msg )
	}
}

router.get( '/events', ( req, res ) => {
	res.setHeader( 'Content-Type', 'text/event-stream' )
	res.setHeader( 'Cache-Control', 'no-cache' )
	res.setHeader( 'Connection', 'keep-alive' )

	res.flushHeaders()

	res.write( 'data: {"type":"connected"}\n\n' )

	sseClients.add( res )

	req.on( 'close', () => sseClients.delete( res ) )
} )


module.exports = {
	router,
	emitSSE
}