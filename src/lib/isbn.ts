/** Returns a validated ISBN-13, converting ISBN-10 for reliable comparisons. */
export function canonicalIsbn(value: string | undefined): string | undefined {
  const isbn = (value || '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, char, i) => total + (char === 'X' ? 10 : Number(char)) * (10 - i),
      0,
    );
    if (sum % 11) return undefined;
    const first = `978${isbn.slice(0, 9)}`;
    const check =
      (10 -
        ([...first].reduce(
          (sum, char, i) => sum + Number(char) * (i % 2 ? 3 : 1),
          0,
        ) %
          10)) %
      10;
    return first + check;
  }
  if (!/^97[89]\d{10}$/.test(isbn)) return undefined;
  const sum = [...isbn].reduce(
    (total, char, i) => total + Number(char) * (i % 2 ? 3 : 1),
    0,
  );
  return sum % 10 === 0 ? isbn : undefined;
}
