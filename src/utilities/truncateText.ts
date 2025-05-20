export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length < maxLength && text.trim().endsWith('.')) {
    return text;
  } else {
    const truncated = text.substring(0, maxLength - 3).trimEnd();
    return truncated + '...';
  }
}
