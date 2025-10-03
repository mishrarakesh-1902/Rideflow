module.exports = (err, req, res, next) => {
console.error(err);
const status = err.status || 500;
const payload = {
message: err.message || 'Internal Server Error'
};
if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;
res.status(status).json(payload);
};