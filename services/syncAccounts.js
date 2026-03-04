const fs = require( 'fs' )
const path = require( 'path' )
const AccountModel = require( '../database/AccountModel' )

const ACCOUNTS_DIR = path.join( __dirname, '../accounts' )


function syncAccounts() {
	if ( !fs.existsSync( ACCOUNTS_DIR ) ) return

	const dirs = new Set(
		fs.readdirSync( ACCOUNTS_DIR, { withFileTypes: true } )
			.filter( e => e.isDirectory() )
			.map( e => e.name )
	)

	const existing = AccountModel.getAccounts()
	const existingMap = new Map( existing.map( a => [ a.email, a ] ) )

	for ( const account of existing ) {
		if ( !dirs.has( account.email ) )
			AccountModel.removeAccount( account.email )
	}

	for ( const email of dirs ) {
		const hasToken = fs.existsSync( path.join( ACCOUNTS_DIR, email, 'token.json' ) )

		if ( !existingMap.has( email ) ) {
			AccountModel.addAccount( email, null )
			if ( hasToken ) AccountModel.setAuthorized( email, true )
		} else {
			AccountModel.setAuthorized( email, hasToken )
		}
	}
}


module.exports = syncAccounts
