# List of MediaWiki projects

```json
{
	"name": "wikipedia.org",
	"regex": "((?:([a-z\\d-]{1,50})\\.)?(?:m\\.)?wikipedia\\.org)",
	"articlePath": "/wiki/",
	"scriptPath": "/w/",
	"wikiFarm": "wikimedia",
	"extensions": [
		"CentralAuth"
	]
}
```

## How to check if a URL matches a wiki project

* `name` - The hostname of the URL should match the `name`.
* `regex` - match the URL against the regex
* `articlePath` - Article path of the project is `https://$1` + `articlePath` + `$1`
* `scriptPath` - Script path of the project is `https://$1` + `scriptPath`
* `regexPaths` - If true, `articlePath` and `scriptPath` include group matches of `regex`
* `wikiFarm` - Name of the wiki farm the project belongs to (`wikimedia`, `fandom`, `miraheze`, `wiki.gg`)
* `extensions` - List of extensions providing useful API endpoints (`CentralAuth`, `Cargo`)
* `urlSpaceReplacement` - Replacement for spaces in page names (default: `_`; wikihow.com: `-`)
* `note` - Usage notes for the API of a specific project