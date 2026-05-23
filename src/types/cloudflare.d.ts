// Cloudflare environment bindings — extend as needed
interface CloudflareEnv {
  CMS_KV: KVNamespace;
  CF_ACC_ID: string;
  CF_TOKEN: string;
}
