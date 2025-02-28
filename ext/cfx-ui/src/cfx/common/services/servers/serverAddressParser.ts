import { Autolinker, AutolinkerConfig } from 'autolinker';
import { DEFAULT_SERVER_PORT_INT } from 'cfx/base/serverUtils';

const autolinkerConfig: AutolinkerConfig = {
  email: false,
  phone: false,
  hashtag: false,
  mention: false,
  urls: true,
};

const DUMMY_BASE_URL = 'fivem://connect/';

export interface JoinServerAddress {
  type: 'join',
  address: string,
  canonical: string,
}
export function isJoinServerAddress(addr: IParsedServerAddress): addr is JoinServerAddress {
  return addr.type === 'join';
}

export interface IpServerAddress {
  type: 'ip',
  ip: string,
  port: number,
  address: string,
}
export function isIpServerAddress(addr: IParsedServerAddress): addr is IpServerAddress {
  return addr.type === 'ip';
}

export interface HostServerAddress {
  type: 'host',
  address: string,
}
export function isHostServerAddress(addr: IParsedServerAddress): addr is HostServerAddress {
  return addr.type === 'host';
}


export type IParsedServerAddress =
  | JoinServerAddress
  | IpServerAddress
  | HostServerAddress;

export function parseServerAddress(str: string): IParsedServerAddress | null {
  str = str.trim().toLowerCase();

  if (!str) {
    return null;
  }

  // Join link first
  const JOIN_LINK_DISCRIMINATOR = 'cfx.re/join/';
  const strJoinLinkDiscriminatorIndex = str.indexOf(JOIN_LINK_DISCRIMINATOR);
  if (strJoinLinkDiscriminatorIndex > -1) {
    let address = str.substring(strJoinLinkDiscriminatorIndex + JOIN_LINK_DISCRIMINATOR.length).trim();

    // Nothing left - nope
    if (!address) {
      return null;
    }

    // Could be that there's some junk still
    const indexOfJunk = indexOfNonAlphaNumeric(address);
    if (indexOfJunk > -1) {
      address = address.substring(0, indexOfJunk);
    }

    return {
      type: 'join',
      address,
      canonical: `https://${JOIN_LINK_DISCRIMINATOR}${address}`,
    };
  }

  // IP address
  const ipParts = tryParseIp(str);
  if (ipParts) {
    const { ip, port } = ipParts;

    if (port > 65536) {
      return null;
    }

    return {
      type: 'ip',
      ip,
      port,
      address: ip.includes(':') // if IPv6
        ? `[${ip}]:${port}`
        : `${ip}:${port}`,
    };
  }

  // If only alpha-numeric characters left - assume joinId
  if (indexOfNonAlphaNumeric(str) === -1) {
    return {
      type: 'join',
      address: str,
      canonical: `https://${JOIN_LINK_DISCRIMINATOR}${str}`,
    };
  }

  // Try infer address as a domain
  try {
    const [match] = Autolinker.parse(str, autolinkerConfig);
    if (!match) {
      return null;
    }

    const url = new URL(match.getAnchorHref(), DUMMY_BASE_URL);

    let urlRemainder = url.pathname + url.search + url.hash;

    let address = url.toString();
    if (address.startsWith(DUMMY_BASE_URL)) {
      address = address.substring(DUMMY_BASE_URL.length, address.length - urlRemainder.length);
    } else {
      //                          http:                 //
      address = address.substring(url.protocol.length + 2, address.length - urlRemainder.length);
    }

    return {
      type: 'host',
      address,
    };
  } catch (e) {
    // noop
  }

  return null;
}

function indexOfNonAlphaNumeric(str: string): number {
  let ptr = -1;
  while (++ptr < str.length) {
    if (!isAlphaNumeric(str.charCodeAt(ptr))) {
      return ptr;
    }
  }

  return -1;
}

function isAlphaNumeric(code: number): boolean {
  const _0 = 48;
  const _9 = 57;
  const _A = 65;
  const _Z = 90;
  const _a = 97;
  const _z = 122;

  if (code > _z) {
    return false;
  }
  if (code >= _a) {
    return true;
  }

  if (code > _Z) {
    return false;
  }
  if (code >= _A) {
    return true;
  }

  if (code > _9) {
    return false;
  }
  if (code >= _0) {
    return true;
  }

  return false;
}

function tryParseIp(str: string): { ip: string, port: number } | null {
  if (isIP(str)) {
    return {
      ip: str,
      port: DEFAULT_SERVER_PORT_INT,
    };
  }

  let ip = '';
  let portString = '';

  // IPv6 with port
  if (str.includes(']:')) {
    [ip, portString] = str.split(']:');

    ip = ip.replace('[', '');
  }
  // IPv4 with port
  else if (str.includes(':')) {
    [ip, portString] = str.split(':');
  }

  if (!ip || !portString) {
    return null;
  }

  if (isIP(ip)) {
    const port = parseInt(portString, 10) || DEFAULT_SERVER_PORT_INT;

    return {
      ip,
      port,
    };
  }

  return null;
}

try {
  (window as any).__isIP = isIP;
  (window as any).__tryParseIp = tryParseIp;
  (window as any).__parseServerAddress = parseServerAddress;
} catch (e) {}

// courtesy Node.js source code
// IPv4 Segment
const v4Seg = '(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';
const v4Str = `(${v4Seg}[.]){3}${v4Seg}`;
const IPv4Reg = new RegExp(`^${v4Str}$`);

// IPv6 Segment
const v6Seg = '(?:[0-9a-fA-F]{1,4})';
const IPv6Reg = new RegExp('^(' +
  `(?:${v6Seg}:){7}(?:${v6Seg}|:)|` +
  `(?:${v6Seg}:){6}(?:${v4Str}|:${v6Seg}|:)|` +
  `(?:${v6Seg}:){5}(?::${v4Str}|(:${v6Seg}){1,2}|:)|` +
  `(?:${v6Seg}:){4}(?:(:${v6Seg}){0,1}:${v4Str}|(:${v6Seg}){1,3}|:)|` +
  `(?:${v6Seg}:){3}(?:(:${v6Seg}){0,2}:${v4Str}|(:${v6Seg}){1,4}|:)|` +
  `(?:${v6Seg}:){2}(?:(:${v6Seg}){0,3}:${v4Str}|(:${v6Seg}){1,5}|:)|` +
  `(?:${v6Seg}:){1}(?:(:${v6Seg}){0,4}:${v4Str}|(:${v6Seg}){1,6}|:)|` +
  `(?::((?::${v6Seg}){0,5}:${v4Str}|(?::${v6Seg}){1,7}|:))` +
')(%[0-9a-zA-Z-.:]{1,})?$');

function isIPv4(s: string) {
  return IPv4Reg.test(s);
}

function isIPv6(s: string) {
  return IPv6Reg.test(s);
}

function isIP(s: string): 0 | 4 | 6 {
  if (isIPv4(s)) return 4;
  if (isIPv6(s)) return 6;
  return 0;
}
