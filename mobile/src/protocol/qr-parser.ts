import { PairingQR } from './types';

let _json: { parse: (text: string) => unknown } | null = null;

function getJson() {
  if (!_json) {
    _json = { parse: JSON.parse };
  }
  return _json;
}

function parse(raw: string): PairingQR | null {
  try {
    const trimmed = raw.trim();
    const obj = getJson().parse(trimmed) as Record<string, unknown>;
    if (
      typeof obj.v === 'number' &&
      typeof obj.url === 'string' &&
      typeof obj.token === 'string' &&
      typeof obj.fp === 'string' &&
      typeof obj.exp === 'number'
    ) {
      return {
        v: obj.v as 1,
        url: obj.url,
        token: obj.token,
        fp: obj.fp,
        exp: obj.exp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const QrParser = { parse };
