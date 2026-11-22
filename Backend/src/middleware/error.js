import { HttpError } from "../utils/errors.js";

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let message = "Something went wrong on the server.";
  let fields;

  if (err instanceof HttpError) {
    ({ status, message, fields } = err);
  } else if (err.type === "entity.parse.failed") {
    status = 400; message = "Request body is not valid JSON.";
  } else if (err.type === "entity.too.large") {
    status = 413; message = "Request body is too large.";
  } else if (err.name === "ValidationError") {
    status = 422; message = "Please fix the highlighted fields.";
    fields = Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k.split(".")[0], e.message]));
  } else if (err.name === "CastError") {
    status = 404; message = "Not found.";
  } else if (err.code === 11000) {
    status = 409;
    const key = Object.keys(err.keyValue || {})[0];
    message = key === "email" ? "An account with this email already exists." : "That record already exists.";
    if (key === "email") fields = { email: "This email is already registered." };
  }

  if (status >= 500) console.error(err);
  res.status(status).json(fields ? { message, errors: fields } : { message });
}
