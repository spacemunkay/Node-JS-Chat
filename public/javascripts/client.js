var CONFIG = { debug: false
             , nick: "#"   // set in onConnect
             , id: null    // set in onConnect
             , last_message_time: 1
             , focus: true //event listeners bound in onConnect
             , unread: 0 //updated in the message-processing loop
             };

var nicks = [];

//  CUT  ///////////////////////////////////////////////////////////////////
/* This license and copyright apply to all code until the next "CUT"
http://github.com/jherdman/javascript-relative-time-helpers/

The MIT License

Copyright (c) 2009 James F. Herdman

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


 * Returns a description of this past date in relative terms.
 * Takes an optional parameter (default: 0) setting the threshold in ms which
 * is considered "Just now".
 *
 * Examples, where new Date().toString() == "Mon Nov 23 2009 17:36:51 GMT-0500 (EST)":
 *
 * new Date().toRelativeTime()
 * --> 'Just now'
 *
 * new Date("Nov 21, 2009").toRelativeTime()
 * --> '2 days ago'
 *
 * // One second ago
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime()
 * --> '1 second ago'
 *
 * // One second ago, now setting a now_threshold to 5 seconds
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime(5000)
 * --> 'Just now'
 *
 */
Date.prototype.toRelativeTime = function(now_threshold) {
  var delta = new Date() - this;

  now_threshold = parseInt(now_threshold, 10);

  if (isNaN(now_threshold)) {
    now_threshold = 0;
  }

  if (delta <= now_threshold) {
    return 'Just now';
  }

  var units = null;
  var conversions = {
    millisecond: 1, // ms    -> ms
    second: 1000,   // ms    -> sec
    minute: 60,     // sec   -> min
    hour:   60,     // min   -> hour
    day:    24,     // hour  -> day
    month:  30,     // day   -> month (roughly)
    year:   12      // month -> year
  };

  for (var key in conversions) {
    if (delta < conversions[key]) {
      break;
    } else {
      units = key; // keeps track of the selected key over the iteration
      delta = delta / conversions[key];
    }
  }

  // pluralize a unit when the difference is greater than 1.
  delta = Math.floor(delta);
  if (delta !== 1) { units += "s"; }
  return [delta, units].join(" ");
};

/*
 * Wraps up a common pattern used with this plugin whereby you take a String
 * representation of a Date, and want back a date object.
 */
Date.fromString = function(str) {
  return new Date(Date.parse(str));
};

//  CUT  ///////////////////////////////////////////////////////////////////

/*
 *  Handle cookies
 *
  docCookies = {
  getItem: function (sKey) {
    if (!sKey || !this.hasItem(sKey)) { return null; }
    return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
  },
  /**
  * docCookies.setItem(sKey, sValue, vEnd, sPath, sDomain, bSecure)
  *
  * @argument sKey (String): the name of the cookie;
  * @argument sValue (String): the value of the cookie;
  * @optional argument vEnd (Number, String, Date Object or null): the max-age in seconds (e.g., 31536e3 for a year) or the
  *  expires date in GMTString format or in Date Object format; if not specified it will expire at the end of session; 
  * @optional argument sPath (String or null): e.g., "/", "/mydir"; if not specified, defaults to the current path of the current document location;
  * @optional argument sDomain (String or null): e.g., "example.com", ".example.com" (includes all subdomains) or "subdomain.example.com"; if not
  * specified, defaults to the host portion of the current document location;
  * @optional argument bSecure (Boolean or null): cookie will be transmitted only over secure protocol as https;
  * @return undefined;
  **/
/**
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/.test(sKey)) { return; }
    var sExpires = "";
    if (vEnd) {
      switch (typeof vEnd) {
        case "number": sExpires = "; max-age=" + vEnd; break;
        case "string": sExpires = "; expires=" + vEnd; break;
        case "object": if (vEnd.hasOwnProperty("toGMTString")) { sExpires = "; expires=" + vEnd.toGMTString(); } break;
      }
    }
    document.cookie = escape(sKey) + "=" + escape(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
  },
  removeItem: function (sKey) {
    if (!sKey || !this.hasItem(sKey)) { return; }
    var oExpDate = new Date();
    oExpDate.setDate(oExpDate.getDate() - 1);
    document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/";
  },
  hasItem: function (sKey) { return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie); }
};
*/

