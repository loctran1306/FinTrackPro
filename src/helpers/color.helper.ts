export const addOpacity = (hex: string, opacity: number): string => {
  let s = hex.replace('#', '');

  if (s.length === 3) {
    s = s
      .split('')
      .map(c => c + c)
      .join('');
  }

  const r = parseInt(s.substring(0, 2), 16);
  const g = parseInt(s.substring(2, 4), 16);
  const b = parseInt(s.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
