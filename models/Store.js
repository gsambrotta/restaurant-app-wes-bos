const mongoose = require('mongoose')
// when querying db, there are different ways to wait for your data coming back form db(async):
// built-in callback
// external library promises
// use js native Promise -> that's what we use here.
mongoose.Promise = global.Promise
const slug = require('slugs')

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Please enter a store name',
    },
    slug: String,
    description: {
      type: String,
      trim: true,
    },
    tags: [String], // array of string
    created: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: {
        type: String,
        default: 'Point',
      },
      coordinates: [
        {
          type: Number,
          required: 'You must supply coordinated',
        },
      ],
      address: {
        type: String,
        required: 'You must supply an address',
      },
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User', // Schema User
      required: 'You must supply an author',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// create a virtual field
// we basically say: reference to this other Schema
// from that Schema take field store and check if is the same of this Schema field id
// if so, populate this virtual field called reviews.
// We can't just do populate here bc is not just one id.

// Maybe we could save in StoreSchema reviews: [ObjectId]
// and then in storeController grab reviews and do the same check we do here
// but is probably more expensive then pre populate since will require grabbing two set of data(Stores and Reviews)
// expensive operations, more close to the model they are, better it is.
storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //field on the store Schema
  foreignField: 'store', //field on review Schema
})

storeSchema.index({
  title: 'text',
  description: 'text',
})

storeSchema.index({
  location: '2dsphere',
})

// func that run before saving data
storeSchema.pre('save', async function(next) {
  // no arrow func bc need access to 'this'
  // if 'name' didn't change
  if (!this.isModified('name')) {
    return next()
  }

  this.slug = slug(this.name)
  //== Make unique slugs

  // regex to find any slug that is the same of the current one (or the same + "-Number")
  const slugRegex = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, 'i')
  // Store.find() -> can't do it bc we haven't create the Store yet so it doesn't exist.
  // How do we do it? this.constructor > at running time it will be equal to Store
  const storesWithSlug = await this.constructor.find({ slug: slugRegex })
  if (storesWithSlug.length) {
    // if we already have the slug
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`
  }
  next()
})

function autopopulate(next) {
  this.populate('reviews')
  next()
}

storeSchema.pre('find', autopopulate)
storeSchema.pre('findOne', autopopulate)

// add method to Schema
storeSchema.statics.getTagsList = function() {
  // aggregate: mongodb method
  return this.aggregate([
    { $unwind: '$tags' }, // divide/dupilcate a store for each tag
    { $group: { _id: '$tags', count: { $sum: 1 } } }, // group based on tag fild and create new field "count" which value is n+1
    { $sort: { count: -1 } }, // sorting by count
  ])
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    //lookup stores and populate their reviews
    {
      $lookup: {
        from: 'reviews', // This is Review Schema. Mongo automatically lowercase and add 's' at the end
        localField: '_id',
        foreignField: 'store',
        as: 'reviews', // name of the new field on StoreSchema
      },
    },
    //filter store with 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } } }, // reviews.1 is the 2nd el on array
    // Add averageRating field
    // $addField is mongo operator to add to existing pipeline. We can't use it bc our provider give this just to pay users.
    // $project is mongo operator to add to existing pipeline but doesn't return all the rest.
    // $avg -> mongo operator to calculate average
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: { $avg: '$reviews.rating' },
      },
    },
    // sort by averageRating
    { $sort: { averageRating: -1 } },
    { $limit: 10 },
  ])
}

module.exports = mongoose.model('Store', storeSchema)
