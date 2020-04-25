const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const md5 = require('md5')
const validator = require('validator')
const mongodbErrorHandler = require('mongoose-mongodb-errors')
const passportLocalMongoose = require('passport-local-mongoose')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email'],
    required: 'Please supply an email address',
  },
  name: {
    type: String,
    trim: true,
    required: 'Please supply a name',
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Store',
    },
  ],
})

userSchema.index({
  hearts: 'text',
})

userSchema.virtual('gravatar').get(function() {
  const hash = md5(this.email)
  return `https://gravatar.com/avatar/${hash}?s=200`
})

// add plugin to Schema 1arg=> plugin, 2arg=> opts
// i want to use email as login field
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' })
userSchema.plugin(mongodbErrorHandler) // nice error hanlder

module.exports = mongoose.model('User', userSchema)