//updates the users link to reflect the number of active users
function updateUsersLink ( ) {
  var t = nicks.length.toString() + " user";
  if (nicks.length != 1) t += "s";
  $("#usersLink").text(t);
}

//handles another person joining chat
function userJoin(nick, gravatar, timestamp) {
  //put it in the stream
  addMessage(nick, "joined", timestamp, "join");

  //add user icon
  addUser(nick);

  //if we already know about this user, ignore it
  for (var i = 0; i < nicks.length; i++)
    if (nicks[i] == nick) return;
  //otherwise, add the user to the list
  nicks.push(nick);
  //update the UI
  updateUsersLink();
}

function addUser(nick){
  if( !($("li#"+nick).length > 0) ){
    $("#user_list").append('<li id="'+nick+'">'+'<img alt="'+nick+'" class="user_icon" src="http://api.twitter.com/1/users/profile_image/'+nick+'?size=normal" >'+'</li>'); 
  }
}

function removeUser(nick){
  $("#"+nick).remove();
  if( nick === CONFIG.nick && has_logged_out === false && first_poll !== true){
    alert("You logged in elsewhere");
    logout();
  }
}

//handles someone leaving
function userPart(nick, timestamp) {
  //put it in the stream
  addMessage(nick, "left", timestamp, "part");
  removeUser(nick);
  //remove the user from the list
  for (var i = 0; i < nicks.length; i++) {
    if (nicks[i] == nick) {
      nicks.splice(i,1)
      break;
    }
  }
  //update the UI
  updateUsersLink();
}

// utility functions

util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s^<]*(\?\S+)?)?)?/g, 

  //cross your fingers
  //imageUrlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s^<]*\.(?:jpeg|jpg|png|gif)(\?\S+)?)+)+/g, 
  imageUrlRE: /https?:\/\/(?:[a-z\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:jpe?g|gif|png)/g,

  //  html sanitizer 
  toStaticHTML: function(inputHtml) {
    inputHtml = inputHtml.toString();
    return inputHtml.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br>");
  }, 

  //pads n with zeros on the left,
  //digits is minimum length of output
  //zeroPad(3, 5); returns "005"
  //zeroPad(2, 500); returns "500"
  zeroPad: function (digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  },

  //it is almost 8 o'clock PM here
  //timeString(new Date); returns "19:49"
  timeString: function (date) {
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },

  //does the argument only contain whitespace?
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !== null);
  }
};

//used to keep the most recent messages visible
function scrollDown () {
  window.scrollBy(0, 100000000000000000);
  $("#entry").focus();
}

//inserts an event into the stream for display
//the event may be a msg, join or part type
//from is the user, text is the body and time is the timestamp, defaulting to now
//_class is a css class to apply to the message, usefull for system events
function addMessage (from, text, time, _class) {
  if (text === null){
    return;
  }

  if (time == null) {
    // if the time is null or undefined, use the current time.
    time = new Date();
  } else if ((time instanceof Date) === false) {
    // if it's a timestamp, interpret it
    time = new Date(time);
  }

  //every message you see is actually a table with 3 cols:
  //  the time,
  //  the person who caused the event,
  //  and the content
  var messageElement = $(document.createElement("table"));

  messageElement.addClass("message");
  if (_class)
    messageElement.addClass(_class);
  messageElement.attr("id", from+"_"+parseInt(time));

  // sanitize
  text = util.toStaticHTML(text);

  // If the current user said this, add a special css class
  var nick_re = new RegExp(CONFIG.nick);
  if (nick_re.exec(text))
    messageElement.addClass("personal");

  // get any image URLs 
  var imgURLs = text.match( util.imageUrlRE );

  // replace URLs with links
  text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');
  
  //add image tags for image URLs
  if ( imgURLs!= null ){
    for ( key in imgURLs ){
      text = ('<img class="msg-image" src="'+ imgURLs[key] + '">') + text;
    }
  }

  var content = '<tr>'
              + '  <td class="date">' + util.timeString(time) + '</td>'
              + '  <td class="nick">' + util.toStaticHTML(from) + '</td>'
              + '  <td class="msg-text">' + text  + '</td>'
              + '</tr>'
              ;
  messageElement.html(content);

  //the log is the stream that we view
  $("#log").append(messageElement);

  //always view the most recent message when it is added
  scrollDown();
  setTimeout( scrollDown, 1000);
}

