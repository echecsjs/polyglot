# @echecs/polyglot

Read and query [Polyglot opening book](http://hgm.nubati.net/book_format.html)
(`.bin`) files. Zero dependencies, strict TypeScript.

## Installation

```bash
npm install @echecs/polyglot
```

## Quick Start

```typescript
import { readFileSync } from 'node:fs';
import { castling, enPassant, piece, turn } from '@echecs/zobrist';

import { lookup } from '@echecs/polyglot';

// Load the book
const book = new Uint8Array(readFileSync('book.bin').buffer);

// Compute the zobrist hash for the starting position
let hash = 0n;
hash ^= piece('a1', 'rook', 'white');
hash ^= piece('b1', 'knight', 'white');
// ... XOR all pieces, castling rights, en passant, and turn ...
hash ^= turn('white');
hash ^= castling('white', 'king');
hash ^= castling('white', 'queen');
hash ^= castling('black', 'king');
hash ^= castling('black', 'queen');

// Look up book moves
const entries = lookup(book, hash);
// [{ from: 'e2', to: 'e4', weight: 1234 }, { from: 'd2', to: 'd4', weight: 987 }, ...]
```

## API

### `lookup(book, hash)`

Look up all book moves for a position.

- **`book`** — `Uint8Array` — Raw `.bin` file contents. Byte length must be a
  multiple of 16.
- **`hash`** — `bigint` — Polyglot zobrist hash, computed via
  [`@echecs/zobrist`](https://github.com/echecsjs/zobrist).
- **Returns** `Entry[]` — Matching entries sorted by weight descending. Returns
  `[]` if no entries match.
- **Throws** `RangeError` if `book.byteLength` is not a multiple of 16.

### `Entry`

Extends [`Move`](https://github.com/echecsjs/position) from
`@echecs/position`:

| Field       | Type                 | Description                                 |
| ----------- | -------------------- | ------------------------------------------- |
| `from`      | `Square`             | Origin square                               |
| `to`        | `Square`             | Destination square                          |
| `promotion` | `PromotionPieceType` | Optional — only present for promotion moves |
| `weight`    | `number`             | 16-bit weight from the book (0–65535)       |

An `Entry` is directly usable anywhere a `Move` is expected.

## License

[MIT](LICENSE)
