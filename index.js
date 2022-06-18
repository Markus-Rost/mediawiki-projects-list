const {properties: {wikiProjects: {items: {properties: wikiProjectSchema}}}} = require('./projects-schema.json');

/**
 * A MediaWiki project
 * @typedef {object} WikiProject
 * @property {string} name - Hostname of the project
 * @property {string} regex - Regex to match the project url
 * @property {string} articlePath - Article path of the project
 * @property {string} scriptPath - Script path of the project
 * @property {object} [idString] - Only exists when the hostname contains multiple wikis: How to handle the id string
 * @property {string} idString.separator - Separator to join or split the id string on
 * @property {"asc"|"desc"} idString.direction - Order in which the project regex additional group matches should be chained to gain the id string
 * @property {string} idString.regex - Regex to match the id string
 * @property {string[]} idString.scriptPaths - How to turn the group matches of the id string regex into an URL to the script path, index based on group matches
 * @property {boolean} regexPaths - Whether the paths include matches of the regex
 * @property {?("wikimedia"|"fandom"|"miraheze"|"wiki.gg")} wikiFarm - Wiki farm of the project
 * @property {("CentralAuth"|"Cargo")[]} extensions - List of extensions providing useful API endpoints
 * @property {string} urlSpaceReplacement - Replacement for spaces in the article URL
 * @property {?string} note - Note about the specific project
 */

/**
 * @type {{
 *     inputToWikiProject: Map<string, ?{fullArticlePath: string, fullScriptPath: string, wikiProject: WikiProject}>,
 *     urlToIdString: Map<string, ?string>,
 *     idStringToUrl: Map<string, ?string>
 * }}
 */
const functionCache = {
	inputToWikiProject: new Map(),
	urlToIdString: new Map(),
	idStringToUrl: new Map()
};

/**
 * List of MediaWiki projects
 * @type {WikiProject[]}
 */
const wikiProjects = require('./projects.json').wikiProjects.map( wikiProject => {
	if ( wikiProject.idString ) {
		wikiProject.idString.separator ??= wikiProjectSchema.idString.properties.separator.default;
		wikiProject.idString.direction ??= wikiProjectSchema.idString.properties.direction.default;
	}
	wikiProject.regexPaths ??= wikiProjectSchema.regexPaths.default;
	wikiProject.wikiFarm ??= wikiProjectSchema.wikiFarm.default;
	wikiProject.extensions ??= wikiProjectSchema.extensions.default.slice();
	wikiProject.urlSpaceReplacement ??= wikiProjectSchema.urlSpaceReplacement.default;
	wikiProject.note ??= wikiProjectSchema.note.default;
	return wikiProject;
} );

/**
 * 
 * @param {string} input 
 * @returns {?{fullArticlePath: string, fullScriptPath: string, wikiProject: WikiProject}}
 */
function inputToWikiProject(input) {
	if ( functionCache.inputToWikiProject.has(input) ) return structuredClone(functionCache.inputToWikiProject.get(input));
	let result = null;
	let wikiProject = wikiProjects.find( wikiProject => input.split('/').slice(0, 3).some( part => part.endsWith( wikiProject.name ) ) );
	if ( wikiProject ) {
		let articlePath = ( wikiProject.regexPaths ? '/' : wikiProject.articlePath );
		let scriptPath = ( wikiProject.regexPaths ? '/' : wikiProject.scriptPath );
		let regex = input.match( new RegExp( wikiProject.regex + `(?:${articlePath}|${scriptPath}|/?$)` ) );
		if ( regex ) {
			if ( wikiProject.regexPaths ) {
				scriptPath = wikiProject.scriptPath.replace( /\$(\d)/g, (match, n) => regex[n] );
				articlePath = wikiProject.articlePath.replace( /\$(\d)/g, (match, n) => regex[n] );
			}
			result = {
				fullArticlePath: 'https://' + regex[1] + articlePath,
				fullScriptPath: 'https://' + regex[1] + scriptPath,
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
	let wikiProject = wikiProjects.find( wikiProject => wikiProject.idString && url.hostname.endsWith( wikiProject.name ) );
	if ( wikiProject ) {
		let regex = url.href.match( new RegExp( wikiProject.regex ) )?.slice(2);
		if ( regex?.length ) {
			if ( wikiProject.idString.direction === 'desc' ) regex.reverse();
			result = regex.join(wikiProject.idString.separator);
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
	let wikiProject = wikiProjects.find( wikiProject => wikiProject.idString && wikiProject.name === projectName )?.idString;
	if ( wikiProject ) {
		let regex = idString.match( new RegExp( '^' + wikiProject.regex + '$' ) )?.[1].split(wikiProject.separator);
		if ( regex && regex.length <= wikiProject.scriptPaths.length ) {
			result = wikiProject.scriptPaths[regex.length - 1].replace( /\$(\d)/g, (match, n) => regex[n - 1] );
		}
	}
	functionCache.idStringToUrl.set(cacheKey, result);
	return ( result ? new URL(result) : result );
}

module.exports = {
	wikiProjects,
	inputToWikiProject,
	urlToIdString,
	idStringToUrl
};