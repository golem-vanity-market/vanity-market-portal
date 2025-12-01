import type { Problem, ProblemId } from "db-vanity-model/src/order-schema.ts";

/**
 * Calculates "n choose k" using BigInt for perfect precision.
 */
function combinationsBigInt(n: bigint, k: bigint): bigint {
  if (k < 0n || k > n) return 0n;
  if (k === 0n || k === n) return 1n;
  if (k > n / 2n) k = n - k;

  let result = 1n;
  for (let i = 1n; i <= k; i++) {
    result = (result * (n - i + 1n)) / i;
  }
  return result;
}

/**
 * Calculates the number of addresses with EXACTLY a certain number of letters, using BigInt.
 */
function exactlyLettersCombinationsBigInt(
  letters: number,
  total: number,
): bigint {
  if (letters < 0 || letters > total) return 0n;
  const n = BigInt(total);
  const k = BigInt(letters);
  // (6^letters) * (10^(total-letters)) * combinations(total, letters)
  return 6n ** k * 10n ** (n - k) * combinationsBigInt(n, k);
}

/**
 * Calculates the number of addresses with EXACTLY a certain number of adjacent pairs, using BigInt.
 */
function snakeCombinationsBigInt(pairs: number, total: number): bigint {
  if (pairs < 0 || pairs >= total) return 0n;
  const p = BigInt(pairs);
  const n = BigInt(total);
  // 16 * 15^(total-1-pairs) * combinations(total-1, pairs)
  return 16n * 15n ** (n - 1n - p) * combinationsBigInt(n - 1n, p);
}

const TOTAL_ADDRESS_SPACE = 16n ** 40n;

/**
 * Calculates the size of the "problem space" for a given category and threshold.
 * This is the number of addresses that meet or exceed the threshold.
 * NOTE: This calculation sums the spaces for each category, ignoring overlaps.
 */
