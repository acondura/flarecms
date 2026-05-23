export interface CmsPage {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // markdown
  publishedAt: string; // ISO
  updatedAt: string;   // ISO
}

const PREFIX = 'page:';
const REDIRECT_PREFIX = 'redirect:';

export async function listPages(kv: KVNamespace): Promise<CmsPage[]> {
  const list = await kv.list({ prefix: PREFIX });
  const pages = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await kv.get(k.name);
      return raw ? (JSON.parse(raw) as CmsPage) : null;
    })
  );
  return (pages.filter(Boolean) as CmsPage[]).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function getPage(kv: KVNamespace, slug: string): Promise<CmsPage | null> {
  const raw = await kv.get(`${PREFIX}${slug}`);
  return raw ? (JSON.parse(raw) as CmsPage) : null;
}

export async function savePage(kv: KVNamespace, page: CmsPage): Promise<void> {
  await kv.put(`${PREFIX}${page.slug}`, JSON.stringify(page));
}

export async function saveRedirect(kv: KVNamespace, from: string, to: string): Promise<void> {
  await kv.put(`${REDIRECT_PREFIX}${from}`, to);
}

export async function getRedirect(kv: KVNamespace, from: string): Promise<string | null> {
  return await kv.get(`${REDIRECT_PREFIX}${from}`);
}

export async function listRedirectsTo(kv: KVNamespace, to: string): Promise<string[]> {
  const list = await kv.list({ prefix: REDIRECT_PREFIX });
  const matches: string[] = [];
  for (const k of list.keys) {
    const val = await kv.get(k.name);
    if (val === to) {
      // key.name is like 'redirect:old-slug' — strip prefix
      matches.push(k.name.replace(REDIRECT_PREFIX, ''));
    }
  }
  return matches;
}

export async function deleteRedirect(kv: KVNamespace, from: string): Promise<void> {
  await kv.delete(`${REDIRECT_PREFIX}${from}`);
}

export async function deletePage(kv: KVNamespace, slug: string): Promise<void> {
  await kv.delete(`${PREFIX}${slug}`);
}

const ROOT_USER_KEY = 'root:user:email';

export async function getRootUserEmail(kv: KVNamespace): Promise<string | null> {
  return await kv.get(ROOT_USER_KEY);
}

export async function setRootUserEmail(kv: KVNamespace, email: string): Promise<void> {
  await kv.put(ROOT_USER_KEY, email);
}
