/**
 * dmcoderepo.js
 *
 * Application Configuration file
 */

// Including extra Packages
var express = require('express') // Express Framework
var mysql = require('mysql') // Mysql Driver
var connection = require('express-myconnection') // Mysql Driver Helper
var path = require('path') // Path creation helper
var fs = require('fs') // File read and write helper
var cookieParser = require('cookie-parser') // Cookie data parser
var session = require('express-session') // Session Helper
var bodyParser = require('body-parser') // HTTP POST data parser
var csrf = require('csurf') // CSRF helper
var passport = require('passport') // Authenication helper
var LocalStrategy = require('passport-local') // Local Authenication helper
var expressFileUpload = require('express-fileupload') // File upload helper
var bcrypt = require('bcrypt') // Password encryption helper
var Sequelize = require('sequelize') // ORM
var Acl = require('acl') // RBAC Helper
var AclSeq = require('acl-sequelize') // RBAC database helper
var helmet = require('helmet') // HTTP header protection

// Configuring  csrf and bodyParser middlewares
var csrfProtection = csrf({ cookie: true })
var parseForm = bodyParser.urlencoded({ extended: false })
var config = require('./lib/config')

// Creating express object
var app = express()

// Helmets middleware added to secure app
// by setting various HTTP headers
app.use(helmet())

// Setting Loggers
var logger = require('./lib/logger')
app.locals.logger = logger
app.use(require('morgan')('combined', { 'stream': logger.stream }))

// Sets View Engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))

// Adding th public folder as static folder to server css, js and images files
app.use(express.static(path.join(__dirname, 'public')))

// Database connection string
app.use(connection(mysql, config.db))

// Adding CSRF middleware
app.use(cookieParser())

// Setting Session
app.use(session(config.session))

app.locals.csrfProtection = csrfProtection
app.locals.parseForm = parseForm
// app.locals.parseFileUploads = parseFileUploads;
app.use(parseForm)
app.use(expressFileUpload())

// flash message middleware
app.use(require('flash')())
app.use(function (req, res, next) {
  // Since passport flash is not working, we will
  // pass data session and set from flash here
  // then delete the data from session
  if (req.session.authFlash) {
    req.flash(
      req.session.authFlash.type,
      req.session.authFlash.message
    )
    delete req.session.authFlash
  }

  // if there's a flash message, transfer
  // it to the context, then clear it
  res.locals.flash = req.session.flash
  if (req.session.flash) {
    delete req.session.flash
  }
  next()
})

// ======================== Authorization Configuration ======================

var Domain = require('./models/orm/Domain')
app.locals.Domain = Domain

var User = require('./models/orm/User')
app.locals.User = User
// Configuring the local strategy for use by Passport.
passport.use('login', new LocalStrategy({
  passReqToCallback: true
},
function (req, email, password, cb) {
  // Validating before querying
  if (email === '') {
    req.session.authFlash = {
      type: 'loginStatus',
      message: 'Email provided is empty'
    }
    return cb(null, false)
  }

  if (password === '') {
    req.session.authFlash = {
      type: 'loginStatus',
      message: 'Password provided is empty'
    }
    return cb(null, false)
  }

  if (email && password) {
    User.findOne({
      where: {
        email: email
      }
    }).then(function (user) {
      let userData = JSON.stringify(user)
      if (userData !== 'null') {
        bcrypt.compare(password, user.password, function (err, res) {
          if (err) {
            logger.error(err)
            req.session.authFlash = {
              type: 'loginStatus',
              message: 'Sorry, Error occurred during password verification'
            }
            return cb(null, false)
          }
          if (res) {
            return cb(null, user)
          } else {
            req.session.authFlash = {
              type: 'loginStatus',
              message: 'Incorrect password'
            }
            return cb(null, false)
          }
        })
      } else {
        // Setting login status since passport flash is not working
        req.session.authFlash = {
          type: 'loginStatus',
          message: 'Incorrect username or password.'
        }
        return cb(null, false)
      }
    })
  }
}))

// Configure Passport authenticated session persistence.
passport.serializeUser(function (user, cb) {
  cb(null, user.user_id)
})

passport.deserializeUser(function (id, cb) {
  User.findOne({
    where: {
      user_id: id
    }
  }).then(function (user) {
    let userData = JSON.stringify(user)

    if (userData !== 'null') {
      cb(null, user)
    } else {
      cb(new Error('Invalid User'), false)
    }
  })
})

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize())
app.use(passport.session())
app.locals.passport = passport

// ======================== RBAC Configuring ========================
var ormConnection = new Sequelize(
    config.orm.db,
    config.orm.user,
    config.orm.password, {
      // Disables console logging queries
      logging: false
    }
)
var acl = new Acl(new AclSeq(ormConnection, { prefix: 'acl_' }))
app.locals.acl = acl
// var rbac = require('./models/Rbac')
// need to run only once to create permissions
// rbac.setRole(acl)

// dynamically include routes (Controller)
fs.readdirSync('./controllers').forEach(function (file) {
  if (file.substr(-3) === '.js') {
    var route = require('./controllers/' + file)
    route.controller(app)
  }
})

// 404 catch-all handler (middleware)
app.use(function (req, res, next) {
  res.status(404)
  res.render('404')
})

// 500 error handler (middleware)
app.use(function (err, req, res, next) {
  logger.error(err.stack)
  res.status(500)
  res.render('500')
})

module.exports = app
