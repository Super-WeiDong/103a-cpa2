/*
  app.js -- This creates an Express webserver
*/
// *********************************************************** //
//  Loading packages to support the server
// *********************************************************** //
// First we load in all of the packages we need for the server...
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios")
var MongoDBStore = require('connect-mongodb-session')(session);

// *********************************************************** //
//  Loading models
// *********************************************************** //
const WatchList = require('./models/WatchList')

// *********************************************************** //
//  Connecting to the database 
// *********************************************************** //

const mongoose = require( 'mongoose' );

const mongodb_URI = process.env.mongodb_URI
//const mongodb_URI = 'mongodb+srv://weidong:123123123abc@cpa03db.b4ypo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});


// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

var store = new MongoDBStore({
  uri: mongodb_URI,
  collection: 'mySessions'
});

// Catch errors
store.on('error', function(error) {
  console.log(error);
});

app.use(require('express-session')({
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");



// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
  session({
    secret: "zzzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
    resave: false,
    saveUninitialized: false
  })
);

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //
// specify that the server should render the views/index.ejs page for the root path
// and the index.ejs code will be wrapped in the views/layouts.ejs code which provides
// the headers and footers for all webpages generated by this app
app.get("/", (req, res, next) => {
  res.render("index");
});

app.get("/add", (req, res, next) => {
  res.render("add");
});

app.get("/list", 
async (req, res, next) => {
    let items = await WatchList.find({});
    res.locals.items = items;
    res.render("watchlist");
});
/* ************************
  Functions needed for the course finder routes
   ************************ */

  app.post("/addfilm", (req, res, next) => {
    try{
      const name = req.body.name;
      const category = req.body.category;
      const runtime = req.body.runtime;
      const language = req.body.language;
      let data = {name, category, runtime, language}
      let item = new WatchList(data)
      item.save();
      res.redirect("/list")
    } catch(e) {
      next(e)
    }
  })

  app.get("/watchlist/delete/:itemId", 
  async (req, res, next) => {
      try{
        const id = req.params.itemId;
        await WatchList.deleteOne({_id:id});
        res.redirect("/list")
      } catch(e){
        next(e)
      }
  });


app.post('/films/byLanguage',
  // show list of courses in a given subject
  async (req,res,next) => {
    const {language} = req.body;
    const films = await WatchList.find({language:{'$regex': language,$options:'i'}}).sort({runtime:1})
    res.locals.films = films
    res.render('searchlist')
  }
)

app.post('/films/byCategory',
  // show list of courses in a given subject
  async (req,res,next) => {
    const {category} = req.body;
    const films = await WatchList.find({category:{'$regex': category,$options:'i'}}).sort({runtime:1})
    res.locals.films = films
    res.render('searchlist')
  }
)

app.post(
  '/films/byWord',
  async (req, res, next) => {
    const {word} = req.body;
    const films = await WatchList.find({
      name: eval('/' + word + '/i')
    }).sort({runtime: 1});

    res.locals.films = films;
    res.render('searchlist');
  }
);

app.post(
  '/films/byTime1',
  async (req, res, next) => {
    const {runtime} = req.body;
    const films = await WatchList.find({
      runtime: {$lt:runtime}
    })
    res.locals.films = films;
    res.render('searchlist');
  }
);

app.post(
  '/films/byTime2',
  async (req, res, next) => {
    const {runtime} = req.body;
    const films = await WatchList.find({
      runtime: {$gt:runtime}
    })
    res.locals.films = films;
    res.render('searchlist');
  }
);


// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)
const port = process.env.PORT || "5000";
console.log('connecting on port '+port)

app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const { reset } = require("nodemon");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;
