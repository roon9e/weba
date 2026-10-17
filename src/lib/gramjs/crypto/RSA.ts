import { bufferFromHex, concat } from '../../../util/encoding/buffer';

import {
  generateRandomBytes,
  modExp,
  readBigIntFromBuffer,
  readBufferFromBigInt,
  sha1,
} from '../Helpers';

export const SERVER_KEYS = [
  {
    fingerprint: BigInt('-3414540481677951611'),
    n: BigInt(
      '2937959817066933702298617714945612856538843112005886376816255642404751219133084745514657634448776440866'
      + '1701890505066208632169112269581063774293102577308490531282748465986139880977280302242772832972539403531'
      + '3160108704012876427630091361567343395380424193887227773571344877461690935390938502512438971889287359033'
      + '8945177273024525306296338410881284207988753897636046529094613963869149149606209957083647645485599631919'
      + '2747663615955633778034897140982517446405334423701359108810182097749467210509584293428076654573384828809'
      + '574217079944388301239431309115013843331317877374435868468779972014486325557807783825502498215169806323',
    ),
    e: 65537,
  },
  {
    fingerprint: BigInt('-5595554452916591101'),
    n: BigInt(
      '2534288944884041556497168959071347320689884775908477905258202659454602246385394058588521595116849196570'
      + '8222649399180603818074200620463776135424884632162512403163793083921641631564740959529419359595852941166'
      + '8489405859523376133330223960965841179548922160312292373029437018775884567383353986024616752250817918203'
      + '9315375750495263623495132323782003654358104782690612092797248736680529211579223142368426126233039432475'
      + '0785450942589751755390156647751460719351439969059949569615302809050721500330239005077889855323917509948'
      + '255722081644689442127297605422579707142646660768825302832201908302295573257427896031830742328565032949',
    ),
    e: 65537,
  },
].reduce((acc, { fingerprint, ...keyInfo }) => {
  acc.set(fingerprint, keyInfo);
  return acc;
}, new Map<bigint, { n: bigint; e: number }>());

/**
 * TL `bytes`: a length header, then the bytes, then zero padding up to the next
 * multiple of 4 measured from the start of the buffer rather than from the
 * start of this field — so a trailing 3-byte field adds no padding at all when
 * the running length is already aligned. gotd's `bin.Buffer.PutBytes` and
 * webogram's `BinaryWriter.storeBytes` both do this, and the fingerprint below
 * depends on it: padding each field on its own changes the hash.
 */
function encodeTLPaddingLength(length: number) {
  return (4 - (length % 4)) % 4;
}

function encodeTLBytes(parts: Uint8Array[]) {
  let total = 0;
  const chunks: Uint8Array[] = [];

  for (const part of parts) {
    const len = part.length;
    if (len <= 253) {
      chunks.push(new Uint8Array([len]));
      total += 1;
    } else {
      chunks.push(new Uint8Array([254, len & 0xFF, (len & 0xFF00) >> 8, (len & 0xFF0000) >> 16]));
      total += 4;
    }
    chunks.push(part);
    total += len;
    total += encodeTLPaddingLength(total);
  }

  return concat(...chunks);
}

/**
 * The MTProto public key fingerprint, which is what a server advertises in
 * `req_pq_multi` and what the client echoes back in `req_DH_params`: sha1 over
 * the TL serialization of the `publicKey` body, bytes [12:20], read as a
 * little-endian signed 64-bit integer.
 */
async function computeFingerprint(n: Uint8Array, e: Uint8Array) {
  const digest = await sha1(encodeTLBytes([n, e]));
  // The last 8 bytes, little-endian — a DataView over the slice rather than a
  // reversed copy, and BigInt.asIntN for the sign.
  const view = new DataView(digest.buffer, digest.byteOffset + 12, 8);
  return BigInt.asIntN(64, view.getBigUint64(0, true));
}

let customKeyPromise: Promise<void> | undefined;

/**
 * Registers the backend's own RSA key, given as a hex modulus, alongside
 * Telegram's. Without this the DH handshake finds no key for the fingerprint
 * the backend advertises and throws "could not find a valid key".
 *
 * Idempotent and awaited once per session, before the fingerprint lookup: the
 * digest is WebCrypto, so it cannot be computed while `SERVER_KEYS` is built.
 */
export function registerCustomKey(modulusHex: string, exponent = 65537) {
  customKeyPromise ||= (async () => {
    if (!modulusHex) return;

    const modulus = BigInt(`0x${modulusHex}`);
    // `big.Int.Bytes()` in gotd, and the TL encoding, use the minimal
    // big-endian form: a leading zero byte would change both the bytes and the
    // length header that goes in front of them.
    let hex = modulus.toString(16);
    if (hex.length % 2) hex = `0${hex}`;
    let eHex = exponent.toString(16);
    if (eHex.length % 2) eHex = `0${eHex}`;

    const n = bufferFromHex(hex);
    const e = bufferFromHex(eHex);
    const fingerprint = await computeFingerprint(n, e);

    SERVER_KEYS.set(fingerprint, { n: modulus, e: exponent });
  })();

  return customKeyPromise;
}

/**
 * Encrypts the given data known the fingerprint to be used
 * in the way Telegram requires us to do so (sha1(data) + data + padding)

 * @param fingerprint the fingerprint of the RSA key.
 * @param data the data to be encrypted.
 * @returns the cipher text, or undefined if no key matching this fingerprint is found.
 */
export async function encrypt(fingerprint: bigint, data: Uint8Array): Promise<Uint8Array | undefined> {
  const key = SERVER_KEYS.get(fingerprint);
  if (!key) {
    return undefined;
  }

  // len(sha1.digest) is always 20, so we're left with 255 - 20 - x padding
  const rand = generateRandomBytes(235 - data.length);

  const toEncrypt = concat(await sha1(data), data, rand);

  // rsa module rsa.encrypt adds 11 bits for padding which we don't want
  // rsa module uses rsa.transform.bytes2int(to_encrypt), easier way:
  const payload = readBigIntFromBuffer(toEncrypt, false);
  const encrypted = modExp(payload, BigInt(key.e), key.n);
  // rsa module uses transform.int2bytes(encrypted, keylength), easier:
  return readBufferFromBigInt(encrypted, 256, false);
}
