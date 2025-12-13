// utilities/lexicalToText.ts

export const lexicalToText = (lexicalJSON: string | undefined | null): string => {
  // Handle undefined, null, or empty input
  if (!lexicalJSON) {
    return '';
  }

  // If it's a string, parse it to JSON
  let lexicalData;
  try {
    lexicalData = typeof lexicalJSON === 'string' ? JSON.parse(lexicalJSON) : lexicalJSON;
  } catch (error) {
    // If parsing fails, return empty string
    return '';
  }

  // Handle case where parsed data is not an object or doesn't have root
  if (!lexicalData || typeof lexicalData !== 'object' || !lexicalData.root) {
    return '';
  }

  // Extract all text nodes recursively
  let plainText = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractText = (node: any) => {
    // If it's a text node, add its text
    if (node.type === 'text') {
      plainText += node.text || '';
    }

    // Process paragraph breaks
    if (node.type === 'paragraph') {
      if (plainText && !plainText.endsWith('\n')) {
        plainText += '\n';
      }
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(extractText);
    }
  };

  // Start extraction from the root
  if (lexicalData.root && lexicalData.root.children) {
    lexicalData.root.children.forEach(extractText);
  }

  return plainText.trim();
};
