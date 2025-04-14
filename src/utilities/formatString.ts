export function formatString(string: string): string {
  const spaced = string.replace(/([A-Z])/g, ' $1');
  const capitalized = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return capitalized;
}
