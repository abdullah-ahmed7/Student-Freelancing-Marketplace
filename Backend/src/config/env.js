import "dotenv/config";
const PLACEHOLDER_SECRET = "change_this_to_a_long_random_string";
export const env = {
  get nodeEnv() { return process.env.NODE_ENV || "development"; },
  get port() { return Number(process.env.PORT) || 5000; },
  get mongoUri() { return process.env.MONGO_URI || ""; },
  get jwtSecret() { return process.env.JWT_SECRET || ""; },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN || "7d"; },
  get clientUrls() {
    return (process.env.CLIENT_URL || "http://localhost:5173")
      .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  },
  // Demo-only verification code. Empty string disables the demo verification endpoint.
  get demoOtp() { return process.env.DEMO_OTP === undefined ? "123456" : process.env.DEMO_OTP; },
  get authRateLimitMax() { return Number(process.env.AUTH_RATE_LIMIT_MAX) || 40; },
};

// Fails fast on unsafe configuration instead of silently running with a guessable JWT secret.
export function assertEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push("MONGO_URI is not set");
  if (!env.jwtSecret) problems.push("JWT_SECRET is not set");
  else if (env.nodeEnv === "production" && (env.jwtSecret === PLACEHOLDER_SECRET || env.jwtSecret.length < 32)) {
    problems.push("JWT_SECRET must be a random string of at least 32 characters in production");
  } else if (env.jwtSecret.length < 16) {
    problems.push("JWT_SECRET is too short (use at least 16 characters)");
  }
  if (problems.length) throw new Error(`Invalid configuration: ${problems.join("; ")}. See Backend/.env.example.`);
}