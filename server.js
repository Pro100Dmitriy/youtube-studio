const fs = require( 'fs' )
const path = require( 'path' )

const needsSync = !fs.existsSync( path.join( __dirname, 'db.json' ) )

const express = require( 'express' )
const { routerService, routerAPI } = require( './routes' )
const syncAccounts = require( './services/syncAccounts' )

const PORT = 3000

const app = express()

app.use( express.json() )
app.use( express.static( path.join( __dirname, 'public' ) ) )

app.use( '/', routerService )
app.use( '/api', routerAPI )


app.listen( PORT, () => {
	if ( needsSync ) {
		syncAccounts()
		console.log( 'db.json not found — synced from accounts/ folder' )
	}
	console.log( `YouTube Studio panel running at http://localhost:${ PORT }` )
} )
