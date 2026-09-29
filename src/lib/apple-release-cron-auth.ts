export function isAuthorizedAppleReleaseCronRequest(request: Pick<Request, "headers">, secret: string | undefined): boolean {
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
