const MAGIC = 'WSD0';
const HEADER_BYTES = 16;
const CHUNK_HEADER_BYTES = 12;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function normalizeType(type) {
  if (typeof type !== 'string' || !/^[\x20-\x7e]{4}$/.test(type)) {
    throw new TypeError('chunk type must contain exactly four printable ASCII characters');
  }
  return type;
}

function payloadBuffer(payload) {
  if (Buffer.isBuffer(payload)) return payload;
  if (payload instanceof Uint8Array) return Buffer.from(payload);
  if (typeof payload === 'string') return Buffer.from(payload, 'utf8');
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

export function encodeWsd(chunks, options = {}) {
  if (!Array.isArray(chunks)) throw new TypeError('chunks must be an array');
  const major = Number(options.major ?? 0);
  const minor = Number(options.minor ?? 1);
  const flags = Number(options.flags ?? 0) >>> 0;
  const normalized = chunks.map((chunk) => {
    const type = normalizeType(chunk.type);
    const payload = payloadBuffer(chunk.payload);
    return { type, payload, crc: crc32(payload) };
  });

  const totalBytes = HEADER_BYTES + normalized.reduce((sum, chunk) => sum + CHUNK_HEADER_BYTES + chunk.payload.length, 0);
  const output = Buffer.allocUnsafe(totalBytes);
  output.write(MAGIC, 0, 4, 'ascii');
  output.writeUInt16LE(major, 4);
  output.writeUInt16LE(minor, 6);
  output.writeUInt32LE(normalized.length, 8);
  output.writeUInt32LE(flags, 12);

  let offset = HEADER_BYTES;
  for (const chunk of normalized) {
    output.write(chunk.type, offset, 4, 'ascii');
    output.writeUInt32LE(chunk.payload.length, offset + 4);
    output.writeUInt32LE(chunk.crc, offset + 8);
    chunk.payload.copy(output, offset + CHUNK_HEADER_BYTES);
    offset += CHUNK_HEADER_BYTES + chunk.payload.length;
  }
  return output;
}

export function parseWsd(input, options = {}) {
  const verifyCrc = options.verifyCrc !== false;
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.length < HEADER_BYTES) throw new Error('WSD file is shorter than its header');
  if (buffer.toString('ascii', 0, 4) !== MAGIC) throw new Error('invalid WSD magic');
  const major = buffer.readUInt16LE(4);
  const minor = buffer.readUInt16LE(6);
  const chunkCount = buffer.readUInt32LE(8);
  const flags = buffer.readUInt32LE(12);
  const chunks = [];
  let offset = HEADER_BYTES;

  for (let index = 0; index < chunkCount; index += 1) {
    if (offset + CHUNK_HEADER_BYTES > buffer.length) throw new Error(`truncated chunk header at ${index}`);
    const type = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const expectedCrc = buffer.readUInt32LE(offset + 8);
    const payloadStart = offset + CHUNK_HEADER_BYTES;
    const payloadEnd = payloadStart + length;
    if (payloadEnd > buffer.length) throw new Error(`truncated payload for chunk ${type}`);
    const payload = buffer.subarray(payloadStart, payloadEnd);
    const actualCrc = crc32(payload);
    if (verifyCrc && actualCrc !== expectedCrc) throw new Error(`CRC mismatch for chunk ${type}`);
    chunks.push({ type, payload, crc32: expectedCrc });
    offset = payloadEnd;
  }

  if (offset !== buffer.length && options.allowTrailingBytes !== true) {
    throw new Error('unexpected trailing bytes');
  }
  return { magic: MAGIC, major, minor, flags, chunks };
}

export function decodeJsonChunk(chunk) {
  return JSON.parse(chunk.payload.toString('utf8'));
}
