// utilities/lexicalToText.ts

export const lexicalToText = (lexicalJSON: string): string => {
  // If it's a string, parse it to JSON
  const lexicalData = typeof lexicalJSON === 'string' ? JSON.parse(lexicalJSON) : lexicalJSON;

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
