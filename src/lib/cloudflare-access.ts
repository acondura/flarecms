/**
 * Cloudflare Access API integration
 * Automatically configures access policies for the /admin path
 */

interface AccessPolicy {
  id?: string;
  name: string;
  decision: 'allow' | 'deny';
  include: Array<{ email: { email: string } }>;
  require?: Array<any>;
  exclude?: Array<any>;
}

interface AccessApplication {
  id?: string;
  name: string;
  domain: string;
  type: 'self_hosted';
  session_duration: string;
  allowed_idps?: string[];
  auto_redirect_to_identity?: boolean;
}

export async function setupCloudflareAccess(
  accountId: string,
  apiToken: string,
  domain: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Check if application already exists
    const appsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`,
      { headers }
    );

    if (!appsResponse.ok) {
      throw new Error(`Failed to fetch applications: ${await appsResponse.text()}`);
    }

    const appsData = await appsResponse.json() as { result: AccessApplication[] };
    // Normalize domain input: accept origin like https://example.pages.dev or example.pages.dev
    const originHost = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    let appId = appsData.result.find(
      (app) => app.domain === `${originHost}/admin` || app.name === 'FlareCMS Admin'
    )?.id;

    // Step 2: Create or update application
    if (!appId) {
      const createAppResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`,
        {
          method: 'POST',
          headers,
            body: JSON.stringify({
              name: 'FlareCMS Admin',
              domain: `${originHost}/admin`,
            type: 'self_hosted',
            session_duration: '24h',
            auto_redirect_to_identity: false,
            allowed_idps: [],
          } as AccessApplication),
        }
      );

      if (!createAppResponse.ok) {
        throw new Error(`Failed to create application: ${await createAppResponse.text()}`);
      }

      const createAppData = await createAppResponse.json() as { result: AccessApplication };
      appId = createAppData.result.id;
    }

    // Step 3: Get existing policies for this app
    const policiesResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`,
      { headers }
    );

    if (!policiesResponse.ok) {
      throw new Error(`Failed to fetch policies: ${await policiesResponse.text()}`);
    }

    const policiesData = await policiesResponse.json() as { result: AccessPolicy[] };
    const existingPolicy = policiesData.result.find((p) => p.name === 'FlareCMS Admin Access');

    // Step 4: Create or update policy
    const policy: AccessPolicy = {
      name: 'FlareCMS Admin Access',
      decision: 'allow',
      include: [{ email: { email: adminEmail } }],
    };

    if (existingPolicy?.id) {
      // Update existing policy
      const updateResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies/${existingPolicy.id}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(policy),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update policy: ${await updateResponse.text()}`);
      }
    } else {
      // Create new policy
      const createResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(policy),
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create policy: ${await createResponse.text()}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Cloudflare Access setup error:', error);
    return { success: false, error: error.message };
  }
}
