// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const morgan = require('morgan');
// const bodyParser = require('body-parser');
// const connectDB = require('./src/config/db');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Connect DB
// connectDB();

// // Middlewares
// // app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true // if you are sending cookies or auth headers
// }));

// app.use(morgan('dev'));
// app.use(bodyParser.json({ limit: '10mb' }));
// app.use(bodyParser.urlencoded({ extended: true }));

// // Routes
// app.use('/api/auth', require('./src/routes/auth.routes'));
// app.use('/api/users', require('./src/routes/users.routes'));
// app.use('/api/drivers', require('./src/routes/drivers.routes'));
// app.use('/api/bookings', require('./src/routes/bookings.routes'));
// app.use('/api/payments', require('./src/routes/payments.routes'));

// app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
// const { initSockets } = require('./src/socket');
// const connectDB = require('./src/config/db');

// const authRoutes = require('./src/routes/auth.routes');
// const driverRoutes = require('./src/routes/drivers.routes');
// // const bookingRoutes = require('./src/routes/bookings.routes');
// const rideRoutes = require('./src/routes/ride.routes');
// const paymentRoutes = require('./src/routes/payments.routes');
// const mapboxRoutes = require('./src/routes/mapbox.routes');

// const app = express();
// const server = http.createServer(app);

// // middlewares
// app.use(helmet());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));
// app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
// app.use(limiter);

// // routes
// app.use('/api/auth', authRoutes);
// app.use('/api/driver', driverRoutes);
// app.use('/api/ride', rideRoutes);
// // app.use('/api/bookings', bookingRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/mapbox', mapboxRoutes);

// // health
// app.get('/api/health', (req, res) => res.json({ ok: true }));

// // near your other route mounts
// // const rideRoutes = require('./src/routes/ride.routes');
// // app.use('/api/ride', rideRoutes);

// // (existing)
// app.use('/api/bookings', require('./src/routes/bookings.routes'));



// // DB + sockets + start
// const PORT = process.env.PORT || 5000;
// connectDB()
//   .then(() => {
//     // initialize Socket.IO and pass server
//     initSockets(server);

//     server.listen(PORT, () => {
//       console.log(`Server listening on port ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error('Failed to start server', err);
//     process.exit(1);
//   });


require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initSockets } = require('./src/socket');
const connectDB = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const driverRoutes = require('./src/routes/drivers.routes');
const rideRoutes = require('./src/routes/ride.routes');
// const bookingRoutes = require('./src/routes/bookings.routes');
const paymentRoutes = require('./src/routes/payments.routes');
const mapboxRoutes = require('./src/routes/mapbox.routes');

const app = express();
const server = http.createServer(app);

// -------- Middlewares --------
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // max requests per minute
});
app.use(limiter);


// Root route (for Render or testing)
app.get("/", (req, res) => {
  res.send("🚀 Rideflow backend is running successfully!");
});


// -------- Routes --------
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/rides', rideRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/mapbox', mapboxRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// -------- DB + Socket.IO + Start --------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    initSockets(server); // initialize socket connections
    server.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  });
