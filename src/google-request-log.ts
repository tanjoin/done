export function logGoogleRequest(
  service: 'Calendar' | 'Drive',
  method: string,
  url: string,
): void {
  console.info(`[Google ${service}] request`, {method, url});
}

export async function logGoogleResponse(
  service: 'Calendar' | 'Drive',
  method: string,
  url: string,
  response: Response,
): Promise<void> {
  if (response.ok) {
    console.info(`[Google ${service}] response`, {
      method,
      url,
      status: response.status,
      statusText: response.statusText,
    });
    return;
  }

  const body = await response.clone().text();
  console.error(`[Google ${service}] response failed`, {
    method,
    url,
    status: response.status,
    statusText: response.statusText,
    body,
  });
}

export function logGoogleAuth(
  event: string,
  detail?: Record<string, unknown>,
): void {
  console.info(`[Google Auth] ${event}`, detail || {});
}
