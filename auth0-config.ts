export const auth0Config = {
  baseURL: process.env.AUTH0_BASE_URL || "http://localhost:3000",
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  routes: {
    callback: "/api/auth/callback",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
  },
}
