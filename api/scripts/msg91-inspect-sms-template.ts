/**
 * Read-only inspection script to query MSG91 SMS template details.
 * Never prints secrets or sends messages.
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

const apiRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(apiRoot, '.env') });
loadDotenv({ path: path.join(apiRoot, '.env.local'), override: true });

async function checkTemplate(templateId: string, authkey: string) {
  console.log(`\nChecking template_id: ${templateId}`);
  try {
    const res = await fetch('https://control.msg91.com/api/v5/sms/getTemplateVersions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey,
      },
      body: JSON.stringify({ template_id: templateId }),
    });
    const status = res.status;
    const body = await res.json().catch(() => null);
    console.log(`Status: ${status}`);
    console.log('Response:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

async function listAllTemplates(authkey: string) {
  console.log('\nChecking all templates list:');
  const endpoints = [
    'https://control.msg91.com/api/v5/sms/getTemplates',
    'https://control.msg91.com/api/v5/sms/all-templates',
    'https://api.msg91.com/api/v5/flow/',
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { authkey },
      });
      console.log(`GET ${url} -> status ${res.status}`);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        console.log(`Data from ${url}:`, JSON.stringify(json, null, 2));
      }
    } catch (err) {
      console.log(`GET ${url} failed:`, err instanceof Error ? err.message : err);
    }
  }
}

async function main() {
  const authkey = (process.env.MSG91_AUTHKEY || process.env.SMS_PROVIDER_API_KEY || '').trim();
  if (!authkey) {
    console.error('No authkey found in environment');
    process.exit(1);
  }

  const candidateIds = [
    process.env.SMS_DLT_TEMPLATE_ID || '6abd3c3362121d42e10c6c22',
    '1477179051631924585',
    '1302157225275643280',
    '6abd3c3362121d42e10c6c22',
  ];
  const unique = Array.from(new Set(candidateIds));

  for (const id of unique) {
    await checkTemplate(id, authkey);
  }

  await listAllTemplates(authkey);
}

main().catch(console.error);
