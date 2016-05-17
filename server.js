var argo = require('argo');
var fs = require('fs');

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
      env.target.url = 'https://nowtoronto.com/api/search/event/all/get_search_results';
      next(env);
    })
  })
  .listen(process.env.PORT || 1337);
