const fs = require( 'fs' )
const path = require( 'path' )
const { google } = require( 'googleapis' )
const { HttpsProxyAgent } = require( 'https-proxy-agent' )
const AccountModel = require( '../database/AccountModel' )
const ProxiesModel = require( '../database/ProxiesModel' )


const PORT = 3000
const SCOPES = [
	'https://www.googleapis.com/auth/youtube.upload',
	'https://www.googleapis.com/auth/youtube.force-ssl'
]


/*
--- Email → { oauth2Client } ---
 */
const pendingOAuth = new Map()

function getAccountDir( email ) {
	return path.join( __dirname, '../accounts', email )
}

function readClientSecret( email ) {
	const filePath = path.join( getAccountDir( email ), 'client_secret.json' )
	const content = JSON.parse( fs.readFileSync( filePath, 'utf8' ) )

	return content.installed || content.web
}


/*
--- Phase 1: Generate OAuth URL ---
 */
async function startOAuthFlow( email, emitSSE ) {
	const key = readClientSecret( email )

	const oauth2Client = new google.auth.OAuth2(
		key.client_id,
		key.client_secret,
		`http://localhost:${ PORT }/oauth2callback`
	)

	const authUrl = oauth2Client.generateAuthUrl( {
		access_type: 'offline',
		prompt: 'consent',
		scope: SCOPES,
		state: email,
		login_hint: email
	} )

	pendingOAuth.set( email, { oauth2Client } )

	emitSSE( { type: 'status', email, status: 'authorizing' } )

	return authUrl
}


/*
--- Called by Express /oauth2callback ---
 */
async function finalizeOAuth( email, code, emitSSE ) {
	const pending = pendingOAuth.get( email )

	if ( !pending )
		throw new Error( `No pending OAuth for ${ email }` )

	const { oauth2Client } = pending

	try {
		const { tokens } = await oauth2Client.getToken( code )
		const key = readClientSecret( email )
		const accountDir = getAccountDir( email )
		const tokenPayload = {
			type: 'authorized_user',
			client_id: key.client_id,
			client_secret: key.client_secret,
			refresh_token: tokens.refresh_token
		}

		fs.mkdirSync( accountDir, { recursive: true } )
		fs.writeFileSync( path.join( accountDir, 'token.json' ), JSON.stringify( tokenPayload, null, 2 ) )

		AccountModel.setAuthorized( email, true )

		emitSSE( { type: 'status', email, status: 'authorized' } )
	} catch ( err ) {
		emitSSE( { type: 'status', email, status: 'error', message: err.message } )
		throw err
	} finally {
		pendingOAuth.delete( email )
	}
}


/*
 * --- Phase 2: Load auth for automation ---
 */
async function loadAccountAuth( email ) {
	const accountDir = getAccountDir( email )
	const tokenPath = path.join( accountDir, 'token.json' )
	const tokenContent = JSON.parse( fs.readFileSync( tokenPath, 'utf8' ) )
	const key = readClientSecret( email )
	const proxyUrl = ProxiesModel.getProxyUrlForAccount( email )

	const oauth2Client = new google.auth.OAuth2(
		key.client_id,
		key.client_secret,
		`http://localhost:${ PORT }/oauth2callback`
	)

	if ( !proxyUrl )
		throw new Error( 'Proxy not available!' )

	oauth2Client.transporter.defaults = { agent: new HttpsProxyAgent( proxyUrl ) }
	oauth2Client.setCredentials( { refresh_token: tokenContent.refresh_token } )

	return oauth2Client
}


module.exports = {
	startOAuthFlow,
	finalizeOAuth,
	loadAccountAuth
}
