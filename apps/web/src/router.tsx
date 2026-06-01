import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { CalendarPage } from "./pages/CalendarPage";
import { TaskListPage } from "./pages/TaskListPage";

function RootComponent() {
  return (
    <>
      <nav style={{ padding: "8px 16px", borderBottom: "1px solid #ccc" }}>
        <Link to="/" style={{ marginRight: "16px" }}>
          タスク一覧
        </Link>
        <Link to="/calendar">カレンダー</Link>
      </nav>
      <Outlet />
    </>
  );
}

const rootRoute = createRootRoute({ component: RootComponent });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TaskListPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
});

const routeTree = rootRoute.addChildren([indexRoute, calendarRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
