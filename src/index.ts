import type { Move, PromotionPieceType, Square } from '@echecs/position';

const ENTRY_SIZE = 16;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

const PROMOTIONS: Record<number, PromotionPieceType> = {
  1: 'knight',
  2: 'bishop',
  3: 'rook',
  4: 'queen',
};

/**
 * Castling moves in polyglot format use king-to-rook encoding.
 * This map translates them to standard king-destination squares.
 */
const CASTLING: Record<string, Square> = {
  e1a1: 'c1',
  e1h1: 'g1',
  e8a8: 'c8',
  e8h8: 'g8',
};

interface Entry extends Move {
  weight: number;
}

function decodeSquare(index: number): Square {
  const file = FILES[index % 8];
  const rank = RANKS[index >> 3];

  if (file === undefined || rank === undefined) {
    throw new RangeError(`Invalid square index: ${String(index)}`);
  }

  return `${file}${rank}`;
}

function decodeMove(raw: number): Omit<Entry, 'weight'> {
  const toIndex = raw & 0x3f;
  const fromIndex = (raw >> 6) & 0x3f;
  const promotionIndex = (raw >> 12) & 0x07;

  const from = decodeSquare(fromIndex);
  const to = decodeSquare(toIndex);

  // Translate castling from king-to-rook to king-destination
  const castlingKey = `${from}${to}`;
  const castlingTo = CASTLING[castlingKey];
  const destination = castlingTo ?? to;

  const promotion = PROMOTIONS[promotionIndex];

  return promotion === undefined
    ? { from, to: destination }
    : { from, promotion, to: destination };
}

function readHash(view: DataView, offset: number): bigint {
  return view.getBigUint64(offset, false);
}

/**
 * Look up all book moves for a position in a polyglot `.bin` file.
 *
 * @param book - Raw `.bin` file contents. Must have a byte length that is a
 *   multiple of 16.
 * @param hash - Polyglot zobrist hash (64-bit bigint).
 * @returns Matching entries sorted by weight descending. Returns `[]` if no
 *   entries match.
 * @throws {RangeError} If `book.byteLength` is not a multiple of 16.
 */
function lookup(book: Uint8Array, hash: bigint): Entry[] {
  if (book.byteLength % ENTRY_SIZE !== 0) {
    throw new RangeError(
      `Book size must be a multiple of ${String(ENTRY_SIZE)} bytes, got ${String(book.byteLength)}`,
    );
  }

  const entryCount = book.byteLength / ENTRY_SIZE;

  if (entryCount === 0) {
    return [];
  }

  const view = new DataView(book.buffer, book.byteOffset, book.byteLength);

  // Binary search for the hash
  let low = 0;
  let high = entryCount - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midHash = readHash(view, mid * ENTRY_SIZE);

    if (midHash === hash) {
      found = mid;
      break;
    } else if (midHash < hash) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (found === -1) {
    return [];
  }

  // Scan left to find the first entry with this hash
  let start = found;
  while (start > 0 && readHash(view, (start - 1) * ENTRY_SIZE) === hash) {
    start--;
  }

  // Scan right to find the last entry with this hash
  let end = found;
  while (
    end < entryCount - 1 &&
    readHash(view, (end + 1) * ENTRY_SIZE) === hash
  ) {
    end++;
  }

  // Collect all entries
  const entries: Entry[] = [];

  for (let index = start; index <= end; index++) {
    const offset = index * ENTRY_SIZE;
    const rawMove = view.getUint16(offset + 8, false);
    const weight = view.getUint16(offset + 10, false);
    const decoded = decodeMove(rawMove);

    entries.push({ ...decoded, weight });
  }

  // Sort by weight descending
  entries.sort((a, b) => b.weight - a.weight);

  return entries;
}

export { lookup };

export type { Entry };
