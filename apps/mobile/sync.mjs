import { trpcMutation, trpcQuery, USER } from "../../scripts/trpc-client.mjs";

const feed = await trpcQuery("memory.getUserMemories", { userId: USER });
await trpcMutation("notifications.registerDevice", {
  userId: USER,
  platform: "android",
  provider: "fcm",
  token: `rn-fcm-${USER}`,
});
const ingested = await trpcMutation("context.ingest", {
  userId: USER,
  platform: "mobile",
  app: "Promptless Mobile",
  text: "Mobile dashboard opened. Syncing memory feed and action feed.",
});

console.log(
  JSON.stringify(
    {
      platform: "react-native",
      userId: USER,
      memories: feed.memories?.length ?? 0,
      ingest: ingested,
    },
    null,
    2,
  ),
);
