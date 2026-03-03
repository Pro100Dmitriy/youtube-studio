const express = require( 'express' )
const path = require( 'path' )
const { routerService, routerAPI } = require( './routes' )

const PORT = 3000

const app = express()

app.use( express.json() )
app.use( express.static( path.join( __dirname, 'public' ) ) )

app.use( '/', routerService )
app.use( '/api', routerAPI )


app.listen( PORT, () => {
	console.log( `YouTube Studio panel running at http://localhost:${ PORT }` )
} )
