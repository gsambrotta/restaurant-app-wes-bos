const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const reviewSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
    required: 'Please write a review',
  },
  created: {
    type: Date,
    default: Date.now,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author',
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'You must supply a store',
  },
})

// why not create a virtual field, like in store/review?
function autopopulate(next) {
  // populate check in the document in db this field and populate it here
  // how does mongo knows which author and from which other Schema take it? check storeSchema author id?
  // so the two fields must have the same name?
  // --> Mongoose knows about Schema because in StoreSchema we specify the ref.
  // --> when we say populate: it just go to UserSchema and look for entry with that id.
  // therefore the two field don't need same name since one is a field the other is a whole entry.
  this.populate('author')
  next()
}

// func that run before saving data
reviewSchema.pre('find', autopopulate) // whenever the command storeSchema.find() it will run this fn
reviewSchema.pre('findOne', autopopulate)

module.exports = mongoose.model('Review', reviewSchema)
