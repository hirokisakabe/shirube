import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { AppQueryProvider, createWebQueryClient } from "../query";

export function renderWithQueryClient(
	ui: ReactElement,
	options?: RenderOptions,
) {
	const client = createWebQueryClient();
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<AppQueryProvider client={client}>{children}</AppQueryProvider>
	);
	return render(ui, { wrapper: Wrapper, ...options });
}
