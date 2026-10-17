// Last middleware. The frontend shows `message` in a toast.
module.exports = (err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};