function calculateProbabilitySpace(
  category: ProblemId,
  threshold: number,
): bigint {
  switch (category) {
    case "user-prefix": {
      if (threshold > 40 || threshold < 1) return TOTAL_ADDRESS_SPACE;
      return 16n ** BigInt(40 - threshold);
    }
    case "user-suffix": {
      if (threshold > 40 || threshold < 1) return TOTAL_ADDRESS_SPACE;
      return 16n ** BigInt(40 - threshold);
    }
    case "user-mask": {
      if (threshold > 40 || threshold < 1) return TOTAL_ADDRESS_SPACE;
      return 16n ** BigInt(40 - threshold);
    }
    case "leading-any": {
      if (threshold > 40 || threshold < 1) return TOTAL_ADDRESS_SPACE;
      return 16n * 16n ** BigInt(40 - threshold);
    }
    case "trailing-any": {
      if (threshold > 40 || threshold < 1) return TOTAL_ADDRESS_SPACE;
      return 16n * 16n ** BigInt(40 - threshold);
    }
    case "letters-heavy": {
      let totalMatches = 0n;
      for (let k = threshold; k <= 40; k++) {
        totalMatches += exactlyLettersCombinationsBigInt(k, 40);
      }
      return totalMatches;
    }
    case "numbers-heavy": {
      let totalMatches = 0n;
      for (let k = threshold; k <= 40; k++) {
        totalMatches += exactlyLettersCombinationsBigInt(40 - k, 40);
      }
      return totalMatches;
    }
    case "snake-score-no-case": {
      let totalMatches = 0n;
      for (let k = threshold; k <= 39; k++) {
        totalMatches += snakeCombinationsBigInt(k, 40);
      }
      return totalMatches;
    }
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * Calculate the number of addresses that need to be checked on average
 * to find an address matching at least one problem.
 */
export function calculateWorkUnitForProblems(problems: Problem[]): number {
  const thresholds = problems.reduce(
    (acc, problem) => {
      switch (problem.type) {
        case "user-prefix":
          acc[problem.type] = problem.specifier.replace(/^0x/, "").length;
          break;
        case "user-suffix":
          acc[problem.type] = problem.specifier.length;
          break;
        case "user-mask":
          acc[problem.type] = problem.specifier
            .replace(/^0x/, "")
            .replace(/x/g, "").length;
          break;
        case "leading-any":
          acc[problem.type] = problem.length;
          break;
        case "trailing-any":
          acc[problem.type] = problem.length;
          break;
        case "letters-heavy":
          acc[problem.type] = problem.count;
          break;
        case "numbers-heavy":
          acc[problem.type] = 40;
          break;
        case "snake-score-no-case":
          acc[problem.type] = problem.count;
          break;
        default:
          break;
      }
      return acc;
    },
    {} as Record<ProblemId, number>,
  );

  let totalProbabilitySpace = 0n;

  for (const problem of problems) {
    const category = problem.type;
    const threshold = thresholds[category];
    if (threshold === undefined) continue;
    totalProbabilitySpace += calculateProbabilitySpace(category, threshold);
  }

  return Number(
    TOTAL_ADDRESS_SPACE / (totalProbabilitySpace || TOTAL_ADDRESS_SPACE),
  );
}

export function matchProblemToAddress(
  address: string,
  problems: Problem[],
): Problem | null {
  for (const problem of problems) {
    switch (problem.type) {
      case "user-prefix": {
        if (
          address
            .replace("0x", "")
            .toLowerCase()
            .startsWith(problem.specifier.replace("0x", "").toLowerCase())
        ) {
          return problem;
        }
        break;
      }
      case "user-suffix": {
        if (address.toLowerCase().endsWith(problem.specifier.toLowerCase())) {
          return problem;
        }
        break;
      }
      case "user-mask": {
        let match = true;
        const addressWithout0x = address.replace(/^0x/, "").toLowerCase();
        const maskWithout0x = problem.specifier
          .replace(/^0x/, "")
          .toLowerCase();
        for (let i = 0; i < maskWithout0x.length; i++) {
          const char = maskWithout0x[i];
          const addrChar = addressWithout0x[i];
          if (char !== "x" && (!addrChar || char !== addrChar)) {
            match = false;
            break;
          }
        }
        if (match) {
          return problem;
        }
        break;
      }
      case "leading-any": {
        const firstChar = address[2];
        let match = true;
        for (let i = 0; i < problem.length; i++) {
          if (address[2 + i] !== firstChar) {
            match = false;
            break;
          }
        }
        if (match) {
          return problem;
        }
        break;
      }
      case "trailing-any": {
        const lastChar = address[address.length - 1];
        let match = true;
        for (let i = 0; i < problem.length; i++) {
          if (address[address.length - 1 - i] !== lastChar) {
            match = false;
            break;
          }
        }
        if (match) {
          return problem;
        }
        break;
      }
      case "letters-heavy": {
        const letters = address.replace(/^0x/, "").replace(/[0-9]/g, "");
        if (letters.length >= problem.count) {
          return problem;
        }
        break;
      }
      case "numbers-heavy": {
        const numbers = address.replace(/^0x/, "").replace(/[A-Fa-f]/g, "");
        if (numbers.length === 40) {
          return problem;
        }
        break;
      }
      case "snake-score-no-case": {
        let pairs = 0;
        const addr = address.replace(/^0x/, "").toLowerCase();
        for (let i = 0; i < addr.length - 1; i++) {
          if (addr[i] === addr[i + 1]) {
            pairs++;
          }
        }
        if (pairs >= problem.count) {
          return problem;
        }
        break;
      }
    }
  }
  return null;
}

const pow16 = (exponent: number): bigint => {
  if (exponent <= 0) return 1n;
  return 16n ** BigInt(exponent);
};

const expectedTriesFromSpace = (space: bigint): bigint => {
  if (space <= 0n) return 0n;
  return TOTAL_ADDRESS_SPACE / space;
};

export type ProblemMatchInfo = {
  rarity: bigint;
  summary: string;
  powerOf16Exponent?: number;
};

export function getProblemMatchInfo(
  address: string,
  problem: Problem,
): ProblemMatchInfo | null {
  if (!address.startsWith("0x")) return null;
  const body = address.slice(2);

  switch (problem.type) {
    case "user-prefix": {
      const prefix = problem.specifier.replace(/^0x/, "");
      const length = Math.min(prefix.length, body.length);
      const matched = prefix.slice(0, length).toUpperCase();
      return {
        rarity: pow16(length),
        summary: `${length} char prefix (${matched})`,
        powerOf16Exponent: length,
      };
    }
    case "user-suffix": {
      const suffix = problem.specifier;
      const length = Math.min(suffix.length, body.length);
      const matched = suffix.slice(-length).toUpperCase();
      return {
        rarity: pow16(length),
        summary: `${length} char suffix (${matched})`,
        powerOf16Exponent: length,
      };
    }
    case "user-mask": {
      // in case mask includes 0x prefix
      const mask =
        problem.specifier.length === 42
          ? problem.specifier.slice(2).toLowerCase()
          : problem.specifier.toLowerCase();
      const lowered = body.toLowerCase();
      let matched = 0;
      for (let i = 0; i < mask.length && i < body.length; i++) {
        const maskChar = mask[i];
        const addrChar = lowered[i];
        if (maskChar !== "x" && addrChar && maskChar === addrChar) {
          matched++;
        }
      }
      return {
        rarity: pow16(matched),
        summary: `${matched} mask characters fixed`,
        powerOf16Exponent: matched,
      };
    }
    case "leading-any": {
      const lowered = body.toLowerCase();
      const first = lowered[0];
      if (!first) return null;
      let run = 0;
      for (let i = 0; i < lowered.length; i++) {
        if (lowered[i] === first) run++;
        else break;
      }
      return {
        rarity: pow16(run),
        summary: `${run} leading ${first.toUpperCase()}`,
        powerOf16Exponent: run,
      };
    }
    case "trailing-any": {
      const lowered = body.toLowerCase();
      const last = lowered[lowered.length - 1];
      if (!last) return null;
      let run = 0;
      for (let offset = 0; offset < lowered.length; offset++) {
        const idx = lowered.length - 1 - offset;
        if (idx < 0) break;
        if (lowered[idx] === last) run++;
        else break;
      }
      return {
        rarity: pow16(run),
        summary: `${run} trailing ${last.toUpperCase()}`,
        powerOf16Exponent: run,
      };
    }
    case "letters-heavy": {
      const letters = body.replace(/[0-9]/g, "");
      const count = letters.length;
      const probabilitySpace = calculateProbabilitySpace(
        "letters-heavy",
        count,
      );
      return {
        rarity: expectedTriesFromSpace(probabilitySpace),
        summary: `${count} letters`,
      };
    }
    case "numbers-heavy": {
      const numbers = body.replace(/[a-f]/gi, "");
      const count = numbers.length;
      const probabilitySpace = calculateProbabilitySpace(
        "numbers-heavy",
        count,
      );
      return {
        rarity: expectedTriesFromSpace(probabilitySpace),
        summary: `${count} digits`,
      };
    }
    case "snake-score-no-case": {
      const lowered = body.toLowerCase();
      let pairs = 0;
      for (let i = 0; i < lowered.length - 1; i++) {
        if (lowered[i] === lowered[i + 1]) {
          pairs++;
        }
      }
      const probabilitySpace = calculateProbabilitySpace(
        "snake-score-no-case",
        pairs,
      );
      return {
        rarity: expectedTriesFromSpace(probabilitySpace),
        summary: `${pairs} snake pairs`,
      };
    }
    default:
      return null;
  }
}
