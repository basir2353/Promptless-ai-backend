/** Integration adapter stubs for external apps. */

export type IntegrationId = "gmail" | "shopify" | "vscode";

export interface IntegrationAdapter {
  id: IntegrationId;
  name: string;
  isConfigured(): boolean;
}

const adapters: IntegrationAdapter[] = [
  { id: "gmail", name: "Gmail", isConfigured: () => false },
  { id: "shopify", name: "Shopify", isConfigured: () => false },
  { id: "vscode", name: "VS Code", isConfigured: () => false },
];

export function listIntegrations(): IntegrationAdapter[] {
  return adapters;
}

export function getIntegration(
  id: IntegrationId,
): IntegrationAdapter | undefined {
  return adapters.find((a) => a.id === id);
}
