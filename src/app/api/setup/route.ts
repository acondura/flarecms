import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRootUserEmail, setRootUserEmail } from '@/lib/kv';
import { getAuth } from '@/lib/auth';

export const runtime = 'edge';

/** GET /api/setup — check if root user is configured */
export async function GET(request: Request) {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const rootUserEmail = await getRootUserEmail(env.CMS_KV);
    const { email } = getAuth(request);
    
    return Response.json({ 
      needsSetup: !rootUserEmail,
      currentEmail: email,
      rootUserEmail: rootUserEmail 
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/setup — set root user email (only if not already set) */
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const rootUserEmail = await getRootUserEmail(env.CMS_KV);
    
    // Only allow setup if no root user exists
    if (rootUserEmail) {
      return Response.json(
        { error: 'Root user already configured' },
        { status: 403 }
      );
    }

    const { email } = getAuth(request);
    if (!email) {
      return Response.json(
        { error: 'No authenticated email found' },
        { status: 401 }
      );
    }

    const body = await request.json() as { email?: string };
    const emailToSet = body.email || email;

    // Validate email format
    if (!emailToSet || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSet)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await setRootUserEmail(env.CMS_KV, emailToSet);
    
    return Response.json({ 
      success: true, 
      rootUserEmail: emailToSet 
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
