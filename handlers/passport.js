const mongoose = require('mongoose')
const passport = require('passport')
const User = mongoose.model('User')

passport.use(User.createStrategy()) // createStrategy -> passportLocalMongoose
// login to passport and then we need to tell which info
// we want on each request -> we want user info
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
