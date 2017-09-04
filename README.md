![Magnet.me](https://cdn.magnet.me/images/logo-2015-full_2x.png)

[![Dependency Status](https://gemnasium.com/badges/github.com/magnetme/site-diff.svg)](https://gemnasium.com/github.com/magnetme/site-diff)

# Site diff

Pull a web page,
select a part based on a selector, and check whether it changed with respect to the previous hash.

To query without a previous hash:
`http://site-diff/changed?url=https%3A%2F%2Fmagnet.me%2F&selector=body`

To query with a previous hash:
`http://site-diff/changed?url=https%3A%2F%2Fmagnet.me%2F&selector=body&hash=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`


Then return a json object so the caller can see whether it should take action.

```json
{
  "hashes": {
     "previous": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
     "new": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "changed": false,
  "empty": false,
  "found": "",
  "prerendered": true,
  "selector": "#currentPageInfo",
  "url": "https://magnet.me/sdfdsf"
}
```

Optionally pass in a `PRERENDER_URL` env var to ensure that the content is passed through a [prerender](https://github.com/prerender/prerender) service.
That way any Javascript can be executed so dynamic pages can be crawled as well. 
