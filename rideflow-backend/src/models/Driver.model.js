// const mongoose = require('mongoose');

// const DriverSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   vehicle: {
//     make: String,
//     model: String,
//     plate: String
//   },
//   isAvailable: { type: Boolean, default: true },
//   rating: { type: Number, default: 5 },
//   location: {
//     type: { type: String, enum: ['Point'], default: 'Point' },
//     coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
//   },
//   createdAt: { type: Date, default: Date.now }
// });

// DriverSchema.index({ location: '2dsphere' });

// module.exports = mongoose.model('Driver', DriverSchema);
const mongoose = require('mongoose');


const DriverSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
vehicle: {
make: String,
model: String,
plate: String
},
isAvailable: { type: Boolean, default: true },
rating: { type: Number, default: 5 },
location: {
type: { type: String, enum: ['Point'], default: 'Point' },
coordinates: { type: [Number], default: undefined } // [lng, lat] - default undefined instead of [0,0]
},
createdAt: { type: Date, default: Date.now }
});


DriverSchema.index({ location: '2dsphere' });


module.exports = mongoose.model('Driver', DriverSchema);