import {
  randomChoice,
  randomFloat,
  randomInt,
  seededRandom,
  shuffleArray,
} from '../../src/helpers/random';

describe('random', () => {
  describe('seededRandom', () => {
    it('returns a function', () => {
      const gen = seededRandom('test');
      expect(typeof gen).toBe('function');
    });

    it('returns values between 0 and 1', () => {
      const gen = seededRandom('range-test');
      for (let i = 0; i < 100; i += 1) {
        const val = gen();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('same seed produces same sequence', () => {
      const gen1 = seededRandom('deterministic');
      const gen2 = seededRandom('deterministic');

      for (let i = 0; i < 50; i += 1) {
        expect(gen1()).toBe(gen2());
      }
    });

    it('different seeds produce different sequences', () => {
      const gen1 = seededRandom('seed-a');
      const gen2 = seededRandom('seed-b');

      const values1 = Array.from({ length: 10 }, () => gen1());
      const values2 = Array.from({ length: 10 }, () => gen2());

      // At least one value should differ
      const isIdentical = values1.every((v, i) => v === values2[i]);
      expect(isIdentical).toBe(false);
    });

    it('handles empty string seed', () => {
      const gen = seededRandom('');
      expect(typeof gen).toBe('function');
      const val = gen();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  describe('randomInt', () => {
    it('returns integers within [min, max]', () => {
      const gen = seededRandom('int-test');
      for (let i = 0; i < 200; i += 1) {
        const val = randomInt(gen, 5, 15);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(15);
      }
    });

    it('works when min equals max', () => {
      const gen = seededRandom('int-equal');
      const val = randomInt(gen, 7, 7);
      expect(val).toBe(7);
    });

    it('works with negative ranges', () => {
      const gen = seededRandom('int-negative');
      for (let i = 0; i < 100; i += 1) {
        const val = randomInt(gen, -10, -1);
        expect(val).toBeGreaterThanOrEqual(-10);
        expect(val).toBeLessThanOrEqual(-1);
      }
    });
  });

  describe('randomFloat', () => {
    it('returns floats within [min, max)', () => {
      const gen = seededRandom('float-test');
      for (let i = 0; i < 200; i += 1) {
        const val = randomFloat(gen, 1, 5);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThan(5);
      }
    });

    it('works with very small ranges', () => {
      const gen = seededRandom('float-small');
      for (let i = 0; i < 100; i += 1) {
        const val = randomFloat(gen, -0.0001, 0.0001);
        expect(val).toBeGreaterThanOrEqual(-0.0001);
        expect(val).toBeLessThan(0.0001);
      }
    });
  });

  describe('randomChoice', () => {
    it('returns an element from the array', () => {
      const gen = seededRandom('choice-test');
      const items = ['a', 'b', 'c', 'd', 'e'] as const;

      for (let i = 0; i < 100; i += 1) {
        const val = randomChoice(gen, items);
        expect(items).toContain(val);
      }
    });

    it('returns the only element for single-item arrays', () => {
      const gen = seededRandom('choice-single');
      const val = randomChoice(gen, ['only']);
      expect(val).toBe('only');
    });

    it('works with number arrays', () => {
      const gen = seededRandom('choice-numbers');
      const numbers = [2, 4, 8, 16] as const;

      for (let i = 0; i < 100; i += 1) {
        const val = randomChoice(gen, numbers);
        expect(numbers).toContain(val);
      }
    });
  });

  describe('shuffleArray', () => {
    it('returns a new array with the same elements', () => {
      const gen = seededRandom('shuffle-test');
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(gen, original);

      // Same length
      expect(shuffled).toHaveLength(original.length);

      // Same elements when sorted
      expect([...shuffled].sort((a, b) => a - b)).toEqual(
        [...original].sort((a, b) => a - b),
      );
    });

    it('does not mutate the original array', () => {
      const gen = seededRandom('shuffle-mutate');
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      shuffleArray(gen, original);

      expect(original).toEqual(copy);
    });

    it('is deterministic for same seed', () => {
      const gen1 = seededRandom('shuffle-det');
      const gen2 = seededRandom('shuffle-det');
      const items = ['a', 'b', 'c', 'd', 'e'];

      const result1 = shuffleArray(gen1, items);
      const result2 = shuffleArray(gen2, items);

      expect(result1).toEqual(result2);
    });

    it('handles empty arrays', () => {
      const gen = seededRandom('shuffle-empty');
      const result = shuffleArray(gen, []);
      expect(result).toEqual([]);
    });

    it('handles single-element arrays', () => {
      const gen = seededRandom('shuffle-single');
      const result = shuffleArray(gen, ['only']);
      expect(result).toEqual(['only']);
    });
  });
});
