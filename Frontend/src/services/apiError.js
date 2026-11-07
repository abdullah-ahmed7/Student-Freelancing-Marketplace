// Shared error type for both the mock adapter and the real HTTP client.
export class ApiError extends Error {
  constructor(message, status = 400, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
