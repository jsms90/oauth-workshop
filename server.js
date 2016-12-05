const Hapi = require('hapi');
const server = new Hapi.Server();
const Inert = require('inert');
const request = require('request');
const querystring = require('querystring');
const env = require('env2')('./config.env');
const cookieAuth = require('hapi-auth-cookie');

server.connection({
  port: process.env.PORT || 4000
});

server.register([Inert, cookieAuth], (err) => {
  if (err) throw err;

  server.auth.strategy('session', 'cookie', {
    password: 'some_not_random_password_that_is_at_least_32_characters',
    cookie:'my_cookie',
    isSecure: false
  })

  server.route([
    {
      method: 'GET',
      path: '/{file*}',
      handler: {
        directory: {
          path: './public'
        }
      }
    },
    {
      method: 'GET',
      path: '/login',
      handler: (req, reply) => {
        var github_url = 'https://github.com/login/oauth/authorize/';
        var client_id = process.env.CLIENT_ID;
        var redirect_uri = 'http://localhost:4000/welcome';
        reply.redirect(`${github_url}?client_id=${client_id}&redirect_uri=${redirect_uri}`);
      }
    },
    {
      method: 'GET',
      path: '/welcome',
      handler: (req, reply) => {
        const options = {
          url: "https://github.com/login/oauth/access_token",
          method: 'POST',
          headers: {
            accept: 'application/json'
          },
          form: {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: req.query.code
          }
        }
        request(options, (err, res, body) => {
          var json = JSON.parse(body);
          req.cookieAuth.set(json);
          console.log('did I get here?');
          reply.redirect(`/something`);
        });
      }
    },
    {
      method: 'GET',
      path: '/something',
      config: {
        auth: {
          strategy: 'session',
        },
        handler: (req, reply) => {
          console.log('how about here?');
          const options = {
            url: `https://api.github.com/user`,
            method: 'GET',
            headers: {
              'User-Agent': 'jen&cleoRock',
              accept: 'application/vnd.github.v3+json',
              Authorization: `token ${req.auth.credentials.access_token}`,
            }
          }
          request(options, (err, res, body) => {
            console.log(req.auth.credentials.access_token);
            console.log(body);
            var everything = JSON.parse(body);
            console.log(everything);
            reply(everything);
          })
        }
      }
    }
  ]);
});

server.start( (err) => {
  if (err) throw err;
  console.log(`Server is running on port: ${server.info.uri}`);
})

module.exports = server;
