export async function fetchClient(input: RequestInfo, init?: RequestInit) {
  let absoluteInput = input;

  if (typeof window === 'undefined' && typeof input === 'string' && input.startsWith('/')) {
    // Server-side context and relative path, construct absolute URL
    // Assumes the app is running on port 3000 internally
    const baseURL = process.env.APP_URL || 'http://localhost:3000'; 
    absoluteInput = `${baseURL}${input}`;
  }

  // const csrf = document.cookie
  //   .split("; ")
  //   .find((c) => c.startsWith("csrf_token="))
  //   ?.split("=")[1]

  return fetch(absoluteInput, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      // "x-csrf-token": csrf || "",
      "Content-Type": "application/json",
    },
  });
}
