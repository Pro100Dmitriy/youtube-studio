const { google } = require( 'googleapis' )
const { uploadOrUpdateCaption, getExistingCaptions } = require('./captions.js')
const { formatApiError } = require('./apiError.js')
const { sanitizeText, sanitizeLocalizations, isMetadataError, TITLE_MAX_LEN, DESCRIPTION_MAX_LEN } = require('./sanitizeMetadata.js')


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
		console.error( '❌ Ошибка получения информации:', formatApiError( error ) )
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
		console.error( '❌ Ошибка обновления описания:', formatApiError( error ) )
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

	let metadataSanitized = false
	let metadataError = null

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

		const defaultTitle = ( defaultLocalization && defaultLocalization.title ) ? defaultLocalization.title : video.snippet.title
		const defaultDescription = ( defaultLocalization && defaultLocalization.description ) ? defaultLocalization.description : video.snippet.description

		const sendUpdate = ( loc, title, description ) => youtube.videos.update( {
			part: ['snippet', 'localizations'],
			requestBody: {
				id: videoId,
				snippet: {
					title,
					description,
					categoryId: video.snippet.categoryId,
					defaultLanguage: defaultLang
				},
				localizations: loc
			}
		} )

		try {
			try {
				// Попытка 1: отправляем как есть (эмодзи сохраняются, если YouTube их принимает)
				await sendUpdate( mergedLocalizations, defaultTitle, defaultDescription )
			} catch ( error ) {
				if ( !isMetadataError( error ) ) throw error

				// Попытка 2: YouTube отклонил метаданные — повторяем с очищенным текстом
				console.warn( '⚠️  Метаданные отклонены (эмодзи/символы) — повтор с очисткой' )
				await sendUpdate(
					sanitizeLocalizations( mergedLocalizations ),
					sanitizeText( defaultTitle, TITLE_MAX_LEN ),
					sanitizeText( defaultDescription, DESCRIPTION_MAX_LEN )
				)
				metadataSanitized = true
			}

			console.log( '✅ Локализации обновлены:', Object.keys( mergedLocalizations ).join( ', ' ) )
		} catch ( error ) {
			// Даже если метаданные обновить не удалось — не прерываем видео, идём к субтитрам
			metadataError = formatApiError( error )
			console.error( '❌ Не удалось обновить метаданные:', metadataError )
		}
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

	return { sanitized: metadataSanitized, metadataError }
}


async function updateMultipleVideosFull( authClient, videos ) {
	const results = {
		success: [],
		failed: [],    // { videoId, error } — видео целиком не обработано
		sanitized: [], // videoId — эмодзи/символы были удалены из метаданных
		warnings: []   // { videoId, error } — метаданные не обновлены, но видео обработано
	}

	for ( const video of videos ) {
		try {
			const info = await updateVideoFull(
				authClient,
				video.videoId,
				video.localizations,
				video.captions
			)

			results.success.push( video.videoId )

			if ( info && info.sanitized ) results.sanitized.push( video.videoId )
			if ( info && info.metadataError ) results.warnings.push( { videoId: video.videoId, error: info.metadataError } )

			// Пауза между видео
			await new Promise( resolve => setTimeout( resolve, 2000 ) )
		} catch ( error ) {
			const formatted = formatApiError( error )
			console.error( `❌ Ошибка для видео ${ video.videoId }:`, formatted )
			results.failed.push( { videoId: video.videoId, error: formatted } )
		}
	}

	console.log( `\n${ '='.repeat( 50 ) }` )
	console.log( '📊 Итоговые результаты:' )
	console.log( '   ✅ Успешно:', results.success.length )
	console.log( '   ❌ Ошибки :', results.failed.length )

	if ( results.sanitized.length > 0 ) {
		console.log( `\n🧹 Эмодзи/символы удалены (метаданные очищены) — ${ results.sanitized.length }:` )
		for ( const videoId of results.sanitized ) {
			console.log( `   - ${ videoId }` )
		}
	}

	if ( results.warnings.length > 0 ) {
		console.log( `\n⚠️  Метаданные не обновлены (видео обработано) — ${ results.warnings.length }:` )
		for ( const { videoId, error } of results.warnings ) {
			console.log( `   - ${ videoId }:` )
			console.log( `${ error }`.replace( /^/gm, '       ' ) )
		}
	}

	if ( results.failed.length > 0 ) {
		console.log( `\n❌ Не обновлены (ошибка) — ${ results.failed.length }:` )
		for ( const { videoId, error } of results.failed ) {
			console.log( `   - ${ videoId }:` )
			console.log( `${ error }`.replace( /^/gm, '       ' ) )
		}
	}

	return results
}


module.exports = updateMultipleVideosFull