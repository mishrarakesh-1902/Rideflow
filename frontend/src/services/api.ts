// // frontend/src/services/api.ts
// import axios from "axios";

// export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// const api = axios.create({
//   baseURL: API_BASE,
//   headers: {
//     "Content-Type": "application/json",
//   },
//   // If your backend authenticates via httpOnly cookies, set this true:
//   // withCredentials: true,
// });

// // Attach token automatically (Bearer)
// api.interceptors.request.use(
//   (cfg) => {
//     try {
//       const token = localStorage.getItem("token");
//       if (token && cfg.headers) {
//         cfg.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch (e) {
//       // ignore localStorage errors
//     }
//     return cfg;
//   },
//   (err) => Promise.reject(err)
// );

// // Optional: clear local auth on 401 (so UI can redirect)
// api.interceptors.response.use(
//   (res) => res,
//   (error) => {
//     if (error?.response?.status === 401) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;


// frontend/src/services/api.ts
import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  // If your backend uses cookie (httpOnly) session auth, set withCredentials true:
  // withCredentials: true,
});

// Attach token automatically to every request
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore localStorage access errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: clear local auth on 401 to prompt re-login (components may handle redirect)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default api;
