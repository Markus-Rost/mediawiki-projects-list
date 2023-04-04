const {properties: {wikiProjects: {items: {properties: wikiProjectSchema}}, frontendProxies: {items: {properties: frontendProxySchema}}}} = require('./projects-schema.json');
const PROJECTS = require('./projects.json');

/**
 * A MediaWiki project
 * @typedef {object} WikiProject
 * @property {string} name - Hostname of the project
 * @property {string} regex - Regex to match the project url
 * @property {string} articlePath - Article path of the project
 * @property {string} scriptPath - Script path of the project
 * @property {string} [fullScriptPath] - Only exists when the hostname contains a single wiki: Full script path to the wiki
 * @property {object} [idString] - Only exists when the hostname contains multiple wikis: How to handle the id string
 * @property {string} idString.separator - Separator to join or split the id string on
 * @property {"asc"|"desc"} idString.direction - Order in which the project regex additional group matches should be chained to gain the id string
 * @property {string} idString.regex - Regex to match the id string
 * @property {string[]} idString.scriptPaths - How to turn the group matches of the id string regex into an URL to the script path, index based on group matches
 * @property {boolean} regexPaths - Whether the paths include matches of the regex
 * @property {?("biligame"|"fandom"|"huijiwiki"|"miraheze"|"shoutwiki"|"wiki.gg"|"wikimedia")} wikiFarm - Wiki farm of the project
 * @property {("Cargo"|"CentralAuth"|"OAuth")[]} extensions - List of extensions providing useful API endpoints
 * @property {string} urlSpaceReplacement - Replacement for spaces in the article URL
 * @property {?string} note - Note about the specific project
 */

/**
 * A frontend proxy
 * @typedef {object} FrontendProxy
 * @property {string} name - Hostname of the proxy
 * @property {string} regex - Regex to match the proxy url
 * @property {string} namePath - Name path of the proxy
 * @property {string} articlePath - Article path of the proxy
 * @property {string} scriptPath - Script path of the proxy
 * @property {?string} relativeFix - Regex to remove from the relative url
 * @property {object} [idString] - Only exists when the hostname contains multiple wikis: How to handle the id string
 * @property {string} idString.separator - Separator to join or split the id string on
 * @property {"asc"|"desc"} idString.direction - Order in which the project regex additional group matches should be chained to gain the id string
 * @property {string} idString.regex - Regex to match the id string
 * @property {string[]} idString.scriptPaths - How to turn the group matches of the id string regex into an URL to the script path, index based on group matches
 * @property {?string} note - Note about the specific proxy
 */

/**
 * @type {{
 *     inputToWikiProject: Map<string, ?{fullArticlePath: string, fullScriptPath: string, wikiProject: WikiProject}>,
 *     urlToIdString: Map<string, ?string>,
 *     idStringToUrl: Map<string, ?string>,
 *     inputToFrontendProxy: Map<string, ?{fullNamePath: string, fullArticlePath: string, fullScriptPath: string, frontendProxy: FrontendProxy}>,
 *     urlToFix: Map<string, ?((href:String,pagelink:String)=>String)>
 * }}
 */
const functionCache = {
	inputToWikiProject: new Map(),
	urlToIdString: new Map(),
	idStringToUrl: new Map(),
	inputToFrontendProxy: new Map(),
	urlToFix: new Map()
};

/**
 * @param {Map<string, mapValueType>} map 
 * @param {string} keyString 
 * @returns {?mapValueType}
 * @template mapValueType
 */
function getMapValue(map, keyString) {
	if ( !keyString ) return null;
	let parts = keyString.split('.');
	while ( parts.length > 0 ) {
		let key = parts.join('.');
		if ( map.has(key) ) return map.get(key);
		parts.shift();
	}
	return null;
}

/**
 * Map of MediaWiki projects
 * @type {Map<string, WikiProject>}
 */
const wikiProjects = new Map(PROJECTS.wikiProjects.map( wikiProject => {
	if ( wikiProject.idString ) {
		wikiProject.idString.separator ??= wikiProjectSchema.idString.properties.separator.default;
		wikiProject.idString.direction ??= wikiProjectSchema.idString.properties.direction.default;
	}
	wikiProject.regexPaths ??= wikiProjectSchema.regexPaths.default;
	wikiProject.wikiFarm ??= wikiProjectSchema.wikiFarm.default;
	wikiProject.extensions ??= wikiProjectSchema.extensions.default.slice();
	wikiProject.urlSpaceReplacement ??= wikiProjectSchema.urlSpaceReplacement.default;
	wikiProject.note ??= wikiProjectSchema.note.default;
	return [wikiProject.name, wikiProject];
} ));

/**
 * Map of frontend proxies
 * @type {Map<string, FrontendProxy>}
 */
