const API = "http://localhost:3000";
const USER = "user-1";

async function ingestTab(tab) {
  if (!tab?.url || tab.url.startsWith("chrome://")) return;
  await fetch(`${API}/trpc/context.ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: USER,
      platform: "browser",
      app: "Chrome",
      text: `Active tab: ${tab.title || ""} (${tab.url})`,
      metadata: { url: tab.url },
    }),
  });
}

chrome.tabs.onActivated.addListener(async (info) => {
  const tab = await chrome.tabs.get(info.tabId);
  await ingestTab(tab);
});

chrome.action.onClicked.addListener(async (tab) => {
  await ingestTab(tab);
});
