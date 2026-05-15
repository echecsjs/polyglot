/**
 * Generates test.bin — a hand-crafted polyglot book fixture.
 *
 * Run with: npx tsx src/__tests__/fixtures/build-fixture.ts
 *
 * Entries are sorted by hash (big-endian unsigned) as required by the format.
 * Each entry is 16 bytes: 8 hash + 2 move + 2 weight + 4 learn.
 */
import { writeFileSync } from 'node:fs';
import nodePath from 'node:path';

// --- Move encoding helpers ---

function encodeSquare(square: string): number {
  const file = square.codePointAt(0)! - 97; // 'a' = 0
  const rank = Number(square[1]) - 1; // '1' = 0
  return rank * 8 + file;
}

function encodeMove(
  from: string,
  to: string,
  promotion = 0,
): number {
  return (encodeSquare(from) << 6) | encodeSquare(to) | (promotion << 12);
}

// --- Entry builder ---

function makeEntry(
  hash: bigint,
  from: string,
  to: string,
  weight: number,
  promotion = 0,
): Uint8Array {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  view.setBigUint64(0, hash, false); // big-endian hash
  view.setUint16(8, encodeMove(from, to, promotion), false); // big-endian move
  view.setUint16(10, weight, false); // big-endian weight
  view.setUint32(12, 0, false); // learn = 0
  return new Uint8Array(buf);
}

// --- Fixture entries ---
// Hashes are arbitrary but must be sorted ascending (unsigned big-endian).

// Hash 0x0000000000000001 — single entry, simple move e2e4
// Hash 0x0000000000000002 — two entries (multiple moves for same position)
// Hash 0x0000000000000003 — promotion move e7e8 promote to queen (4)
// Hash 0x0000000000000004 — promotion to knight (1)
// Hash 0x0000000000000005 — castling: white kingside (e1h1 in polyglot encoding)
// Hash 0x0000000000000006 — castling: white queenside (e1a1 in polyglot encoding)
// Hash 0x0000000000000007 — castling: black kingside (e8h8 in polyglot encoding)
// Hash 0x0000000000000008 — castling: black queenside (e8a8 in polyglot encoding)
const entries: Uint8Array[] = [
  makeEntry(0x00_00_00_00_00_00_00_01n, 'e2', 'e4', 100),
  makeEntry(0x00_00_00_00_00_00_00_02n, 'd2', 'd4', 80),
  makeEntry(0x00_00_00_00_00_00_00_02n, 'c2', 'c4', 50),
  makeEntry(0x00_00_00_00_00_00_00_03n, 'e7', 'e8', 200, 4),
  makeEntry(0x00_00_00_00_00_00_00_04n, 'a7', 'a8', 150, 1),
  makeEntry(0x00_00_00_00_00_00_00_05n, 'e1', 'h1', 90),
  makeEntry(0x00_00_00_00_00_00_00_06n, 'e1', 'a1', 70),
  makeEntry(0x00_00_00_00_00_00_00_07n, 'e8', 'h8', 60),
  makeEntry(0x00_00_00_00_00_00_00_08n, 'e8', 'a8', 40),
];

// --- Write ---

const totalLength = entries.reduce((sum, entry) => sum + entry.byteLength, 0);
const result = new Uint8Array(totalLength);
let offset = 0;
for (const entry of entries) {
  result.set(entry, offset);
  offset += entry.byteLength;
}

const outPath = nodePath.resolve(import.meta.dirname!, 'test.bin');
writeFileSync(outPath, result);
console.log(`Wrote ${entries.length} entries (${result.byteLength} bytes) to ${outPath}`);
