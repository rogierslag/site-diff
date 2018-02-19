const express = require('express');
const cheerioReq = require("cheerio-req");
const sha256 = require("js-sha256").sha256;
const URL = require('url');
const app = express();

const INFO = "INFO";
const WARN = "WARN";
const ERR = "ERROR";

const PRERENDER_URL = process.env.PRERENDER_URL;

const BLOCKED_EXTENSIONS = ['pdf', 'gif', 'jpg', 'jpeg', 'png', 'svg'];

function log(level, message) {
	console.log(JSON.stringify({time : new Date().toISOString(), severity : level, message : message}));
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

	log(INFO, `Fetching ${decodedUrl}`);
	const urlToFetch = PRERENDER_URL ? `http://${PRERENDER_URL}/${encodeURIComponent(decodedUrl)}` : decodedUrl;
	const selector = decodeURIComponent(req.query.selector);
	const suppliedHash = req.query.hash;

	matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res);
}

function matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res, count = 0) {
	cheerioReq(urlToFetch, (err, $, _res, body) => {
		if (err) {
			log(ERR, err);
			res.status(406).end();
			return;
		}

		const responseStatusCode = _res.statusCode;
		if (PRERENDER_URL && responseStatusCode >= 500) {
			if (count < 4) {
				log(WARN, `Prerender failure (#${responseStatusCode}) on ${decodedUrl}, retrying`);
				matchMatchMatch({urlToFetch, selector, suppliedHash, decodedUrl}, res, count + 1)
			} else {
				res.status(406).end('After multiple retries we still did not get any data');
			}
			return;
		}

		log(INFO, `Getting selector ${selector} on ${decodedUrl}`);
		const element = $(selector).eq(0);

		const text = element.text().trim();
		log(INFO, `Got text: '${text}' on ${decodedUrl}`);

		const newHash = sha256(text);
		log(INFO, `Found sha ${newHash} on ${decodedUrl}`);
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
app.get('/_health', function (req, res) {
	res.end('Jolly good here');
});
app.listen(7070, function () {
	log(INFO, 'Server is listening');
});
