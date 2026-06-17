// Собирает читаемую детализацию из ошибки googleapis (GaxiosError).
// Настоящая причина обычно лежит в error.response.data.error.errors[],
// а не в generic error.message.
function formatApiError( error ) {
	const lines = []

	const message = error?.message || 'Unknown error'
	lines.push( message )

	const code = error?.code || error?.response?.status
	if ( code ) {
		lines.push( `   └ code: ${ code }` )
	}

	const apiErrors = error?.response?.data?.error?.errors
	if ( Array.isArray( apiErrors ) ) {
		for ( const e of apiErrors ) {
			const reason = e?.reason || 'unknown'
			const detail = e?.message || ''
			lines.push( `   └ ${ reason }: ${ detail }` )
		}
	}

	return lines.join( '\n' )
}


module.exports = { formatApiError }
