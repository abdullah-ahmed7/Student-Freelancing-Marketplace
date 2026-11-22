import { HttpError } from "../utils/errors.js";
import { isObjectId } from "../utils/validate.js";

// Rejects malformed ObjectIds before they reach Mongoose (avoids CastError 500s).
export const validateId = (...params) => (req, res, next) => {
  for (const p of params) {
    if (!isObjectId(req.params[p])) return next(new HttpError(404, "Not found."));
  }
  return next();
};
