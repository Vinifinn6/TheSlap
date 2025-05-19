import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge"

export default withMiddlewareAuthRequired()

export const config = {
  matcher: [
    // Add routes that require authentication
    "/profile",
    "/messages",
    // Exclude auth routes and public routes
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
