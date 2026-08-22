const vscode = require("vscode");

const API = process.env.PROMPTLESS_API_URL || "http://localhost:3000";
const USER = process.env.PROMPTLESS_USER_ID || "user-1";

async function ingest(text, app) {
  const res = await fetch(`${API}/trpc/context.ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: USER,
      platform: "vscode",
      app,
      text,
    }),
  });
  return res.json();
}

function activate(context) {
  const capture = vscode.commands.registerCommand("promptless.capture", async () => {
    const editor = vscode.window.activeTextEditor;
    const folders = vscode.workspace.workspaceFolders ?? [];
    const tab = editor?.document.fileName || "no-active-file";
    const text = `Workspace: ${folders.map((f) => f.name).join(", ") || "none"}. Active tab: ${tab}`;
    await ingest(text, "VS Code");
    vscode.window.showInformationMessage("Promptless captured workspace context.");
  });
  context.subscriptions.push(capture);
}

function deactivate() {}

module.exports = { activate, deactivate };
