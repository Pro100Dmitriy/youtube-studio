const fs = require( 'fs' )
const { google } = require( 'googleapis' )
const { authenticate } = require( '@google-cloud/local-auth' )


const SCOPES = [
	'https://www.googleapis.com/auth/youtube.upload',
	'https://www.googleapis.com/auth/youtube.force-ssl'
]
const TOKEN_PATH = 'token.json'
const CREDENTIALS_PATH = 'client_secret.json'


// --- 1. Authorize ---
async function authorize() {
	let client = await loadSavedCredentialsIfExist()

	if ( client ) {
		return client;
	}
	client = await authenticate( {
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH
	} )

	if ( client.credentials ) {
		await saveCredentials( client );
	}

	return client;
}

async function loadSavedCredentialsIfExist() {
	try {
		const content = await fs.promises.readFile( TOKEN_PATH );
		const credentials = JSON.parse( content );
		return google.auth.fromJSON( credentials );
	} catch ( err ) {
		return null;
	}
}

async function saveCredentials( client ) {
	const content = await fs.promises.readFile( CREDENTIALS_PATH );
	const keys = JSON.parse( content );
	const key = keys.installed || keys.web;
	const payload = JSON.stringify( {
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token
	} );
	await fs.promises.writeFile( TOKEN_PATH, payload );
}


module.exports = {
	authorize
}