// Ridge Run — shared client config.
// Edit these once; every page reads from window.RR_CONFIG.
window.RR_CONFIG = {
  SUPABASE_URL: 'https://nrbffnsheenmewijeapb.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_WjDoqgd4_eDE1lpfZHkT0g_cyArLkvI',

  // Paste your n8n production webhook URLs here after importing the workflow.
  // They will look like: https://<your-n8n>.app.n8n.cloud/webhook/ridgerun/generate-dna
  N8N_GENERATE_DNA_URL: 'https://victoryvision.app.n8n.cloud/webhook/ridgerun/generate-dna',
  N8N_CHAT_URL:         'https://victoryvision.app.n8n.cloud/webhook/ridgerun/chat'
};
