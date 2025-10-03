// module.exports = (roles = []) => (req, res, next) => {
//   if (!Array.isArray(roles)) roles = [roles];
//   if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
//   if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: insufficient role' });
//   next();
// };


// module.exports = (roles = []) => (req, res, next) => {
//   if (!Array.isArray(roles)) roles = [roles];
//   if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
//   if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: insufficient role' });
//   next();
// };


module.exports = (roles = []) => (req, res, next) => {
  if (!Array.isArray(roles)) roles = [roles];
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // normalize: treat "user" as "rider"
  let role = req.user.role;
  if (role === 'user') role = 'rider';

  if (!roles.includes(role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }

  next();
};

