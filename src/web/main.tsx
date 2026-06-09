import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppQueryProvider, createWebQueryClient } from "./query";
import { router } from "./router";

const queryClient = createWebQueryClient();

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<AppQueryProvider client={queryClient}>
			<RouterProvider router={router} />
		</AppQueryProvider>
	</StrictMode>,
);
