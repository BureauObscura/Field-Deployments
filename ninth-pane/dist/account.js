const API_HOSTS = new Set(['api.bureauobscura.com', 'bureau-obscura-staging.bureauobscura.workers.dev']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const localPreview = LOCAL_HOSTS.has(location.hostname);
export const accountLinks = Object.freeze(location.hostname === 'bureau-obscura-staging.bureauobscura.workers.dev'
  ? { home: 'https://bureau-obscura-staging.bureauobscura.workers.dev/', fieldRecovery: 'https://bureau-obscura-staging.bureauobscura.workers.dev/field-recovery', signIn: 'https://bureau-obscura-staging.bureauobscura.workers.dev/field-recovery' }
  : { home: 'https://bureauobscura.com/', fieldRecovery: 'https://bureauobscura.com/field-recovery', signIn: 'https://bureauobscura.com/the-ninth-pane' });
export async function missionIdentity() {
  if (localPreview) return {allowed:true, local:true, agentDesignator:'', storageKey:'local'};
  if (!API_HOSTS.has(location.hostname)) return {allowed:false};
  try {
    const response = await fetch('/api/customer/session', {credentials:'include', cache:'no-store', signal:AbortSignal.timeout(10000)});
    if (!response.ok) return {allowed:false};
    const data = await response.json();
    if (data.authenticated !== true || data.missions?.ninth_pane !== true || !/^[a-f0-9]{64}$/.test(data.missions?.storage_key || '')) return {allowed:false};
    return {allowed:true, local:false, agentDesignator:String(data.account?.agent_designator || ''), storageKey:data.missions.storage_key};
  } catch { return {allowed:false, unavailable:true}; }
}
export function displayAgent(identity) {
  const name=String(identity?.agentDesignator || '').replace(/^agent\s+/i,'').trim();
  return name ? `Agent ${name}` : 'Field agent';
}
