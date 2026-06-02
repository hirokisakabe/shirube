import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { resolve, relative } from "path";
import { createDb } from "../db/index";
import { createApp } from "./app";

const db = createDb();
const app = createApp(db);

const webDistAbs = resolve(__dirname, "web");
const WEB_DIST = relative(process.cwd(), webDistAbs);
app.use("/*", serveStatic({ root: WEB_DIST }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
