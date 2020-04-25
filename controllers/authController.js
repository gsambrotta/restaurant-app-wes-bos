const passport = require('passport')
const crypto = require('crypto')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const promisify = require('es6-promisify')
const mail = require('../handlers/mail')

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are successfully login',
})

exports.logout = (req, res) => {
  req.logout()
  req.flash('success', 'You are now logged out.')
  res.redirect('/')
}

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next()
  }
  req.flash('error', 'You must be logged in to go there')
  res.redirect('/')
}

exports.forgot = async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    // no msg like: this email doesn't exists bc you are says:
    // yes we save emails and we have a db of email, which can be stolen
    req.flash('info', 'If an account exists, you will get an email')
    return res.redirect('/login')
  }

  // reset token and expires on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex')
  user.resetPasswordExpires = Date.now() + 3600000 //1h from now
  await user.save()

  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
  req.flash('success', `You have been emailed a password reset link`)

  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset',
  })
  res.redirect('/login')
}

exports.reset = async (req, res) => {
  const token = req.params.token
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }, //$gt mongo db for greater then
  })

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }

  res.render('resetPassword', { title: 'Reset your password' })
}

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    return next()
  }

  req.flash('error', 'Password do not match')
  res.redirect('back')
}

exports.updatePasswords = async (req, res) => {
  const token = req.params.token
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }, //$gt mongo db for greater then
  })

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }

  const setPassword = promisify(user.setPassword, user)
  await setPassword(req.body.password)
  user.resetPasswordExpires = undefined
  user.resetPasswordToken = undefined
  const updatedUser = await user.save()

  await req.login(updatedUser)

  req.flash(
    'success',
    'Nice! Your password has been reset! You are now loggedin'
  )
  res.redirect('/')
}
