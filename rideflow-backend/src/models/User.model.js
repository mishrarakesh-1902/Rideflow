// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const UserSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   phone: { type: String },
//   password: { type: String, required: true },
//   role: { type: String, enum: ['user', 'driver', 'admin' , 'rider'], default: 'user' },
//   createdAt: { type: Date, default: Date.now }
// });

// UserSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// UserSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// module.exports = mongoose.model('User', UserSchema);


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver'], default: 'rider' },
  // Driver-specific
  vehicle: { type: String },
  rating: { type: Number, default: 5 },
  isOnline: { type: Boolean, default: false },
  location: { type: pointSchema, index: '2dsphere' },
  // meta
  createdAt: { type: Date, default: Date.now }
});

// hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
