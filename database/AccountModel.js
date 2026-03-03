const DatabaseJSON = require( './DatabaseJSON' )


class AccountModel extends DatabaseJSON {
	constructor() {
		super()
	}

	getAccounts() {
		return this.read().accounts
	}

	addAccount( email, proxyId ) {
		const db = this.read()

		if ( db.accounts.find( a => a.email === email ) )
			throw new Error( `Account ${ email } already exists` )

		db.accounts.push( {
			email,
			proxyId: proxyId || null,
			authorized: false,
			addedAt: new Date().toISOString()
		} )

		this.write( db )
	}

	setAuthorized( email, bool ) {
		const db = this.read()
		const account = db.accounts.find( a => a.email === email )

		if ( !account )
			throw new Error( `Account ${ email } not found` )

		account.authorized = bool

		this.write( db )
	}

	setProxy( email, proxyId ) {
		const db = this.read()
		const account = db.accounts.find( a => a.email === email )

		if ( !account )
			throw new Error( `Account ${ email } not found` )

		account.proxyId = proxyId || null

		this.write( db )
	}

	removeAccount( email ) {
		const db = this.read()

		db.accounts = db.accounts.filter( a => a.email !== email )

		this.write( db )
	}
}


module.exports = new AccountModel()