function updateRSS () {
  var bytes = parseInt(rss);
  if (bytes) {
    var megabytes = bytes / (1024*1024);
    megabytes = Math.round(megabytes*10)/10;
    $("#rss").text(megabytes.toString());
  }
}

function updateUptime () {
  if (starttime) {
    $("#uptime").text(starttime.toRelativeTime());
  }
}

var transmission_errors = 0;
var first_poll = true;
var has_logged_out = false;


//process updates if we have any, request updates from the server,
// and call again with response. the last part is like recursion except the call
// is being made from the response handler, and not at some point during the
// function's execution.
function longPoll (data) {
  if (transmission_errors > 2) {
    logout();
    return;
  }

  if ( has_logged_out ){
    return;
  }

  if (data && data.rss) {
    rss = data.rss;
    updateRSS();
  }

  //process any updates we may have
  //data will be null on the first call of longPoll
  if (data && data.messages) {
    for (var i = 0; i < data.messages.length; i++) {
      var message = data.messages[i];

      //track oldest message so we only request newer messages from server
      if (message.timestamp >= CONFIG.last_message_time) {

        CONFIG.last_message_time = message.timestamp;

        //dispatch new messages to their appropriate handlers
        switch (message.type) {
          case "msg":
            if(!CONFIG.focus){
              CONFIG.unread++;
            }
            addMessage(message.nick, message.text, message.timestamp);
            break;

          case "join":
            userJoin(message.nick, message.text, message.timestamp);
            break;

          case "part":
            userPart(message.nick, message.timestamp);
            break;
        }
      }
    }

    //update the document title to include unread message count if blurred
    updateTitle();

    //only after the first request for messages do we want to show who is here
    if (first_poll) {
      first_poll = false;
      who();
    }
  }

  //make another request
  $.ajax({ cache: false
         , type: "GET"
         , url: "/recv"
         , dataType: "json"
         , data: { since: CONFIG.last_message_time }
         , error: function (obj, s, e) {
             addMessage("", "long poll error. status:"+s+" error: "+e+"  Trying again...", new Date(), "error");
             transmission_errors += 1;
             //don't flood the servers on error, wait 10 seconds before retrying
             setTimeout(longPoll, 10*1000);
           }
         , success: function (data) {
             transmission_errors = 0;
             //if everything went well, begin another request immediately
             //the server will take a long time to respond
             //how long? well, it will wait until there is another message
             //and then it will return it to us and close the connection.
             //since the connection is closed when we get data, we longPoll again
             console.log(data);
             longPoll(data);
           }
         });
}

//submit a new message to the server
function send(msg) {
  if (CONFIG.debug === false) {
    jQuery.post("/send", {text: msg}, function (data) { }, "json");
  }
}

/**
//Transition the page to the state that prompts the user for a nickname
function showConnect () {
  $("#connect").show();
  $("#register").show();
  $("#loading").hide();
  $("#toolbar").hide();
  $("#nickInput").focus();
}

//transition the page to the loading screen
function showLoad () {
  $("#connect").hide();
  $("#register").hide();
  $("#loading").show();
  $("#toolbar").hide();
}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat (nick) {
  $("#toolbar").show();
  $("#entry").focus();

  $("#connect").hide();
  $("#register").hide();
  $("#loading").hide();

  scrollDown();
}*/

//we want to show a count of unread messages when the window does not have focus
function updateTitle(){
  if (CONFIG.unread) {
    document.title = "(" + CONFIG.unread.toString() + ") node chat";
  } else {
    document.title = "node chat";
  }
}

// daemon start time
var starttime;
// daemon memory usage
var rss;

//handle the server's response to our nickname and join request
function onConnect (session) {
  
  has_logged_out = false;

  //CONFIG.nick = session.nick;
  //CONFIG.id   = session.id;
  starttime   = new Date(/**session.starttime*/);
  //rss         = session.rss;
  //updateRSS();
  //updateUptime();

  //poll for updates
  longPoll();
  
  //listen for browser events so we know to update the document title
  $(window).bind("blur", function() {
    CONFIG.focus = false;
    updateTitle();
  });

  $(window).bind("focus", function() {
    CONFIG.focus = true;
    CONFIG.unread = 0;
    updateTitle();
  });
}

//add a list of present chat members to the stream
function outputUsers () {
  var nick_string = nicks.length > 0 ? nicks.join(", ") : "(none)";
  addMessage("users:", nick_string, new Date(), "notice");
  return false;
}

