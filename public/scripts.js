let proxies = []
let accounts = []

// --- SSE ---
const evtSource = new EventSource( '/events' )
evtSource.onopen = () => {
	document.getElementById( 'sseStatus' ).textContent = '● connected'
	document.getElementById( 'sseStatus' ).className = 'sse-status connected'
}
evtSource.onerror = () => {
	document.getElementById( 'sseStatus' ).textContent = '● disconnected'
	document.getElementById( 'sseStatus' ).className = 'sse-status'
}
evtSource.onmessage = ( e ) => {
	const data = JSON.parse( e.data )
	if ( data.type === 'status' ) {
		updateAccountStatus( data.email, data.status )
		loadAccounts()
	}
	if ( data.type === 'run' ) {
		appendRunLog( data )
	}
}

function updateAccountStatus( email, status ) {
	const rows = document.querySelectorAll( '#accountTable tbody tr' )
	rows.forEach( row => {
		if ( row.dataset.email === email ) {
			const cell = row.querySelector( '.status-icon' )
			if ( cell ) cell.textContent = statusIcon( status )
		}
	} )
}

function statusIcon( status ) {
	if ( status === 'authorized' ) return '✅'
	if ( status === 'authorizing' ) return '🔄'
	if ( status === 'error' ) return '❌'
	return '⚪'
}

function appendRunLog( data ) {
	const log = document.getElementById( 'runLog' )
	const entry = document.createElement( 'div' )
	const cls = data.status === 'error' ? 'error' : data.status === 'done' || data.status === 'all_done' ? 'done' : 'running'
	entry.className = `log-entry ${ cls }`
	const prefix = data.email ? `[${ data.email }]` : '[system]'
	entry.textContent = `${ prefix } ${ data.status }: ${ data.message || '' }`
	log.appendChild( entry )
	log.scrollTop = log.scrollHeight
}

// --- Load data ---
async function loadProxies() {
	const res = await fetch( '/api/proxies' )
	proxies = await res.json()
	renderProxyTable()
	renderProxySelects()
}

async function loadAccounts() {
	const res = await fetch( '/api/accounts' )
	accounts = await res.json()
	renderAccountTable()
	renderAccountSelect()
}

function init() {
	loadProxies().then( () => loadAccounts() )
	loadVideos()
}

// --- Proxies ---
function renderProxyTable() {
	const tbody = document.querySelector( '#proxyTable tbody' )

	if ( !proxies.length ) {
		tbody.innerHTML = '<tr><td colspan="5" class="empty">No proxies added</td></tr>'
		return
	}

	tbody.innerHTML = proxies.map( p => `
		<tr>
		  <td>${ esc( p.id ) }</td>
		  <td>${ esc( p.label || '' ) }</td>
		  <td style="font-family:monospace;font-size:0.8rem;color:#888">${ esc( p.url ) }</td>
		  <td>
		    <button onclick="pingProxy('${ esc( p.id ) }', this)">Ping</button>
		    <span id="ping-${ esc( p.id ) }" style="margin-left:8px;font-size:0.8rem;color:#888"></span>
		  </td>
		  <td><button class="danger" onclick="removeProxy('${ esc( p.id ) }')">Remove</button></td>
		</tr>
	` ).join( '' )
}

function renderProxySelects() {
	const opts = '<option value="">No proxy</option>' + proxies.map( p =>
		`<option value="${ esc( p.id ) }">${ esc( p.label || p.id ) }</option>`
	).join( '' )
	document.getElementById( 'accountProxy' ).innerHTML = opts

	document.querySelectorAll( '.proxy-select' ).forEach( sel => {
		const email = sel.dataset.email
		const account = accounts.find( a => a.email === email )
		sel.innerHTML = opts
		if ( account && account.proxyId ) sel.value = account.proxyId
	} )
}

async function addProxy() {
	const access = document.getElementById( 'proxyAccess' ).value.trim()
	const label = document.getElementById( 'proxyLabel' ).value.trim()

	if ( !access )
		return alert( 'Access string is required' )

	await fetch( '/api/proxies', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify( { access, label } )
	} )

	document.getElementById( 'proxyAccess' ).value = ''
	document.getElementById( 'proxyLabel' ).value = ''

	await loadProxies()
}

async function removeProxy( id ) {
	await fetch( `/api/proxies/${ encodeURIComponent( id ) }`, { method: 'DELETE' } )
	await loadProxies()
}

async function pingProxy( id, btn ) {
	const span = document.getElementById( `ping-${ id }` )
	span.textContent = '...'
	btn.disabled = true
	const res = await fetch( `/api/proxies/${ encodeURIComponent( id ) }/ping`, { method: 'POST' } )
	const data = await res.json()
	btn.disabled = false
	span.textContent = data.ok ? `✓ ${ data.ip }` : `✗ ${ data.error }`
	span.style.color = data.ok ? '#5f5' : '#f55'
}

// --- Accounts ---
function renderAccountTable() {
	const tbody = document.querySelector( '#accountTable tbody' )
	if ( !accounts.length ) {
		tbody.innerHTML = '<tr><td colspan="4" class="empty">No accounts added</td></tr>'
		return
	}
	const proxyOpts = '<option value="">No proxy</option>' + proxies.map( p =>
		`<option value="${ esc( p.id ) }">${ esc( p.label || p.id ) }</option>`
	).join( '' )

	tbody.innerHTML = accounts.map( a => `
    <tr data-email="${ esc( a.email ) }">
      <td>${ esc( a.email ) }</td>
      <td>
        <select class="proxy-select" data-email="${ esc( a.email ) }" onchange="changeProxy('${ esc( a.email ) }', this.value)">
          ${ proxyOpts }
        </select>
      </td>
      <td><span class="status-icon">${ statusIcon( a.authorized ? 'authorized' : 'pending' ) }</span></td>
      <td style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="authorizeAccount('${ esc( a.email ) }')">Authorize</button>
        <button class="danger" onclick="removeAccount('${ esc( a.email ) }')">Remove</button>
      </td>
    </tr>` ).join( '' )

	// Set current proxy values
	accounts.forEach( a => {
		const sel = tbody.querySelector( `.proxy-select[data-email="${ a.email }"]` )
		if ( sel && a.proxyId ) sel.value = a.proxyId
	} )
}

