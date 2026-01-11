🚗 RideFlow – Real-Time Ride Booking Web Application

Full-Stack MERN | Built with React, Node.js, Express & MongoDB


https://rideflow-qca6.onrender.com/
---
🧭 Overview

RideFlow is a full-stack ride-hailing application designed to provide a fast, seamless cab-booking experience. Built using the MERN stack, RideFlow features real-time ride requests, driver dashboards, booking history, and an elegant UI with modern gradients and animations.

🚕 A modern Uber-like platform to demonstrate real-world full-stack architecture.
---
✨ Key Features

👤 User Authentication

Secure login/register (JWT-based)

Role-based (Rider / Driver) access

🗺 Real-Time Ride Booking

Select pickup & destination

Choose ride type (Economy / Standard / Premium)

Request rides in real time


📍 Map Integration (Frontend Ready)

UI supports Mapbox for live tracking

Mapbox API can be plugged in easily


🚗 Driver Dashboard

Shows available rides

Accept & complete rides

Status tracking


📜 Ride History

Users can view travel history

Rides sorted chronologically


🎨 Modern UI & Animations

Built with React + Tailwind + ShadCN UI

Smooth gradients & glass-morphism

Mobile-responsive
---

🛠 Tech Stack
```
Layer	Technologies Used
🎨 Frontend	React, TypeScript, TailwindCSS, ShadCN UI, Lucide Icons
⚙️ Backend	Node.js, Express.js
🗃 Database	MongoDB + Mongoose
🧭 Maps	Mapbox (optional integration)
🔐 Auth	JSON Web Tokens (JWT)
🌐 Deployment	Render / Vercel / Netlify / Railway
🚀 Getting Started

This guide includes instructions for both frontend and backend.
```
---
📥 1. Clone the Repository
```
git clone https://github.com/your-username/rideflow.git
cd rideflow
```

---
📦 1. Backend Setup (Node.js + Express + MongoDB)
1️⃣ Navigate to Backend Folder
cd rideflow-backend

2️⃣ Install Dependencies
npm install

3️⃣ Create .env File
touch .env


Add the following environment variables:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```
4️⃣ Fix Common Dependency Errors

If you see:

❌ Cannot find module "helmet"

npm install helmet


❌ No matching version found for node-fetch@^3.4.1

Fix package.json:

"node-fetch": "^3.3.2"


Then run:

npm install

▶ Start the Backend Server
npm start


You should see:

Server running on port 5000
Connected to MongoDB
---
🌐 Backend API Routes

Your backend routes may vary depending on the files inside:
rideflow-backend/src/routes/

🔑 Authentication
```
POST /api/auth/login
POST /api/auth/register   (if implemented)
```
👤 Driver
```
GET /api/driver/dashboard
```
🚕 Ride / Booking (IMPORTANT)

Your server logs showed:
```
/api/ride/request 404  
/api/rides/history 404  
/api/rides/options 404
```

This means your real backend routes are likely:
```
/api/bookings/create
/api/bookings/history
/api/bookings/options
```

OR based on your actual route file, for example:
```
/api/ride/create
/api/ride/history
/api/trip/request
```

❗ Make sure your Frontend RiderDashboard uses the correct paths.

🎨 2. Frontend Setup (React + Vite + Tailwind + TS)
1️⃣ Navigate to Frontend
cd rideflow-frontend

2️⃣ Install Dependencies
npm install

3️⃣ Start Development Server
npm run dev


Frontend runs on:

http://localhost:5173/

🔗 Frontend–Backend Connection (Important)

Your frontend must use the correct backend API paths.

❌ Wrong (your current code):
```
/api/ride/request
/api/rides/options
/api/rides/history
```

These return 404 errors.

✔ Correct (example based on typical backend structure):
```
axios.post("http://localhost:5000/api/bookings/create")
axios.get("http://localhost:5000/api/bookings/history")
axios.get("http://localhost:5000/api/bookings/options")
```

You must match whatever is inside:

backend/src/routes/

📁 Project Structure
```
rideflow/
│
├── rideflow-backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── models/
│       ├── services/
│       ├── middlewares/
│       └── config/
│
└── rideflow-frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── context/
    │   └── App.tsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```
📸 Screenshots

<img width="1899" height="921" alt="image" src="https://github.com/user-attachments/assets/959a9f15-4e4a-4a72-b56a-e5c92e81fdf1" />


Example placeholders:

🙋‍♂️ Author
```
Rakesh Kumar Mishra
📧 mishrarakeshkumar766@gmail.com

🔗 GitHub: https://github.com/mishrarakesh-1902

🔗 LinkedIn: https://www.linkedin.com/in/rakesh-kumar-b64934284/
```
