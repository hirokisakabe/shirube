import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { join, relative, resolve } from "path";
import { createDb } from "@shirube/db";
import { createApp } from "./app";

const db = createDb();
const app = createApp(db);

const webDistAbs = resolve(__dirname, "../../web/dist");
const WEB_DIST = relative(process.cwd(), webDistAbs);
app.use("/*", serveStatic({ root: WEB_DIST }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
