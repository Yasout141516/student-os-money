export function explainNotionError(err) {
  const status = err?.status;
  if (status === 401 || err?.code === 'unauthorized') {
    return 'Notion rejected the token. Check NOTION_TOKEN in .env (copy the Internal Integration Secret again).';
  }
  if (status === 403 || err?.code === 'restricted_resource') {
    return 'The integration lacks permission. Give the integration the Insert content capability at https://www.notion.so/my-integrations.';
  }
  if (status === 404 || err?.code === 'object_not_found') {
    return 'Notion page not found. Share your Student OS page with the integration: ⋯ → Connections, and check NOTION_PARENT_PAGE_ID.';
  }
  return err?.message ?? String(err);
}
