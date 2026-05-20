import { getAuth } from '@/lib/auth';

export const runtime = 'edge';

/** GET /api/me — returns the authenticated user's email from CF Access */
export async function GET(request: Request) {
  const { authenticated, email, isLocal } = getAuth(request);

  if (!authenticated) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return Response.json({ email, isLocal });
}
