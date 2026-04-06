import { NextResponse } from 'next/server';

/**
 * GET /api/social/callback?email=...&connected=...&accountId=...&profileId=...
 * Zernio redirects here after successful OAuth.
 * We redirect the user back to the app with a success indicator.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email') || '';
  const connected = url.searchParams.get('connected') || '';
  const accountId = url.searchParams.get('accountId') || '';

  // Redirect back to the main app with success params
  const redirectUrl = new URL('/', url.origin);
  redirectUrl.searchParams.set('oauth_success', 'true');
  redirectUrl.searchParams.set('platform', connected);
  redirectUrl.searchParams.set('accountId', accountId);
  if (email) redirectUrl.searchParams.set('email', email);

  return NextResponse.redirect(redirectUrl.toString());
}
