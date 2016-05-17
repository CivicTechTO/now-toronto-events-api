var argo = require('argo');
var fs = require('fs');
var request = require('request');

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
          env.response.body = JSON.stringify(body, null, 2);
          env.response.statusCode = 200;
        }
        next(env);
      })
      //env.target.url = 'https://nowtoronto.com/api/search/event/all/get_search_results';
    })
  })
  .listen(process.env.PORT || 1337);
