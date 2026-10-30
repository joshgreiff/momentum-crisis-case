const LOOPBACK=new Set(['localhost','127.0.0.1','::1']);

function hostname(host:string){
 const h=host.trim().toLowerCase();
 if(h.startsWith('['))return h.slice(1,h.indexOf(']'));
 return h.replace(/:\d+$/,'');
}

/**
 * The manual crisis console has no authentication, so it is only enabled under `next dev`
 * and only when the request is addressed to a loopback host (not a LAN IP or a tunnel domain).
 */
export function isLocalConsoleAllowed(nodeEnv:string|undefined,host:string|null,forwardedHost:string|null){
 if(nodeEnv!=='development'||!host)return false;
 if(!LOOPBACK.has(hostname(host)))return false;
 return forwardedHost==null||LOOPBACK.has(hostname(forwardedHost));
}
