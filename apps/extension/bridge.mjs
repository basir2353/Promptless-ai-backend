import { trpcMutation, USER } from "../../scripts/trpc-client.mjs";

const target = process.argv[2] || "https://example.com";
const res = await fetch(target);
const html = await res.text();
const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || target;

const result = await trpcMutation("context.ingest", {
  userId: USER,
  platform: "browser",
  app: "Playwright Bridge",
  text: `Fetched page "${title}" from ${target}`,
  metadata: { url: target, runner: "playwright-bridge" },
});

console.log(JSON.stringify({ target, title, result }, null, 2));
