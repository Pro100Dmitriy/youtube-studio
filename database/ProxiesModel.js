const DatabaseJSON = require( './DatabaseJSON' )


class ProxiesModel extends DatabaseJSON {
	constructor( props ) {
		super( props )
	}

	getProxies() {
		return this.read().proxies
	}

	addProxy( id, url, label ) {
		const db = this.read()

		if ( db.proxies.find( p => p.id === id ) )
			throw new Error( `Proxy ${ id } already exists` )

		db.proxies.push( { id, url, label } )

		this.write( db )
	}

	removeProxy( id ) {
		const db = this.read()

		db.proxies = db.proxies.filter( p => p.id !== id )

		this.write( db )
	}

	getProxyUrlForAccount( email ) {
		const db = this.read()
		const account = db.accounts.find( a => a.email === email )

		if ( !account || !account.proxyId )
			return null

		const proxy = db.proxies.find( p => p.id === account.proxyId )

		return proxy ? proxy.url : null
	}
}


module.exports = new ProxiesModel()
