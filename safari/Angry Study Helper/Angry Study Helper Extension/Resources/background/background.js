const api = globalThis.browser ?? globalThis.chrome;
if (!api) throw new Error('A WebExtension API is required.');
const browserApi = { storage: api.storage.local, tabs: api.tabs, runtime: api.runtime, getUrl: (path) => api.runtime.getURL(path), addListener: (event, listener) => event.addListener(listener) };



const KEYS={settings:'settings',stats:'stats'};
const DEFAULT_SETTINGS={enabled:false,angerLevel:'angry',audioEnabled:true,volume:.65,intervention:'every',graceSeconds:0,whitelist:[]};
const DEFAULT_STATS={sessionCount:0,lifetimeCount:0,completedSessions:0,sessionStartedAt:null};
const INTERVENTION_PATH='intervention/intervention.html';


async function getSettings(){const r=await browserApi.storage.get(KEYS.settings);return {...DEFAULT_SETTINGS,...(r[KEYS.settings]??{})}}async function saveSettings(v){await browserApi.storage.set({[KEYS.settings]:v})}async function getStats(){const r=await browserApi.storage.get(KEYS.stats);return {...DEFAULT_STATS,...(r[KEYS.stats]??{})}}async function saveStats(v){await browserApi.storage.set({[KEYS.stats]:v})}
async function startSession(){const s=await getStats(),n={...s,sessionCount:0,sessionStartedAt:Date.now()};await saveStats(n);return n}async function endSession(){const s=await getStats(),n={...s,completedSessions:s.sessionStartedAt?s.completedSessions+1:s.completedSessions,sessionStartedAt:null};await saveStats(n);return n}async function recordDistraction(){const s=await getStats(),n={...s,sessionCount:s.sessionCount+1,lifetimeCount:s.lifetimeCount+1};await saveStats(n);return n}



function normalizeDomain(value){let input=String(value??'').trim().toLowerCase();if(!input)return'';try{const url=input.includes('://')?new URL(input):new URL(`https://${input}`);return url.hostname.replace(/^www\./,'').replace(/\.$/,'')}catch{return''}}
function isWhitelisted(url,domains=[]){let hostname;try{hostname=new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch{return false}return domains.map(normalizeDomain).filter(Boolean).some(domain=>hostname===domain||hostname.endsWith(`.${domain}`));}


const handled=new Set(),pending=new Map();const internal=u=>!u||/^(chrome|edge|about|moz-extension|chrome-extension|safari-web-extension):/i.test(u);const interventionUrl=id=>`${browserApi.getUrl(INTERVENTION_PATH)}?tab=${encodeURIComponent(id)}`;
async function intervene(id){if(handled.has(id))return;handled.add(id);pending.delete(id);await recordDistraction();await browserApi.tabs.update(id,{url:interventionUrl(id)})}
async function shouldIntervene(url,s,id){if(!s.enabled||internal(url)||url.startsWith(browserApi.getUrl(''))||isWhitelisted(url,s.whitelist))return false;if(s.intervention==='first'&&s.graceSeconds>0){const first=pending.get(id)??Date.now();pending.set(id,first);if(Date.now()-first<s.graceSeconds*1000)return false}return true}
browserApi.addListener(browserApi.tabs.onCreated,async tab=>{const s=await getSettings();if(!s.enabled||!tab.id||handled.has(tab.id))return;const url=tab.pendingUrl||tab.url||'';if(url&&!internal(url)){if(s.intervention==='first')pending.set(tab.id,Date.now());if(s.intervention==='every')await intervene(tab.id)}else if(s.intervention==='every')await intervene(tab.id)});
browserApi.addListener(browserApi.tabs.onUpdated,async(id,change)=>{if(!change.url||handled.has(id))return;const s=await getSettings();if(await shouldIntervene(change.url,s,id))await intervene(id)});browserApi.addListener(browserApi.tabs.onRemoved,id=>{handled.delete(id);pending.delete(id)});
browserApi.addListener(browserApi.runtime.onMessage,async m=>{if(m?.type!=='set-enabled')return;const s=await getSettings(),enabled=Boolean(m.enabled);await saveSettings({...s,enabled});if(enabled)await startSession();else await endSession()});
