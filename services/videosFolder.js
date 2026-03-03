const fs = require( 'fs' )
const path = require( 'path' )

const VIDEOS_DIR = path.join( __dirname, '../videos' )

function parseTxtFile( filePath ) {
	const text = fs.readFileSync( filePath, 'utf8' )

	const extract = ( keyword ) => {
		const re = new RegExp( keyword + '\\s*\\{([^}]*)\\}', 's' )
		const m = text.match( re )
		return m ? m[1].trim() : ''
	}

	return {
		title: extract( 'title' ),
		description: extract( 'desc' )
	}
}

function listVideos() {
	if ( !fs.existsSync( VIDEOS_DIR ) ) return []

	return fs.readdirSync( VIDEOS_DIR, { withFileTypes: true } )
		.filter( d => d.isDirectory() )
		.map( d => {
			const videoId = d.name
			const videoDir = path.join( VIDEOS_DIR, videoId )

			const langs = fs.readdirSync( videoDir )
				.filter( f => f.endsWith( '.txt' ) )
				.map( f => f.replace( '.txt', '' ) )

			const captionsDir = path.join( videoDir, 'captions' )
			const captionLangs = fs.existsSync( captionsDir )
				? fs.readdirSync( captionsDir )
					.filter( f => f.endsWith( '.srt' ) )
					.map( f => f.replace( '.srt', '' ) )
				: []

			return { videoId, langs, captionLangs }
		} )
}

function readVideoData( videoId ) {
	const videoDir = path.join( VIDEOS_DIR, videoId )

	if ( !fs.existsSync( videoDir ) )
		throw new Error( `Video folder not found: ${ videoId }` )

	const localizations = {}
	const txtFiles = fs.readdirSync( videoDir ).filter( f => f.endsWith( '.txt' ) )
	for ( const f of txtFiles ) {
		const lang = f.replace( '.txt', '' )
		localizations[lang] = parseTxtFile( path.join( videoDir, f ) )
	}

	const captionsDir = path.join( videoDir, 'captions' )
	const captions = []
	if ( fs.existsSync( captionsDir ) ) {
		for ( const f of fs.readdirSync( captionsDir ).filter( f => f.endsWith( '.srt' ) ) ) {
			const langCode = f.replace( '.srt', '' )
			captions.push( {
				langCode,
				filePath: path.join( captionsDir, f )
			} )
		}
	}

	return { videoId, localizations, captions }
}

module.exports = { listVideos, readVideoData, parseTxtFile }
