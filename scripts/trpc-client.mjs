const API = process.env.API_URL || "http://localhost:3000";
const USER = process.env.USER_ID || "user-1";

async function read(res) {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || res.statusText);
  }
  return json.result?.data ?? json;
}

export async function trpcQuery(path, input) {
  const url =
    input === undefined
      ? `${API}/trpc/${path}`
      : `${API}/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
  return read(await fetch(url));
}

export async function trpcMutation(path, input) {
  return read(
    await fetch(`${API}/trpc/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export { API, USER };
