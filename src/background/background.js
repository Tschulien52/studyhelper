import { browserApi } from '../browser/browser-api.js';
import { getSettings, saveSettings, startSession, endSession, recordDistraction } from '../shared/storage.js';
import { INTERVENTION_PATH } from '../shared/constants.js';
import { isWhitelisted } from '../shared/whitelist.js';

const handled = new Set();
const redirecting = new Set();
const pending = new Map();

const interventionBaseUrl = browserApi.getUrl(INTERVENTION_PATH);
const extensionBaseUrl = browserApi.getUrl('');
const internal = (url = '') => !url || /^(chrome|edge|about|moz-extension|chrome-extension|safari-web-extension):/i.test(url);
const isExtensionUrl = (url = '') => /^(moz-extension|chrome-extension|safari-web-extension):/i.test(url) || url.startsWith(extensionBaseUrl) || url.startsWith(interventionBaseUrl);
const interventionUrl = (id) => `${interventionBaseUrl}?tab=${encodeURIComponent(id)}`;
const handledKey = (id) => `handled-tab-${id}`;

async function intervene(id) {
  if (handled.has(id) || redirecting.has(id)) return;
  redirecting.add(id);
  const key = handledKey(id);
  try {
    // Safari may recreate the worker between tab events. Keep a short-lived
    // per-tab marker in local storage so a restarted worker cannot redirect
    // and count the same tab again.
    const stored = await browserApi.storage.get(key);
    if (stored[key]) return;
    await browserApi.storage.set({ [key]: Date.now() });
    // The URL check is important for Safari, where the service worker may be
    // suspended and recreated between tabs.onCreated and tabs.onUpdated.
    const tab = await browserApi.tabs.get(id);
    if (isExtensionUrl(tab?.url)) {
      await browserApi.storage.remove(key);
      return;
    }
    await browserApi.tabs.update(id, { url: interventionUrl(id) });
    handled.add(id);
    pending.delete(id);
    await recordDistraction();
  } catch (error) {
    await browserApi.storage.remove(key).catch(() => {});
    console.warn('Unable to redirect tab', id, error);
  } finally {
    redirecting.delete(id);
  }
}

async function shouldIntervene(url, settings, id) {
  if (!settings.enabled || internal(url) || isExtensionUrl(url) || isWhitelisted(url, settings.whitelist)) return false;
  if (settings.intervention === 'first' && settings.graceSeconds > 0) {
    const first = pending.get(id) ?? Date.now();
    pending.set(id, first);
    if (Date.now() - first < settings.graceSeconds * 1000) return false;
  }
  return true;
}

browserApi.addListener(browserApi.tabs.onCreated, async (tab) => {
  const settings = await getSettings();
  if (!settings.enabled || !tab.id || handled.has(tab.id)) return;
  const url = tab.pendingUrl || tab.url || '';
  if (url && !internal(url)) {
    if (settings.intervention === 'first') pending.set(tab.id, Date.now());
    if (settings.intervention === 'every') await intervene(tab.id);
  } else if (settings.intervention === 'every') {
    await intervene(tab.id);
  }
});

browserApi.addListener(browserApi.tabs.onUpdated, async (id, change) => {
  if (!change.url || handled.has(id)) return;
  const settings = await getSettings();
  if (await shouldIntervene(change.url, settings, id)) await intervene(id);
});

browserApi.addListener(browserApi.tabs.onRemoved, (id) => {
  handled.delete(id);
  redirecting.delete(id);
  pending.delete(id);
  browserApi.storage.remove(handledKey(id)).catch(() => {});
});

browserApi.addListener(browserApi.runtime.onMessage, async (message) => {
  if (message?.type !== 'set-enabled') return;
  const settings = await getSettings();
  const enabled = Boolean(message.enabled);
  await saveSettings({ ...settings, enabled });
  if (enabled) await startSession();
  else await endSession();
});
