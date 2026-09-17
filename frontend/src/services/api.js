let csrfToken = "";
export async function api(path, options = {}) {
  const method = options.method || "GET";
  const form = options.body instanceof FormData;
  const response = await fetch(`/api/${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(!form && options.body ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD", "OPTIONS"].includes(method)
        ? { "X-CSRFToken": csrfToken || cookie("csrftoken") }
        : {}),
      ...options.headers,
    },
    body: options.body
      ? form
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    if (response.status === 404) message = "This item is no longer available.";
    else if (response.status >= 500)
      message = "We couldn’t complete that request. Please try again shortly.";
    else if (data) message = flatten(data).join(" ");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (data?.csrfToken) csrfToken = data.csrfToken;
  return data;
}
const flatten = (value) =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(flatten)
      : Object.values(value || {}).flatMap(flatten);
function cookie(name) {
  return (
    document.cookie
      .split("; ")
      .find((x) => x.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") || ""
  );
}
export const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const list = (value) => value?.results || [];
