// One error type for every deliberate API failure. `fields` carries per-field validation messages
// ({ price: "..." }) which the frontend ApiError exposes as `err.fields`.
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export const fail = (status, message, fields) => { throw new HttpError(status, message, fields); };
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
