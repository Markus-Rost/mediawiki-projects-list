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

const {wikiProjects: jsonWikiProjects} = require('./projects.json');

/**
 * List of MediaWiki projects
 * @type {WikiProject[]}
 */
const wikiProjects = jsonWikiProjects.map( wikiProject => {
	if ( wikiProject.idString ) {
		wikiProject.idString.separator ??= '.';
		wikiProject.idString.direction ??= 'desc';
	}
	wikiProject.regexPaths ??= false;
	wikiProject.wikiFarm ??= null;
	wikiProject.extensions ??= [];
	wikiProject.urlSpaceReplacement ??= '_';
	wikiProject.note ??= null;
	return wikiProject;
} );

/**
 * 
 * @param {string} input 
 * @returns {?[URL, WikiProject]}
 */
function inputToWikiProject(input) {
	let wikiProject = wikiProjects.find( wikiProject => input.split('/')[2].endsWith( wikiProject.name ) );
	if ( wikiProject ) {
		let articlePath = ( wikiProject.regexPaths ? '/' : wikiProject.articlePath );
		let scriptPath = ( wikiProject.regexPaths ? '/' : wikiProject.scriptPath );
		let regex = input.match( new RegExp( wikiProject.regex + `(?:${articlePath}|${scriptPath}|/?$)` ) );
		if ( regex ) {
			if ( wikiProject.regexPaths ) scriptPath = wikiProject.scriptPath.replace( /\$(\d)/g, (match, n) => regex[n] );
			return [new URL('https://' + regex[1] + scriptPath), wikiProject];
		}
	}
	return null;
}

/**
 * 
 * @param {URL} url 
 * @returns {?string}
 */
function urlToIdString(url) {
	let wikiProject = wikiProjects.find( wikiProject => wikiProject.idString && url.hostname.endsWith( wikiProject.name ) );
	if ( wikiProject ) {
		let regex = url.href.match( new RegExp( wikiProject.regex ) )?.slice(2);
		if ( regex?.length ) {
			if ( wikiProject.idString.direction === 'desc' ) regex.reverse();
			return regex.join(wikiProject.idString.separator);
		}
	}
	return null;
}

/**
 * 
 * @param {string} idString 
 * @param {string} projectName 
 * @returns {?URL}
 */
function idStringToUrl(idString, projectName) {
	let wikiProject = wikiProjects.find( wikiProject => wikiProject.idString && wikiProject.name === projectName )?.idString;
	if ( wikiProject ) {
		let regex = idString.match( new RegExp( '^' + wikiProject.regex + '$' ) )?.[1].split(wikiProject.separator);
		if ( regex && regex.length <= wikiProject.scriptPaths.length ) {
			return new URL(wikiProject.scriptPaths[regex.length - 1].replace( /\$(\d)/g, (match, n) => regex[n - 1] ));
		}
	}
	return null;
}

module.exports = {
	wikiProjects,
	inputToWikiProject,
	urlToIdString,
	idStringToUrl
};