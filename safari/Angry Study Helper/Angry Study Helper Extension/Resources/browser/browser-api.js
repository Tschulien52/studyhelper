const api = globalThis.browser ?? globalThis.chrome;
if (!api) throw new Error('A WebExtension API is required.');
export const browserApi = { storage: api.storage.local, tabs: api.tabs, runtime: api.runtime, getUrl: (path) => api.runtime.getURL(path), addListener: (event, listener) => event.addListener(listener) };
