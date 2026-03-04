const fs = require( 'fs' )
const path = require( 'path' )
const { startOAuthFlow } = require( '../services/auth' )
const { emitSSE } = require( './sse' )
const AccountModel = require( '../database/AccountModel' )
const ProxiesModel = require( '../database/ProxiesModel' )
const syncAccounts = require( '../services/syncAccounts' )

const router = require( 'express' ).Router()

const ACCOUNTS_DIR = path.join( __dirname, '../accounts' )

function formatAccounts( accounts, proxies ) {
	return accounts.map( a => ( {
		...a,
		hasCredentials: fs.existsSync( path.join( ACCOUNTS_DIR, a.email, 'client_secret.json' ) ),
		proxyLabel: a.proxyId
			? ( proxies.find( p => p.id === a.proxyId ) || {} ).label || a.proxyId
			: null
	} ) )
}


router.get( '/', ( req, res ) => {
	res.json( formatAccounts( AccountModel.getAccounts(), ProxiesModel.getProxies() ) )
} )

router.post( '/', ( req, res ) => {
	const { email, proxyId } = req.body

	if ( !email )
		return res.status( 400 ).json( { error: 'email required' } )

	try {
		const accountDir = path.join( ACCOUNTS_DIR, email )
		if ( !fs.existsSync( accountDir ) )
			fs.mkdirSync( accountDir, { recursive: true } )

		AccountModel.addAccount( email, proxyId )
		res.json( { ok: true } )
	} catch ( err ) {
		res.status( 400 ).json( { error: err.message } )
	}
} )

router.post( '/sync', ( req, res ) => {
	syncAccounts()
	res.json( formatAccounts( AccountModel.getAccounts(), ProxiesModel.getProxies() ) )
} )

router.delete( '/:email', ( req, res ) => {
	const email = decodeURIComponent( req.params.email )

	AccountModel.removeAccount( email )

	const accountDir = path.join( ACCOUNTS_DIR, email )
	if ( fs.existsSync( accountDir ) )
		fs.rmSync( accountDir, { recursive: true, force: true } )

	res.json( { ok: true } )
} )

router.post( '/:email/proxy', ( req, res ) => {
	const email = decodeURIComponent( req.params.email )
	const { proxyId } = req.body

	try {
		AccountModel.setProxy( email, proxyId )
		res.json( { ok: true } )
	} catch ( err ) {
		res.status( 400 ).json( { error: err.message } )
	}
} )

router.post( '/:email/authorize', async ( req, res ) => {
	const email = decodeURIComponent( req.params.email )
	try {
		const url = await startOAuthFlow( email, emitSSE )
		res.json( { ok: true, url } )
	} catch ( err ) {
		res.status( 500 ).json( { error: err.message } )
	}
} )


module.exports = router