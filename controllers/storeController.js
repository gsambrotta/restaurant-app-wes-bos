const mongoose = require('mongoose')
const Store = mongoose.model('Store')
const User = mongoose.model('User')
const multer = require('multer')
const jimp = require('jimp')
const uuid = require('uuid')

const multerOptions = {
  storage: multer.memoryStorage(), // tell to multer where to save img. We save in memory bc we want to save in storage just the cropped version.
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/')
    if (isPhoto) {
      // typical Nodejs pattern:
      // if just 1 arg, is usually an error
      // if null, value, is usually ok and passing the data
      next(null, true)
    } else {
      next({ message: 'This file type isnt allow' }, false)
    }
  },
}
// middleware to work with createStore
exports.upload = multer(multerOptions).single('photo')

//save img/upload, resize, give it to createStore
exports.resize = async (req, res, next) => {
  if (!req.file) {
    return next()
  }

  const extension = req.file.mimetype.split('/')[1]
  // we saved req.body so we can put stuff on the body obj and will be saved directly to db in createStore
  req.body.photo = `${uuid.v4()}.${extension}`
  // resize
  const photo = await jimp.read(req.file.buffer)
  await photo.resize(800, jimp.AUTO)
  // write resized photo to file system
  await photo.write(`./public/uploads/${req.body.photo}`)
  next()
}

exports.homePage = (req, res) => {
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' })
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id
  // const store = new Store(req.body)
  // await store.save() // fire connection to db, save and come back with res
  // Above is not good anymore because it doesn't include slug which is process after save
  const store = await new Store(req.body).save()
  req.flash(
    'success',
    `Successfully created <strong>${store.name}</strong>. Care leaving a review?`
  )
  res.redirect(`/store/${store.slug}`)
}

exports.getStores = async (req, res) => {
  const isPageNumber = req.params.page === 0 || undefined
  const page = isPageNumber ? req.params.page : 1
  const limit = 4
  const skip = page * limit - limit

  // Query db for lists of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' })

  const countPromise = Store.count()

  const [stores, count] = await Promise.all([storesPromise, countPromise])
  const pages = Math.ceil(count / limit)
  if (!stores.length) {
    req.flash(
      'info',
      `Page ${page} doesn't existing. You have been redirect at the end, on page ${pages}`
    )
    res.redirect(`/stores/page/${pages}`)
    return
  }

  res.render('stores', { title: 'Stores', stores, count, page, pages })
}

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it')
  }
}

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id })
  //confirm is the owner of the store
  confirmOwner(store, req.user)
  res.render('editStore', { title: 'Edit Store', store })
}

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point'
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store instead of old one
    runValidators: true, // check Schema and validate
  }).exec()
  req.flash(
    'success',
    `Successfully update store <strong>${store.name}</strong>. <a href='/stores/${store.slug}'>View Store</a>`
  )
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    'author reviews'
  )
  if (!store) {
    console.log('error finding store')
    return next()
  }

  res.render('store', { store, title: store.name })
}

exports.getStoreByTag = async (req, res, next) => {
  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }
  const [tags, stores] = await Promise.all([
    Store.getTagsList(),
    Store.find({ tags: tagQuery }),
  ])
  res.render('tag', { tags, tag, stores, title: 'Tags' })
}

exports.searchStores = async (req, res) => {
  const stores = await Store.find(
    { $text: { $search: req.query.q } }, //search all indexes with type text
    { score: { $meta: 'textScore' } } //$meta -> invisible mongo metadata
  )
    .sort({
      score: { $meta: 'textScore' },
    })
    .limit(5)
  res.json(stores)
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat)
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: 10000, //is in meter -> 10km
      },
    },
  }

  const stores = await Store.find(q)
    .select('slug name description photo location')
    .limit(10)

  res.json(stores)
}

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' })
}

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString())
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet' //addToSet is like push but unique
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  )

  res.json(user)
}

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores()
  res.render('topStores', { stores, title: 'Top Stores!' })
}
