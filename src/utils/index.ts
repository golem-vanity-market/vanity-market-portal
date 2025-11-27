export function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // escape backslash
    .replace(/"/g, '\\"') // escape double quotes
    .replace(/'/g, "\\'") // escape single quotes
    .replace(/\n/g, "\\n") // escape newlines
    .replace(/\r/g, "\\r") // escape carriage returns
    .replace(/\t/g, "\\t"); // escape tabs
}

export function displayHours(totalHours: number): string {
  if (totalHours < 1) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes} m`;
  } else if (totalHours < 24) {
    return `${totalHours.toFixed(1)} h`;
  } else {
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours % 24);
    return `${days} d ${hours} h`;
  }
}

export function assetsUrl(): string {
  // Ensure the base URL ends with a slash
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + "/";
  return baseUrl + "assets/";
}

export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(" ");
}

export const displayDifficulty = (difficulty: number): string => {
  if (difficulty === undefined || difficulty === null) {
    return "N/A";
  }
  if (isNaN(difficulty)) {
    return "NaN";
  }
  const units = ["", "kH", "MH", "GH", "TH", "PH", "EH", "ZH", "YH"];
  let unitIndex = 0;

  while (difficulty >= 1000 && unitIndex < units.length - 1) {
    difficulty /= 1000;
    unitIndex++;
  }

  const precision = difficulty < 10 ? 3 : difficulty < 100 ? 2 : 1;
  return difficulty.toFixed(precision) + " " + units[unitIndex];
};
