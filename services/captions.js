const fs = require( 'fs' )
const { google } = require( 'googleapis' )
const { formatApiError } = require('./apiError.js')


async function getExistingCaptions( authClient, videoId ) {
	const youtube = google.youtube( { version: 'v3', auth: authClient } )

	try {
		const response = await youtube.captions.list( {
			part: ['snippet'],
			videoId: videoId
		} )

		const captions = response.data.items || []

		console.log( `📋 Найдено субтитров: ${ captions.length }` )

		captions.forEach( caption => {
			console.log( `   - ${ caption.snippet.language } | ${ caption.snippet.name } | id: ${ caption.id }` )
		} )

		return captions
	} catch ( error ) {
		console.error( '❌ Ошибка получения субтитров:', formatApiError( error ) )
		throw error
	}
}


async function uploadOrUpdateCaption( authClient, videoId, langCode, captionFilePath, existingCaptions ) {
	const youtube = google.youtube( { version: 'v3', auth: authClient } )

	if ( !fs.existsSync( captionFilePath ) ) {
		console.error( `❌ Файл субтитров не найден: ${ captionFilePath }` )
		return null
	}

	try {
		const existingCaption = existingCaptions.find(
			caption => caption.snippet.language === langCode
		)

		// Если субтитры уже есть — обновляем
		if ( existingCaption ) {
			console.log( `🔄 Обновляю субтитры для языка: ${ langCode }` )

			const response = await youtube.captions.update( {
				part: ['snippet'],
				requestBody: {
					id: existingCaption.id,
					snippet: {
						isDraft: false
					}
				},
				media: {
					body: fs.createReadStream( captionFilePath )
				}
			} )

			console.log( `✅ Субтитры обновлены: ${ langCode }` )
			return response.data
		}

		// Если субтитров нет — загружаем новые
		console.log( `⬆️  Загружаю новые субтитры для языка: ${ langCode }` )

		const response = await youtube.captions.insert( {
			part: ['snippet'],
			requestBody: {
				snippet: {
					videoId: videoId,
					language: langCode,
					name: '',
					isDraft: false
				}
			},
			media: {
				body: fs.createReadStream( captionFilePath )
			}
		} )

		console.log( `✅ Субтитры загружены: ${ langCode }` )
		return response.data
	} catch ( error ) {
		console.error( `❌ Ошибка загрузки субтитров ${ langCode }:`, formatApiError( error ) )
		throw error
	}
}


module.exports = {
	getExistingCaptions,
	uploadOrUpdateCaption
}