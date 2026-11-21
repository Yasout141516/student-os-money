const REQUIRED = {
  NOTION_TOKEN: 'create an internal integration at https://www.notion.so/my-integrations and copy its secret',
  NOTION_PARENT_PAGE_ID: 'copy the 32-character ID from the end of your Student OS page URL',
};

export function loadConfig(env = process.env) {
  for (const [name, hint] of Object.entries(REQUIRED)) {
    if (!env[name]) throw new Error(`Missing ${name} in .env: ${hint}.`);
  }
  return {
    token: env.NOTION_TOKEN,
    parentPageId: env.NOTION_PARENT_PAGE_ID,
    coursesDbId: env.NOTION_COURSES_DB_ID || null,
  };
}
