'use strict';

const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const lodash = require('lodash');
const loggy = require('loggy');
const morgan = require('morgan');

const app = express();
app.set('port', process.env.PORT || 3333);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(compression(6));
app.use(cors());
app.use(express.static(__dirname + '/public'));

if (process.env.DEVELOPMENT) {
  app.use(morgan('combined'));
} else {
  //TODO: production specific logic here
}

const locale = function(path) {
  /**
   * TODO: cleanup locale system
   * The client probably needs to support cookies so
   * we can properly detect a language and render it
   * server side. Right now it's just mirroring the
   * application code defaulting to English.
   */
  return lodash.get(require('./app/locale/en'), path);
};

app.get(
  '/',
  function(req, res) {
    res.render('home', {app: {locale: locale}});
  }
);

app.get(
  '/features',
  function(req, res) {
    res.render('features', {app: {locale: locale}});
  }
);

app.get(
  '/*',
  function(req, res) {
    res.render('app');
  }
);

app.listen(
  app.get('port'),
  function() {
    loggy.info('started application on port', app.get('port'));
  }
);
