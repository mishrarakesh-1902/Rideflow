// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true
//     });
//     console.log(`MongoDB connected: ${conn.connection.host}`);
//   } catch (err) {
//     console.error('MongoDB connection error:', err.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;


const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rideflow';
  const maskedUri = primaryUri.replace(/:([^@]+)@/, ':****@');
  console.log(`Connecting to MongoDB: ${maskedUri}`);
  try {
    await mongoose.connect(primaryUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    if (primaryUri !== 'mongodb://localhost:27017/rideflow') {
      console.warn(`⚠️ Primary DB connection failed (${err.message}). Falling back to local MongoDB...`);
      try {
        await mongoose.connect('mongodb://localhost:27017/rideflow', {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully to local fallback');
        return;
      } catch (localErr) {
        console.error('❌ Failed to connect to local fallback DB', localErr);
      }
    }
    throw err;
  }
};

module.exports = connectDB;