//get a list of the users presently in the room, and add it to the stream
function who () {
  jQuery.get("/who", {}, function (data, status) {
    if (status != "success") return;
    nicks = data.nicks;
    outputUsers();
  }, "json");
}
errorMsg = function (msg){
  alert(msg);
  showConnect();
  return false;
};


/**
successMsg = function (msg){
  alert("You have been registered. Please log in.");
  showConnect();
  $("#usernameInput").val( $("#reg_usernameInput").attr("value") );
  clearRegisterFields();
  return true;
};
*/
/**
function clearRegisterFields(){
   $("#reg_usernameInput").val("");
   $("#reg_emailInput").val("");
   $("#reg_passInput").val("");
   $("#reg_passConfirmInput").val("");
};
*/

function logout(){
  has_logged_out = true;
  jQuery.post("/part", {}, function (data) { window.location.replace("/logout"); }, "json");
  //docCookies.setItem( "token", "", new Date() );
  //docCookies.setItem( "username", "", new Date() );
  //showConnect();
};

$(document).ready(function() {

  //clear previous httpcookie
  /**
  HttpCookie expiredCookie = new HttpCookie(cookieName);
  expiredCookie.Expires = DateTime.UtcNow.AddDays(-1);
  Response.Cookies.Add(expiredCookie);
  */
  

  //submit new messages when the user hits enter if the message isnt blank
  $("#entry").keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) send(msg);
    $("#entry").attr("value", ""); // clear the entry field.
  });

  $("#usersLink").click(outputUsers);

  $("#logout").click(function () {
    logout();
  });
  
  // update the daemon uptime every 10 seconds
  setInterval(function () {
    updateUptime();
  }, 10*1000);

  if (CONFIG.debug) {
    //$("#loading").hide();
    //$("#connect").hide();
    scrollDown();
    return;
  }

  // remove fixtures
  //$("#log table").remove();
  
  //get the nickname
  CONFIG.nick = $("#user_nick").text();

  onConnect();

/**
  //try registering the user when the user clicks on the registerButton
  $("#registerButton").click(function () {
    //lock the UI while waiting for a response
    showLoad();

    //validations
    var username = $("#reg_usernameInput").attr("value");
    var email = $("#reg_emailInput").attr("value");
    var pass = $("#reg_passInput").attr("value");
    var passConfirm = $("#reg_passConfirmInput").attr("value");
    
    
    try{
      check(username, "Username must be min 4, max 32 chars, alphanumeric only").notNull().len(4,32).isAlphanumeric();
      check(pass, "Password must be min 8, max 128 chars, alphanumeric only for now").notNull().len(8,128).isAlphanumeric();
      check(passConfirm, "Password Confirmation must be same as Password: min 8, max 128 chars, alphanumeric only for now").notNull().len(8,128).isAlphanumeric();
      check(email, "That email is a spy.").notNull().isEmail();
    }catch (e){
      errorMsg(e.message);
      return false;
    }
    if (pass != passConfirm){
      errorMsg("Your password confirmation does not match.");
      return false;
    }
    //make the actual register request to the server
    $.ajax({ cache: false
           , type: "POST" 
           , dataType: "json"
           , url: "/register"
           , data: JSON.stringify({ username: username, pass: pass, email: email })
           , error: function () {
               alert("error connecting to server");
               showConnect();
               return false;
             }
           , success: successMsg
           });
    return false;
  });
*/
  









/**
  //try joining the chat when the user clicks the connect button
  $("#connectButton").click(function () {
    //lock the UI while waiting for a response
    showLoad();
    var username = $("#usernameInput").attr("value");
    var pass = $("#passInput").attr("value");

    //validation
    try{
    check(username, "Username must be min 4, max 32 chars, alphanumeric only").notNull().len(4,32).isAlphanumeric();
    check(pass, "Password must be min 8, max 128 chars, alphanumeric only for now").notNull().len(8,128).isAlphanumeric();
    }catch (e){
      errorMsg(e.message);
      return false;
    }

    //make the actual join request to the server
    $.ajax({ cache: false
           , type: "POST" 
           , dataType: "json"
           , url: "/join"
           , data: JSON.stringify({ username: username, pass: pass })
           , error: function () {
               alert("error connecting to server");
               showConnect();
               return false;
             }
           , success: onConnect
           });
    return false;
  });
*/
  
});


