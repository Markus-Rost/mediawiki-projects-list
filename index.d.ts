declare module 'mediawiki-projects-list' {

	/** A MediaWiki project */
	export type WikiProject = {
		/** Hostname of the project */
		name: string;
		/** Regex to match the project url */
		regex: string;
		/** Article path of the project */
		articlePath: string;
		/** Script path of the project */
		scriptPath: string;
		/** Only exists when the hostname contains a single wiki: Full script path to the wiki */
		fullScriptPath?: string;
		/** Only exists when the hostname contains multiple wikis: How to handle the id string */
		idString?: {
			/** Separator to join or split the id string on */
			separator: string;
			/** Order in which the project regex additional group matches should be chained to gain the id string */
			direction: "asc" | "desc";
			/** Regex to match the id string */
			regex: string;
			/**  How to turn the group matches of the id string regex into an URL to the script path, index based on group matches */
			scriptPaths: string[];
		};
		/** Whether the paths include matches of the regex */
		regexPaths: boolean;
		/** Wiki farm of the project */
		wikiFarm: ("biligame" | "fandom" | "huijiwiki" | "miraheze" | "shoutwiki" | "wiki.gg" | "wikimedia") | null;
		/** List of extensions providing useful API endpoints */
		extensions: ("Cargo" | "CentralAuth" | "OAuth")[];
		/** Replacement for spaces in the article URL */
		urlSpaceReplacement: string;
		/** Note about the specific project */
		note: string | null;
	};

	/** A frontend proxy */
	export type FrontendProxy = {
		/** Hostname of the proxy */
		name: string;
		/** Regex to match the proxy url */
		regex: string;
		/** Name path of the proxy */
		namePath: string;
		/** Article path of the proxy */
		articlePath: string;
		/** Script path of the proxy */
		scriptPath: string;
		/** Regex to remove from the relative url */
		relativeFix: string;
		/** Only exists when the hostname contains multiple wikis: How to handle the id string */
		idString?: {
			/** Separator to join or split the id string on */
			separator: string;
			/** Order in which the project regex additional group matches should be chained to gain the id string */
			direction: "asc" | "desc";
			/** Regex to match the id string */
			regex: string;
			/**  How to turn the group matches of the id string regex into an URL to the script path, index based on group matches */
			scriptPaths: string[];
		};
		/** Note about the specific proxy */
		note: string | null;
	};

	/** List of MediaWiki projects */
	export const wikiProjects: WikiProject[];

	/** List of frontend proxies */
	export const frontendProxies: FrontendProxy[];

	export function inputToWikiProject(input: string): {
		fullArticlePath: string;
		fullScriptPath: string;
		wikiProject: WikiProject;
	} | null;

	export function urlToIdString(url: URL): string | null;

	export function idStringToUrl(idString: string, projectName: string): URL | null;

	export function inputToWikiProject(input: string): {
		fullNamePath: string;
		fullArticlePath: string;
		fullScriptPath: string;
		frontendProxy: FrontendProxy;
	} | null;

	export function urlToFix(url: string): ((href: string, pagelink: string) => string) | null;

}