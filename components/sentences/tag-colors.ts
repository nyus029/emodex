export const TAG_COLORS = [
  { bg: '#237440', text: '#ffffff' },
  { bg: '#2d8a4e', text: '#ffffff' },
  { bg: '#3a9d5c', text: '#ffffff' },
  { bg: '#58e18a', text: '#1e2836' },
  { bg: '#afc9c5', text: '#1e2836' },
  { bg: '#4ac07a', text: '#1e2836' },
  { bg: '#1d6b3a', text: '#ffffff' },
  { bg: '#7dd4a0', text: '#1e2836' },
];

export function getTagColor(word: string) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash * 31 + word.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}
