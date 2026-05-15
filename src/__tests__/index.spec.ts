import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { describe, expect, it } from 'vitest';

import { lookup } from '../index.js';

const FIXTURE_PATH = nodePath.resolve(
  import.meta.dirname ?? '',
  'fixtures',
  'test.bin',
);
const book = new Uint8Array(readFileSync(FIXTURE_PATH));

describe('lookup', () => {
  describe('validation', () => {
    it('throws RangeError when book length is not a multiple of 16', () => {
      const bad = new Uint8Array(15);
      expect(() => lookup(bad, 0n)).toThrow(RangeError);
    });

    it('returns [] for an empty book', () => {
      const empty = new Uint8Array(0);
      expect(lookup(empty, 0n)).toEqual([]);
    });
  });

  describe('simple moves', () => {
    it('finds a single entry by hash', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_01n);
      expect(result).toEqual([{ from: 'e2', to: 'e4', weight: 100 }]);
    });

    it('returns [] when no entry matches the hash', () => {
      const result = lookup(book, 0xff_ff_ff_ff_ff_ff_ff_ffn);
      expect(result).toEqual([]);
    });
  });

  describe('multiple entries', () => {
    it('returns all entries for a hash, sorted by weight descending', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_02n);
      expect(result).toEqual([
        { from: 'd2', to: 'd4', weight: 80 },
        { from: 'c2', to: 'c4', weight: 50 },
      ]);
    });
  });

  describe('promotion', () => {
    it('decodes queen promotion', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_03n);
      expect(result).toEqual([
        { from: 'e7', to: 'e8', promotion: 'queen', weight: 200 },
      ]);
    });

    it('decodes knight promotion', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_04n);
      expect(result).toEqual([
        { from: 'a7', to: 'a8', promotion: 'knight', weight: 150 },
      ]);
    });
  });

  describe('castling', () => {
    it('decodes white kingside castling (e1h1 → e1g1)', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_05n);
      expect(result).toEqual([{ from: 'e1', to: 'g1', weight: 90 }]);
    });

    it('decodes white queenside castling (e1a1 → e1c1)', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_06n);
      expect(result).toEqual([{ from: 'e1', to: 'c1', weight: 70 }]);
    });

    it('decodes black kingside castling (e8h8 → e8g8)', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_07n);
      expect(result).toEqual([{ from: 'e8', to: 'g8', weight: 60 }]);
    });

    it('decodes black queenside castling (e8a8 → e8c8)', () => {
      const result = lookup(book, 0x00_00_00_00_00_00_00_08n);
      expect(result).toEqual([{ from: 'e8', to: 'c8', weight: 40 }]);
    });
  });
});
