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
  .get('^/venues$', function(handle) {
    handle('request', function(env, next) {
      url = 'https://nowtoronto.com/api/search/location/all/get_map_search_results?tile=0,0,0';
      request(url, function(err, res, body) {
        if (!err && res.statusCode == 200) {
          body = JSON.parse(body);
          var items = []
          body.results.forEach(function(result) {
            var item = {
              uid: result[0],
              name: result[1],
              slug: result[2],
              url: 'https://nowtoronto.com/locations/' + result[2] + '/',
              lat: result[3],
              lng: result[4],
            }
            items.push(item);
          })
          body.results = items;
          env.response.statusCode = 200;
          env.response.body = JSON.stringify(body, null, 2);
        }
        next(env);
      })
    })
  })
  .get('^/events$', function(handle) {
    handle('request', function(env, next) {
      url = 'https://nowtoronto.com/api/search/event/all/get_search_results';
      request(url, function(err, res, body) {
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
    })
  })
  .listen(process.env.PORT || 1337);
