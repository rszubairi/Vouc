import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isLoginRoute = createRouteMatcher(["/login"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isMemberLoginRoute = createRouteMatcher(["/member-login"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

  if (isDashboardRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
  if (isLoginRoute(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isAccountRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/member-login");
  }
  if (isMemberLoginRoute(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/account/profile");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
