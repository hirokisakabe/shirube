import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { resolve } from "node:path";
import { createDb } from "../db/index";
import { createApp } from "./app";

const db = createDb();
const app = createApp(db);

app.use("/*", serveStatic({ root: resolve(__dirname, "web") }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
