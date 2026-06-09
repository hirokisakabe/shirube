import {
	Outlet,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { CalendarPage } from "./pages/CalendarPage";
import { GoalPage } from "./pages/GoalPage";
import { ReviewPage } from "./pages/ReviewPage";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: CalendarPage,
});

const reviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/review",
	component: ReviewPage,
});

const goalRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/goals",
	component: GoalPage,
});

const routeTree = rootRoute.addChildren([indexRoute, reviewRoute, goalRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