const frontendProxies = new Map(PROJECTS.frontendProxies.map( frontendProxy => {
	if ( frontendProxy.idString ) {
		frontendProxy.idString.separator ??= frontendProxySchema.idString.properties.separator.default;
		frontendProxy.idString.direction ??= frontendProxySchema.idString.properties.direction.default;
	}
	frontendProxy.relativeFix ??= frontendProxySchema.relativeFix.default;
	frontendProxy.note ??= frontendProxySchema.note.default;
	return [frontendProxy.name, frontendProxy];
} ));

/**
 * Get a MediaWiki project by domain hostname
 * @param {string} hostname 
 * @returns {?WikiProject}
 */
function getWikiProject(hostname) {
	return getMapValue(wikiProjects, hostname);
}

/**
 * Get a frontend proxy by domain hostname
 * @param {string} hostname 
 * @returns {?FrontendProxy}
 */
function getFrontendProxy(hostname) {
	return getMapValue(frontendProxies, hostname);
}

/**
 * 
 * @param {string} input 
 * @returns {?{fullArticlePath: string, fullScriptPath: string, wikiProject: WikiProject}}
 */
function inputToWikiProject(input) {
	if ( functionCache.inputToWikiProject.has(input) ) return structuredClone(functionCache.inputToWikiProject.get(input));
	let result = null;
	let wikiProject = getWikiProject(input.split('/').slice(0, 3).find( part => part && part.includes( '.' ) ));
	if ( wikiProject ) {
		let articlePath = ( wikiProject.regexPaths ? '/' : wikiProject.articlePath.split('?')[0] ).replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
		let scriptPath = ( wikiProject.regexPaths ? '/' : wikiProject.scriptPath ).replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
		let regex = input.match( new RegExp( '(?:[\\w%]+(?::[\\w%]+)?@)?' + wikiProject.regex + `(?:${articlePath}|${scriptPath}|/?$)`, 'd' ) );
		if ( regex ) {
			scriptPath = wikiProject.scriptPath;
			articlePath = wikiProject.articlePath;
			if ( wikiProject.regexPaths ) {
				scriptPath = scriptPath.replace( /\$(\d)/g, (match, n) => regex[n] );
				articlePath = articlePath.replace( /\$(\d)/g, (match, n) => regex[n] );
			}
			if ( articlePath.includes('?') && !articlePath.endsWith('=') ) {
				articlePath = articlePath.replace( '?', '$1?' );
			}
			else articlePath += '$1';
			let auth = '';
			if ( regex.index < regex.indices[1][0] ) {
				auth = input.slice(regex.index, regex.indices[1][0]);
			}
			result = {
				fullArticlePath: 'https://' + regex[1] + articlePath,
				fullScriptPath: 'https://' + auth + regex[1] + scriptPath,
				wikiProject: wikiProject
			};
		}
	}
	functionCache.inputToWikiProject.set(input, result);
	return structuredClone(result);
}

/**
 * 
 * @param {URL} url 
 * @returns {?string}
 */
function urlToIdString(url) {
	if ( functionCache.urlToIdString.has(url.href) ) return functionCache.urlToIdString.get(url.href);
	let result = null;
	/** @type {?WikiProject|FrontendProxy} */
	let project = getWikiProject(url.hostname);
	if ( !project ) project = getFrontendProxy(url.hostname);
	if ( project?.idString ) {
		let regex = url.href.match( new RegExp( project.regex ) )?.slice(2).filter( part => part );
		if ( regex?.length ) {
			if ( project.idString.direction === 'desc' ) regex.reverse();
			result = regex.join(project.idString.separator);
		}
	}
	functionCache.urlToIdString.set(url.href, result);
	return result;
}

/**
 * 
 * @param {string} idString 
 * @param {string} projectName 
 * @returns {?URL}
 */
function idStringToUrl(idString, projectName) {
	let cacheKey = JSON.stringify([idString,projectName]);
	if ( functionCache.idStringToUrl.has(cacheKey) ) {
		let result = functionCache.idStringToUrl.get(cacheKey);
		return ( result ? new URL(result) : result );
	}
	let result = null;
	let project = getWikiProject(projectName)?.idString;
	if ( !project ) project = getFrontendProxy(projectName)?.idString;
	if ( project ) {
		let regex = idString.match( new RegExp( '^' + project.regex + '$' ) )?.[1].split(project.separator);
		if ( regex && regex.length <= project.scriptPaths.length ) {
			result = project.scriptPaths[regex.length - 1].replace( /\$(\d)/g, (match, n) => regex[n - 1] );
		}
	}
	functionCache.idStringToUrl.set(cacheKey, result);
	return ( result ? new URL(result) : result );
}

