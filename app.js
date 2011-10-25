
/**
 * Module dependencies.
 */
var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);

var express = require('express');

var app = module.exports = express.createServer();

var OAuth= require('oauth').OAuth;
var oa = new OAuth(
"request_token",
"access_token",
"token",
"token",
"1.0",
"http://localhost:3000/auth/twitter/callback",
"HMAC-SHA1"
);

var sqlite3 = require('sqlite3').verbose()
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    hashlib = require('hashlib'),
    utils = require('./utils');

app.use(express.cookieParser());
app.use(express.session({ secret: "my baby's got a secret" }));
app.use(express.bodyParser());

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

//Errors
/**
function NotFound(msg){
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}
NotFound.prototype.__proto__ = Error.prototype;
app.get('/404', function(req, res){
  throw new NotFound;
});
app.use(app.router);
app.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade');
    } else {
        next(err);
    }
});
*/
var MESSAGE_BACKLOG = 200;
//---------------------------------------------------------------------------------//
var channel = new function () {
  var messages = [],
      callbacks = [];

  this.appendMessage = function (nick, type, text) {
    var m = { nick: nick
            , type: type // "msg", "join", "part"
            , text: text
            , timestamp: (new Date()).getTime()
            };

    switch (type) {
      case "msg":
        console.log("<" + nick + "> " + text);
        break;
      case "join":
        console.log(nick + " join" + "("+text+")");
        break;
      case "part":
        console.log(nick + " part");
        break;
    }
    
    if (messages.length > 0){
      previousMsg = messages[messages.length-1];
      if( previousMsg.timestamp === m.timestamp){
        m.timestamp += 1;
      }
    }
    messages.push( m );

    while (callbacks.length > 0) {
      callbacks.shift().callback([m]);
    }

    while (messages.length > MESSAGE_BACKLOG) {
      messages.shift();
    }
    
  };

  this.query = function (since, callback) {
    var matching = [];
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (message.timestamp > since)
        matching.push(message)
    }

    if (matching.length != 0) {
      callback(matching);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };

  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 3000);
};
//------------------------------------------------------------------------//



// Routes /////////////////////////////////////////////////////////////////
//logout
app.get('/logout', function(req, res){
  if(req.session.nick){
    req.session.destroy(); 
  }
  res.render('logout', {
    rando: Math.round(Math.random())
  });
});

app.get('/', function(req, res){
  if(!req.session.nick){
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
      if (error) {
        console.log(error);
        res.send("yeah no. didn't work.")
      }
      else {
        req.session.oauth = {};
        req.session.oauth.token = oauth_token;
        //console.log(req.session.oauth.token);
        console.log('oauth.token: ' + req.session.oauth.token);
        req.session.oauth.token_secret = oauth_token_secret;
        console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
        res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
        return;
      }
    });
  }else{
    res.render('chat', {
            nick: req.session.nick
    });
  }
});

app.get('/auth/twitter/callback', function(req, res, next){
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
    function(error, oauth_access_token, oauth_access_token_secret, results){
      if (error){
        console.log(error);
        res.send("yeah something broke.");
      } else {
        req.session.oauth.access_token = oauth_access_token;
        req.session.oauth,access_token_secret = oauth_access_token_secret;
        console.log(results);

        //Join the chat.
        req.session.nick = results.screen_name;
        channel.appendMessage(req.session.nick, "join");
        res.render('chat', {
            nick: req.session.nick
        });
      }
    });
  } else {
    next(new Error("you're not supposed to be here."))
  }
});

app.post('/send', function (req, res) {
  console.log(req.body);
  var text = req.body.text;
  
  if( req.session.nick ){
    channel.appendMessage(req.session.nick, "msg", text);
    console.log("Call to Send")
    res.json({ rss: mem.rss }, 200);
    return;
  }else{
    res.json(400, { error: "Log in, then we'll talk." });
    return;
  }
});

app.get("/recv", function (req, res){
  console.log(req.query);
  var since = parseInt( req.query.since, 10);
  
  if(req.session.nick){
    channel.query(since, function (messages) {
          console.log("Call to Recv Success")
          res.json({ messages: messages, rss: mem.rss }, 200);
          return;
        });
  }else{
    res.json({ error: "You gotta log in, dawg."}, 400);
    console.log("Call to Recv Failure")
    return;
  }
});

app.get("/who", function (req, res) {
  var nicks = [];
  
  req.sessionStore.all( function(obj, data){
    //TODO there's a bug here, sometimes data returns
    //something that JSON can parse, sometimes not.
    //better to evaluate it as an object literal so
    //the JSON parser doesn't complain. But some users
    //go unnoticed.
    if(data){
      nicks.push(eval( "("+data+")").nick);
    }
  });
  
  res.json({ nicks: nicks, rss: mem.rss}, 200);
});

app.post("/part", function (req, res) {
  if(req.session.nick){
    channel.appendMessage(req.session.nick, "part");
    req.session.destroy();
    res.send({ rss: mem.rss }, 200);
  }else{
    res.json({ error: "Trick, you weren't even logged in." }, 400);
  }
});
//////////////////////////////////////////////////////////////////////////////



app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
