import {
  Outlet,
  Navigate,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { CalendarPage } from "./pages/CalendarPage";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CalendarPage,
});

const reviewRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review",
  component: () => <Navigate to="/" replace />,
});

const routeTree = rootRoute.addChildren([indexRoute, reviewRedirectRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