/**
 * 
 * @param {string} input 
 * @returns {?{fullNamePath: string, fullArticlePath: string, fullScriptPath: string, frontendProxy: FrontendProxy}}
 */
function inputToFrontendProxy(input) {
	if ( functionCache.inputToFrontendProxy.has(input) ) return structuredClone(functionCache.inputToFrontendProxy.get(input));
	let result = null;
	let frontendProxy = getFrontendProxy(input.split('/').slice(0, 3).find( part => part && part.includes( '.' ) ));
	if ( frontendProxy ) {
		let regex = input.match( new RegExp( frontendProxy.regex ) );
		if ( regex ) {
			result = {
				fullNamePath: frontendProxy.namePath.replace( /\$(\d)/g, (match, n) => regex[n] ),
				fullArticlePath: frontendProxy.articlePath.replace( /\$(\d)/g, (match, n) => regex[n] ),
				fullScriptPath: frontendProxy.scriptPath.replace( /\$(\d)/g, (match, n) => regex[n] ),
				frontendProxy: frontendProxy
			};
			if ( result.fullArticlePath.includes('?') && !result.fullArticlePath.endsWith('=') ) {
				result.fullArticlePath = result.fullArticlePath.replace( '?', '$1?' );
			}
			else result.fullArticlePath += '$1';
		}
	}
	functionCache.inputToFrontendProxy.set(input, result);
	return structuredClone(result);
}

/**
 * 
 * @param {string} url 
 * @returns {?((href:String,pagelink:String)=>String)}
 */
function urlToFix(url) {
	let hostname = url.split('/')[2];
	if ( functionCache.urlToFix.has(hostname) ) return functionCache.urlToFix.get(hostname);
	let result = null;
	let frontendProxy = getFrontendProxy(hostname);
	if ( frontendProxy ) {
		let splitLength = frontendProxy.namePath.split('/').length;
		let querykeys = frontendProxy.namePath.split('?').slice(1).join('?').split('&').flatMap( query => {
			if ( !query ) return [];
			return query.split('=', 1);
		} );
		if ( splitLength > 4 && querykeys.length && frontendProxy.relativeFix ) {
			result = (href, pagelink) => {
				let prepend = '/' + pagelink.split('/', splitLength).slice(3, -1).join('/');
				let querystring = pagelink.split('?').slice(1).join('?').split('&').filter( query => querykeys.includes( query.split('=', 1)[0] ) );
				let append = ( href.includes('?') ? '&' : '?' ) + querystring.join('&');
				return prepend + href.replace( new RegExp( frontendProxy.relativeFix ), '' ) + append;
			};
		}
		else if ( splitLength > 4 && querykeys.length ) {
			result = (href, pagelink) => {
				let prepend = '/' + pagelink.split('/', splitLength).slice(3, -1).join('/');
				let querystring = pagelink.split('?').slice(1).join('?').split('&').filter( query => querykeys.includes( query.split('=', 1)[0] ) );
				let append = ( href.includes('?') ? '&' : '?' ) + querystring.join('&');
				return prepend + href + append;
			};
		}
		else if ( splitLength > 4 && frontendProxy.relativeFix ) {
			result = (href, pagelink) => {
				let prepend = '/' + pagelink.split('/', splitLength).slice(3, -1).join('/');
				return prepend + href.replace( new RegExp( frontendProxy.relativeFix ), '' );
			}
		}
		else if ( splitLength > 4 ) {
			result = (href, pagelink) => '/' + pagelink.split('/', splitLength).slice(3, -1).join('/') + href;
		}
		else if ( querykeys.length && frontendProxy.relativeFix ) {
			result = (href, pagelink) => {
				let querystring = pagelink.split('?').slice(1).join('?').split('&').filter( query => querykeys.includes( query.split('=', 1)[0] ) );
				return href.replace( new RegExp( frontendProxy.relativeFix ), '' ) + ( href.includes('?') ? '&' : '?' ) + querystring.join('&');
			}
		}
		else if ( querykeys.length ) {
			result = (href, pagelink) => {
				let querystring = pagelink.split('?').slice(1).join('?').split('&').filter( query => querykeys.includes( query.split('=', 1)[0] ) );
				return href + ( href.includes('?') ? '&' : '?' ) + querystring.join('&');
			}
		}
		else if ( frontendProxy.relativeFix ) {
			result = (href, pagelink) => href.replace( new RegExp( frontendProxy.relativeFix ), '' );
		}
	}
	functionCache.urlToFix.set(hostname, result);
	return result;
}

module.exports = {
	wikiProjects,
	frontendProxies,
	getWikiProject,
	getFrontendProxy,
	inputToWikiProject,
	urlToIdString,
	idStringToUrl,
	inputToFrontendProxy,
	urlToFix
};