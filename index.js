const express = require('express');
const cheerioReq = require("cheerio-req");
const sha256 = require("js-sha256").sha256;
const URL = require('url');
const app = express();

function logLevel(key, value) {
	return {
		key,
		value
	};
}

const DEBUG = logLevel("DEBUG", 1);
const INFO = logLevel("INFO", 2);
const WARN = logLevel("WARN", 3);
const ERR = logLevel("ERROR", 4);

const PRERENDER_URL = process.env.PRERENDER_URL;
const MIN_LOG_LEVEL = process.env.LOG_LEVEL ?
	[DEBUG, INFO, WARN, ERR].filter(e => e.key === process.env.LOG_LEVEL)[0] : INFO;

if (!MIN_LOG_LEVEL) {
	throw new Error(`Loglevel '${process.env.MIN_LOG_LEVEL}' could not be selected`);
}

const BLOCKED_EXTENSIONS = ['pdf', 'gif', 'jpg', 'jpeg', 'png', 'svg'];

function log(level, message) {
	if (level.value >= MIN_LOG_LEVEL.value) {
		console.log(JSON.stringify({time : new Date().toISOString(), severity : level.key, message : message}));
	}
}

function workWorkWork(req, res) {
	const decodedUrl = decodeURIComponent(req.query.url);
	const pathname = URL.parse(decodedUrl).pathname;
	const blockedResource = BLOCKED_EXTENSIONS.filter(function (extension) {
		return pathname.endsWith(extension);
	}).length > 0;
	if (blockedResource) {
		log(WARN, `URL ${decodedUrl} was blocked`);
		res.status(403).end();
		return;
	}

	log(DEBUG, `Fetching ${decodedUrl}`);
	const urlToFetch = PRERENDER_URL ? `http://${PRERENDER_URL}/${encodeURIComponent(decodedUrl)}` : decodedUrl;
	const selector = decodeURIComponent(req.query.selector);
	const suppliedHash = req.query.hash;

	matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res);
}

function matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res, count = 0) {
	cheerioReq(urlToFetch, (err, $, upstreamResponse) => {
		if (err) {
			log(ERR, err);
			res.status(406).end();
			return;
		}

		const upstreamContentType = upstreamResponse.headers['content-type'];
		if (!upstreamContentType || !upstreamContentType.startsWith('text/')) {
			log(WARN, `Upstream response might not be parsable due to different content-type: '${upstreamContentType}'`);
		}

		const responseStatusCode = upstreamResponse.statusCode;
		if (PRERENDER_URL && responseStatusCode >= 500) {
			if (count < 4) {
				log(WARN, `Prerender failure (#${responseStatusCode}) on ${decodedUrl}, retrying`);
				matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res, count + 1)
			} else {
				res.status(406).end('After multiple retries we still did not get any data');
			}
			return;
		}

		log(DEBUG, `Getting selector ${selector} on ${decodedUrl}`);
		const element = $(selector).eq(0);

		const text = element.text().trim();
		log(DEBUG, `Got text: '${text}' on ${decodedUrl}`);

		const newHash = sha256(text);
		log(DEBUG, `Found sha ${newHash} on ${decodedUrl}`);
		res.json({
			hashes : {
				previous : suppliedHash,
				new : newHash
			},
			changed : newHash !== suppliedHash,
			empty : text === null,
			found : text,
			prerendered : !!process.env.PRERENDER_URL,
			selector,
			url : decodedUrl
		});
	});
}

app.get('/changed', workWorkWork);
app.get('/_health', (req, res) => res.end('Jolly good here'));
app.listen(7070, () => log(INFO, `Server is listening with log level ${MIN_LOG_LEVEL.key}`));
