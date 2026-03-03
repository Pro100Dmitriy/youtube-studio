const { startOAuthFlow } = require( '../services/auth' )
const { emitSSE } = require( './sse' )
const AccountModel = require( '../database/AccountModel' )
const ProxiesModel = require( '../database/ProxiesModel' )

const router = require( 'express' ).Router()


router.get( '/', ( req, res ) => {
	const accounts = AccountModel.getAccounts()
	const proxies = ProxiesModel.getProxies()

	const result = accounts.map( a => ( {
		...a,
		proxyLabel: a.proxyId
			? ( proxies.find( p => p.id === a.proxyId ) || {} ).label || a.proxyId
			: null
	} ) )

	res.json( result )
} )

router.post( '/', ( req, res ) => {
	const { email, proxyId } = req.body

	if ( !email )
		return res.status( 400 ).json( { error: 'email required' } )

	try {
		AccountModel.addAccount( email, proxyId )
		res.json( { ok: true } )
	} catch ( err ) {
		res.status( 400 ).json( { error: err.message } )
	}
} )

router.delete( '/:email', ( req, res ) => {
	AccountModel.removeAccount( decodeURIComponent( req.params.email ) )

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