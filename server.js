var argo = require('argo');
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var trim = require('trim');

argo()
  .use(function(handle) {
    handle('response', function(env, next) {
      env.response.setHeader('Access-Control-Allow-Origin', '*');
      next(env);
    });
  })
  .get('^/categories$', function(handle) {
    handle('request', function(env, next) {
      categories = JSON.parse(fs.readFileSync('categories.json', 'utf8')).categories;
      env.response.statusCode = 200;
      env.response.body = JSON.stringify(categories, null, 2);
      next(env);
    })
  })
  .get('^/events$', function(handle) {
    handle('request', function(env, next) {
      request('https://nowtoronto.com/api/search/event/all/get_search_results', function(err, res, body) {
        if (!err && res.statusCode == 200) {
          body = JSON.parse(body);
          body.per_page = body.rpp;
          delete body.rpp;
          body.results.forEach(function(result) {
            var doc = new dom().parseFromString(result.html);
            result.description = xpath.select('//p[@class="description"]/text()', doc).toString();
            result.description = trim(result.description);
            result.categories = xpath.select('//p[@class="cats"]/span/text()', doc).toString();
            result.categories = result.categories.split(', ');
            result.name = result.title;
            result.date = xpath.select('//p[@class="event_date"]/text()', doc).toString();
            result.url = xpath.select('string(//a[@class="more_link"]/@href)', doc).toString();
            result.venue = {};
            result.venue.url = 'https://nowtoronto.com/locations/' + result.urlname + '/';
            result.venue.slug = result.urlname;
            delete result.html;
            delete result.urlname;
            delete result.title;
          })
          env.response.body = JSON.stringify(body, null, 2);
          env.response.statusCode = 200;
        }
        next(env);
      })
      //env.target.url = 'https://nowtoronto.com/api/search/event/all/get_search_results';
    })
  })
  .listen(process.env.PORT || 1337);
