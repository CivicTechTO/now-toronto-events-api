var argo = require('argo');
var dom = require('xmldom').DOMParser;
var fs = require('fs');
var qs = require('qs');
var request = require('request');
var trim = require('trim');
var xpath = require('xpath');

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
      var venues_url = 'https://nowtoronto.com/api/search/location/all/get_map_search_results?tile=0,0,0';
      request(venues_url, function(err, res, body) {
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
  .map('^/events', function(server) {
    server
      .get('^/?(?:\\?(.*))?$', function(handle) {
        handle('request', function(env, next) {
          var query = qs.parse(env.route.params[1]);
          var events_url = 'https://nowtoronto.com/api/search/event/all/get_search_results';
          events_url = events_url + '?' + qs.stringify(query);
          request(events_url, function(err, res, body) {
            if (!err && res.statusCode == 200) {
              body = JSON.parse(body);
              body.per_page = body.rpp;
              delete body.rpp;
              body.results.forEach(function(result) {
                var doc = new dom().parseFromString(result.html);
                var date_string = xpath.select('//p[@class="event_date"]/text()', doc).toString();
                var date_re = /^(\w+ \d{1,2}, \d{4})(?: (\d{1,2}:\d{2} [AP]M))?(?: - (\w+ \d{1,2}, \d{4})? ?(\d{1,2}:\d{2} [AP]M)?)?$/;
                var date_matches = date_re.exec(date_string);
                var start_date = date_matches[1];
                var start_time = date_matches[2] || '';
                var end_date = date_matches[3];
                var end_time = date_matches[4] || '';
                result.description = xpath.select('//p[@class="description"]/text()', doc).toString();
                result.description = trim(result.description);
                result.categories = xpath.select('//p[@class="cats"]/span/text()', doc).toString();
                result.categories = result.categories.split(', ');
                result.name = result.title;
                result.start_date = new Date(start_date + ' ' + start_time).toJSON();
                result.end_date = new Date(end_date + ' ' + end_time).toJSON();
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
  })
  .listen(process.env.PORT || 1337);
