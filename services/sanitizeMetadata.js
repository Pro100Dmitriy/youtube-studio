// Очистка метаданных видео от символов, которые отклоняет YouTube Data API.
// Настоящая причина отказа обычно — эмодзи/пиктограммы, угловые скобки или
// битые символы в заголовке/описании (HTTP 400 invalidMetadata / invalidTitle / invalidDescription).

const TITLE_MAX_LEN = 100
const DESCRIPTION_MAX_LEN = 5000

// Управляющие символы, кроме \t \n \r.
const CONTROL_CHARS = new RegExp( '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g' )


// Убирает эмодзи и прочие «ломающие» символы, обрезает до maxLen по кодовым точкам.
function sanitizeText( text, maxLen ) {
	if ( !text ) return text

	let s = String( text )
		.replace( /\p{Extended_Pictographic}/gu, '' )          // эмодзи и пиктограммы
		.replace( /[\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '' ) // variation selectors, ZWJ, keycap
		.replace( /[<>]/g, '' )                                // угловые скобки
		.replace( /[\uD800-\uDFFF]/g, '' )                     // одинокие суррогаты
		.replace( CONTROL_CHARS, '' )
		.trim()

	if ( maxLen ) {
		const chars = [ ...s ]
		if ( chars.length > maxLen ) s = chars.slice( 0, maxLen ).join( '' ).trim()
	}

	return s
}


// Возвращает копию карты локализаций с очищенными title/description.
function sanitizeLocalizations( localizations ) {
	const cleaned = {}

	for ( const [ lang, data ] of Object.entries( localizations || {} ) ) {
		cleaned[lang] = {
			title: sanitizeText( data?.title, TITLE_MAX_LEN ),
			description: sanitizeText( data?.description, DESCRIPTION_MAX_LEN )
		}
	}

	return cleaned
}


// true, если ошибка похожа на отказ из-за метаданных (её имеет смысл повторить с очисткой).
function isMetadataError( error ) {
	const status = error?.code || error?.response?.status
	if ( status !== 400 ) return false

	const apiErrors = error?.response?.data?.error?.errors
	if ( !Array.isArray( apiErrors ) || apiErrors.length === 0 ) return true

	return apiErrors.some( e => /invalid/i.test( e?.reason || '' ) )
}


module.exports = {
	sanitizeText,
	sanitizeLocalizations,
	isMetadataError,
	TITLE_MAX_LEN,
	DESCRIPTION_MAX_LEN
}
