/*
Docu
Minimum to send an email
transport.sendMail({
  from: 'Gio <gio@gio.com>',
  to: 'someone@example.com',
  subject: 'This is really important',
  html: 'Hello!! <strong>Surprise</strong>',
  text: 'Hello!! **Surprise**',
})
*/

const nodemailer = require('nodemailer')
const pug = require('pug')
const juice = require('juice')
const htmlToText = require('html-to-text')
const promisify = require('es6-promisify')

// manage different way to sending emails
const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

const generateHTML = (filename, opts = {}) => {
  const html = pug.renderFile(
    `${__dirname}/../views/email/${filename}.pug`,
    opts
  )
  const inlined = juice(html) // inline all the css to html for email clients
  return inlined
}

exports.send = async options => {
  const html = generateHTML(options.filename, options)
  const mailOptions = {
    form: 'Gio <noreplay@gio.com>',
    to: options.user.email,
    subject: options.subject,
    html,
    text: htmlToText.fromString(html),
  }

  const sendMail = promisify(transport.sendMail, transport)
  return sendMail(mailOptions)
}
