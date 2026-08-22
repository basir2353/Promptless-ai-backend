import { execSync } from "node:child_process";
import { trpcMutation, USER } from "../../scripts/trpc-client.mjs";

function activeWindow() {
  try {
    const title = execSync(
      'powershell -NoProfile -Command "(Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle"',
      { encoding: "utf8" },
    ).trim();
    return title || "Desktop";
  } catch {
    return "Desktop";
  }
}

const windowTitle = activeWindow();
const result = await trpcMutation("context.ingest", {
  userId: USER,
  platform: "desktop",
  app: "Tauri Desktop",
  text: `Active window: ${windowTitle}`,
  metadata: { source: "system-tray-listener" },
});
await trpcMutation("notifications.registerDevice", {
  userId: USER,
  platform: "desktop",
  provider: "web",
  token: `desktop-${USER}`,
});

console.log(JSON.stringify({ platform: "desktop", windowTitle, result }, null, 2));
