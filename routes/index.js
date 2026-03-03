const { router: sseRoutes } = require( './sse' )
const accountsRoutes = require( './accounts' )
const oauth2Routes = require( './oauth2callback' )
const proxyRoutes = require( './proxies' )
const automationRoutes = require( './automation' )

const routerService = require( 'express' ).Router()
const routerAPI = require( 'express' ).Router()


routerService.use( '/', sseRoutes )
routerService.use( '/', oauth2Routes )

routerAPI.use( '/accounts', accountsRoutes )
routerAPI.use( '/proxies', proxyRoutes )
routerAPI.use( '/', automationRoutes )


module.exports = {
	routerService,
	routerAPI
}