const { authorize } = require('./auth.js')
const { getVideoInfo, updateVideoHeadingsWithLocalizations, updateVideoFull, updateMultipleVideosFull } = require('./video.js')
const { getExistingCaptions, uploadMultipleCaptions } = require('./captions.js')

async function main() {
	const authClient = await authorize()

	const videoId = 'a-Bxf_pyr2A'

	// await getVideoInfo( authClient, 'a-Bxf_pyr2A' )
	// await getExistingCaptions( authClient, 'a-Bxf_pyr2A' )
	// await updateVideoHeadingsWithLocalizations( authClient, 'a-Bxf_pyr2A', {
	// 	ru: { title: 'Мой тестовое название 2', description: 'Мой тестовое описание 2' },
	// 	en: { title: 'My test title 2', description: 'My test description 2' },
	// 	fr: { title: 'Mon titre de test 2', description: 'Description de mon test 2' }
	// } )
	// await uploadMultipleCaptions( authClient, videoId, [
	//     { langCode: 'ru', filePath: `./captions/${ videoId }/ru.srt`, name: 'Русский' },
	//     { langCode: 'en', filePath: `./captions/${ videoId }/en.srt`, name: 'English' },
	//     { langCode: 'fr', filePath: `./captions/${ videoId }/fr.srt`, name: 'Français' }
	// ] )
	// await updateVideoFull(
	// 	authClient,
	// 	videoId,
	// 	{
	// 		ru: { title: 'Мой тестовое название 2', description: 'Мой тестовое описание 2' },
	// 		en: { title: 'My test title 2', description: 'My test description 2' },
	// 		fr: { title: 'Mon titre de test 2', description: 'Description de mon test 2' }
	// 	},
	// 	[
	// 		{ langCode: 'ru', filePath: `./captions/${ videoId }/ru.srt`, name: 'Русский' },
	// 		{ langCode: 'en', filePath: `./captions/${ videoId }/en.srt`, name: 'English' },
	// 		{ langCode: 'fr', filePath: `./captions/${ videoId }/fr.srt`, name: 'Français' }
	// 	]
	// )
	await updateMultipleVideosFull(
		authClient,
		[
			{
				videoId: videoId,
				localizations: {
					ru: { title: 'Мой тестовое название 2', description: 'Мой тестовое описание 2' },
					en: { title: 'My test title 2', description: 'My test description 2' },
					fr: { title: 'Mon titre de test 2', description: 'Description de mon test 2' }
				},
				captions: [
					{ langCode: 'ru', filePath: `./captions/${ videoId }/ru.srt` },
					{ langCode: 'en', filePath: `./captions/${ videoId }/en.srt` },
					{ langCode: 'fr', filePath: `./captions/${ videoId }/fr.srt` }
				]
			}
		]
	)
}

main().catch( console.error )