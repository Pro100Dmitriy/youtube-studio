const { google } = require( 'googleapis' )
const { uploadOrUpdateCaption, getExistingCaptions } = require('./captions.js')


async function getVideoInfo( authClient, videoId ) {
	const youtube = google.youtube( { version: 'v3', auth: authClient } )

	try {
		const response = await youtube.videos.list( {
			part: ['snippet', 'localizations'],
			id: [videoId]
		} )

		const video = response.data.items[0]

		if ( !video ) {
			console.log( '❌ Видео не найдено' )
			return null
		}

		console.log( '📹 Информация о видео:' )
		console.log( '   Название:', video.snippet.title )
		console.log( '   Описание:', video.snippet.description )
		console.log( '   Локализации:', video.localizations ? Object.keys( video.localizations ).join( ', ' ) : 'нет' )

		return video
	} catch ( error ) {
		console.error( '❌ Ошибка получения информации:', error.message )
		throw error
	}
}


async function updateVideoHeadingsWithLocalizations( authClient, videoId, localizations ) {
	const youtube = google.youtube( { version: 'v3', auth: authClient } )

	try {
		const video = await getVideoInfo( authClient, videoId )

		if ( !video ) {
			return null
		}

		const defaultLang = video.snippet.defaultLanguage || 'ru'
		const defaultLocalization = localizations[defaultLang]

		const mergedLocalizations = { ...( video.localizations || {} ) }
		for ( const [lang, data] of Object.entries( localizations ) ) {
			const existing = mergedLocalizations[lang] || {}
			mergedLocalizations[lang] = {
				title: data.title || existing.title || '',
				description: data.description || existing.description || ''
			}
		}

		const response = await youtube.videos.update( {
			part: ['snippet', 'localizations'],
			requestBody: {
				id: videoId,
				snippet: {
					title: ( defaultLocalization && defaultLocalization.title ) ? defaultLocalization.title : video.snippet.title,
					description: ( defaultLocalization && defaultLocalization.description ) ? defaultLocalization.description : video.snippet.description,
					categoryId: video.snippet.categoryId,
					defaultLanguage: defaultLang
				},
				localizations: mergedLocalizations
			}
		} )

		console.log( `✅ Описание обновлено для видео: ${ videoId }` )
		console.log( '   Языки:', Object.keys( mergedLocalizations ).join( ', ' ) )

		return response.data
	} catch ( error ) {
		console.error( '❌ Ошибка обновления описания:', error.message )
		throw error
	}
}


async function updateVideoFull( authClient, videoId, localizations, captions ) {
	const youtube = google.youtube( { version: 'v3', auth: authClient } )

	console.log( `\n${ '='.repeat( 50 ) }` )
	console.log( `🎬 Обновляю видео: ${ videoId }` )
	console.log( '='.repeat( 50 ) )

	// Получаем текущие данные видео
	const video = await getVideoInfo( authClient, videoId )
	if ( !video ) return null

	// Получаем текущие субтитры — один запрос для всех языков
	const existingCaptions = await getExistingCaptions( authClient, videoId )

	// --- Обновляем локализации (title + description) ---
	if ( localizations ) {
		console.log( '\n📝 Обновляю локализации...' )

		const defaultLang = video.snippet.defaultLanguage || Object.keys( localizations )[0]
		const defaultLocalization = localizations[defaultLang]

		// Объединяем старые локализации с новыми
		const mergedLocalizations = { ...( video.localizations || {} ) }
		for ( const [lang, data] of Object.entries( localizations ) ) {
			const existing = mergedLocalizations[lang] || {}
			mergedLocalizations[lang] = {
				title: data.title || existing.title || '',
				description: data.description || existing.description || ''
			}
		}

		await youtube.videos.update( {
			part: ['snippet', 'localizations'],
			requestBody: {
				id: videoId,
				snippet: {
					title: ( defaultLocalization && defaultLocalization.title ) ? defaultLocalization.title : video.snippet.title,
					description: ( defaultLocalization && defaultLocalization.description ) ? defaultLocalization.description : video.snippet.description,
					categoryId: video.snippet.categoryId,
					defaultLanguage: defaultLang
				},
				localizations: mergedLocalizations
			}
		} )

		console.log( '✅ Локализации обновлены:', Object.keys( mergedLocalizations ).join( ', ' ) )
	}

	// --- Загружаем субтитры с теми же langCode ---
	if ( captions && captions.length > 0 ) {
		console.log( '\n🔤 Загружаю субтитры...' )

		for ( const caption of captions ) {
			// Проверяем что langCode субтитров совпадает с локализацией
			if ( localizations && !localizations[caption.langCode] ) {
				console.warn( `⚠️  Язык субтитров [${ caption.langCode }] не найден в локализациях` )
			}

			await uploadOrUpdateCaption(
				authClient,
				videoId,
				caption.langCode,
				caption.filePath,
				existingCaptions
			)

			// Пауза между запросами
			await new Promise( resolve => setTimeout( resolve, 1000 ) )
		}
	}

	console.log( `\n✅ Видео ${ videoId } полностью обновлено!` )
}


async function updateMultipleVideosFull( authClient, videos ) {
	const results = {
		success: [],
		failed: []
	}

	for ( const video of videos ) {
		try {
			await updateVideoFull(
				authClient,
				video.videoId,
				video.localizations,
				video.captions
			)

			results.success.push( video.videoId )

			// Пауза между видео
			await new Promise( resolve => setTimeout( resolve, 2000 ) )
		} catch ( error ) {
			console.error( `❌ Ошибка для видео ${ video.videoId }:`, error.message )
			results.failed.push( video.videoId )
		}
	}

	console.log( `\n${ '='.repeat( 50 ) }` )
	console.log( '📊 Итоговые результаты:' )
	console.log( '   ✅ Успешно:', results.success.length )
	console.log( '   ❌ Ошибки :', results.failed.length )

	if ( results.failed.length > 0 ) {
		console.log( '   Не обновлены:', results.failed.join( ', ' ) )
	}

	return results
}


module.exports = updateMultipleVideosFull