function renderAccountSelect() {
	const sel = document.getElementById( 'runAccount' )
	const authorized = accounts.filter( a => a.authorized )
	sel.innerHTML = '<option value="">— select account —</option>' +
		authorized.map( a =>
			`<option value="${ esc( a.email ) }">${ esc( a.email ) }${ a.proxyLabel ? ' (' + esc( a.proxyLabel ) + ')' : '' }</option>`
		).join( '' )
}

// --- Videos (folder-based) ---
let videoList = []

async function loadVideos() {
	const container = document.getElementById( 'videoList' )
	container.textContent = 'Loading videos...'
	const res = await fetch( '/api/videos' )
	videoList = await res.json()
	renderVideoList()
}

function renderVideoList() {
	const container = document.getElementById( 'videoList' )
	if ( !videoList.length ) {
		container.innerHTML = '<div style="color:#888;font-size:0.88rem">No video folders found in videos/</div>'
		return
	}
	container.innerHTML = videoList.map( v => `
		<div class="video-card" id="vf-${ esc( v.videoId ) }">
			<div class="video-card-header">
				<input type="checkbox" id="vcheck-${ esc( v.videoId ) }" value="${ esc( v.videoId ) }" style="margin-right:8px">
				<span style="font-family:monospace;font-weight:600">${ esc( v.videoId ) }</span>
				<span style="color:#888;font-size:0.8rem;margin-left:12px">langs: ${ esc( v.langs.join( ', ' ) ) }</span>
				${ v.captionLangs.length ? `<span style="color:#888;font-size:0.8rem;margin-left:8px">captions: ${ esc( v.captionLangs.join( ', ' ) ) }</span>` : '' }
				<button onclick="toggleVideoPreview('${ esc( v.videoId ) }')" style="margin-left:auto">▼ Preview</button>
			</div>
			<div id="vprev-${ esc( v.videoId ) }" style="display:none;padding:8px 0 0 24px"></div>
		</div>
	` ).join( '' )
}

async function toggleVideoPreview( videoId ) {
	const panel = document.getElementById( `vprev-${ videoId }` )
	if ( panel.style.display !== 'none' ) {
		panel.style.display = 'none'
		return
	}
	panel.textContent = 'Loading...'
	panel.style.display = 'block'

	const res = await fetch( `/api/videos/${ encodeURIComponent( videoId ) }` )
	const data = await res.json()
	if ( data.error ) {
		panel.textContent = data.error
		return
	}

	const locHtml = Object.entries( data.localizations ).map( ( [lang, loc] ) => `
		<div style="margin-bottom:8px">
			<div style="font-weight:600;color:#aaa;font-size:0.8rem;text-transform:uppercase">${ esc( lang ) }</div>
			<div style="font-size:0.85rem"><b>${ esc( loc.title ) }</b></div>
			<div style="font-size:0.78rem;color:#888;white-space:pre-wrap">${ esc( loc.description ) }</div>
		</div>
	` ).join( '' )

	const capHtml = data.captions.length
		? '<div style="font-size:0.8rem;color:#888;margin-top:4px">Captions: ' + data.captions.map( c => esc( c.langCode ) ).join( ', ' ) + '</div>'
		: ''

	panel.innerHTML = locHtml + capHtml
}

async function addAccount() {
	const email = document.getElementById( 'accountEmail' ).value.trim()
	const proxyId = document.getElementById( 'accountProxy' ).value
	if ( !email ) return alert( 'Email is required' )
	const res = await fetch( '/api/accounts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify( { email, proxyId: proxyId || null } )
	} )
	const data = await res.json()
	if ( data.error ) return alert( data.error )
	document.getElementById( 'accountEmail' ).value = ''
	await loadAccounts()
}

async function removeAccount( email ) {
	await fetch( `/api/accounts/${ encodeURIComponent( email ) }`, { method: 'DELETE' } )
	await loadAccounts()
}

async function changeProxy( email, proxyId ) {
	await fetch( `/api/accounts/${ encodeURIComponent( email ) }/proxy`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify( { proxyId: proxyId || null } )
	} )
}

async function authorizeAccount( email ) {
	updateAccountStatus( email, 'authorizing' )
	const res = await fetch( `/api/accounts/${ encodeURIComponent( email ) }/authorize`, { method: 'POST' } )
	const data = await res.json()
	if ( data.error ) {
		alert( data.error )
		updateAccountStatus( email, 'error' )
		return
	}
	window.open( data.url, '_blank' )
}

// --- Phase 2: Run ---
async function runAutomation() {
	const email = document.getElementById( 'runAccount' ).value
	if ( !email ) return alert( 'Select an account' )

	const videoIds = Array.from( document.querySelectorAll( '#videoList input[type=checkbox]:checked' ) )
		.map( cb => cb.value )

	if ( !videoIds.length ) return alert( 'Select at least one video' )

	const log = document.getElementById( 'runLog' )
	log.innerHTML = ''

	const res = await fetch( '/api/run', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify( { accounts: [email], videoIds } )
	} )
	const data = await res.json()
	if ( data.error ) return alert( data.error )
}

function esc( str ) {
	return String( str ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' )
}

init()