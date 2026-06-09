import { hc } from "hono/client";
import type { AppType } from "../../server/app";

const baseUrl =
	typeof location === "undefined" ? "http://localhost" : location.origin;

export const apiClient = hc<AppType>(baseUrl);
