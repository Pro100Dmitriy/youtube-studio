const { ProxyAgent } = require( 'undici' )
const ProxiesModel = require( '../database/ProxiesModel' )

const router = require( 'express' ).Router()


router.get( '/', ( req, res ) => {
	res.json( ProxiesModel.getProxies() )
} )

router.post( '/', ( req, res ) => {
	const { access, label } = req.body

	if ( !access )
		return res.status( 400 ).json( { error: 'access required' } )

	const parts = access.split( ':' )

	if ( parts.length !== 4 )
		return res.status( 400 ).json( { error: 'Format must be host:port:user:pass' } )

	const [host, port, user, pass] = parts
	const url = `http://${ user }:${ pass }@${ host }:${ port }`
	const id = `proxy-${ Date.now() }`

	try {
		ProxiesModel.addProxy( id, url, label || id )
		res.json( { ok: true } )
	} catch ( err ) {
		res.status( 400 ).json( { error: err.message } )
	}
} )

router.delete( '/:id', ( req, res ) => {
	ProxiesModel.removeProxy( decodeURIComponent( req.params.id ) )

	res.json( { ok: true } )
} )

router.post( '/:id/ping', async ( req, res ) => {
	const proxy = ProxiesModel.getProxies().find( p => p.id === req.params.id )

	if ( !proxy )
		return res.status( 404 ).json( { error: 'Proxy not found' } )

	try {
		const dispatcher = new ProxyAgent( proxy.url )
		const response = await fetch( 'https://api.ipify.org?format=json', { dispatcher } )
		const data = await response.json()

		res.json( { ok: true, ip: data.ip } )
	} catch ( err ) {
		res.status( 500 ).json( { ok: false, error: err.message } )
	}
} )


module.exports = router