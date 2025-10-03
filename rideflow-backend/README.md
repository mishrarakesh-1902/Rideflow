# RideFlow Backend

1. Copy files into a folder.
2. Create a `.env` file based on `.env.example` and fill values (Mongo DB uri, Mapbox token, Razorpay keys, FRONTEND_URL).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

### Connecting frontend
- Set `VITE_API_BASE_URL` (or similar) in the frontend environment to `http://localhost:5000/api`
- Example calls from frontend:
  - `POST /api/auth/signup` body `{ name, email, password, phone, role }` => returns `{ user, token }`
  - `POST /api/auth/login` body `{ email, password }` => returns `{ user, token }`
  - Use the returned `token` by adding header `Authorization: Bearer <token>` to protected requests.
  - Request a ride: `POST /api/bookings` body `{ pickup: {address, coords:[lng,lat]}, destination: {...}, rideType }`.
  - Create payment: `POST /api/payments/order` body `{ bookingId, amount }` => returns razorpay order.
  - Verify payment: `POST /api/payments/verify` body `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`.

### CORS
- `server.js` allows `FRONTEND_URL` from `.env`.

### Notes & Next steps
- Add validation (Joi/express-validator) for production.
- Add rate-limiting, logging, and tests.
- Improve driver assignment logic (queue / matching algorithm) and notifications (websockets / push).
