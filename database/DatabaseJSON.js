const fs = require( 'fs' )
const path = require( 'path' )


class DatabaseJSON {
	DB_PATH = path.join( __dirname, '../db.json' )
	DEFAULT_DB = { accounts: [], proxies: [] }

	constructor() {}

	read() {
		if ( !fs.existsSync( this.DB_PATH ) )
			fs.writeFileSync( this.DB_PATH, JSON.stringify( this.DEFAULT_DB, null, 2 ) )

		return JSON.parse( fs.readFileSync( this.DB_PATH, 'utf8' ) )
	}

	write( db ) {
		fs.writeFileSync( this.DB_PATH, JSON.stringify( db, null, 2 ) )
	}
}


module.exports = DatabaseJSON