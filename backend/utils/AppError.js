// An error we throw on purpose. `status` becomes the HTTP status code,
// `message` is shown to the user by the frontend toast.
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = AppError;
