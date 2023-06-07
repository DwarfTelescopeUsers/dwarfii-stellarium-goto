export function pluralize(
  count: number,
  singleWord: string,
  pluralWord: string
) {
  return count === 1 ? singleWord : pluralWord;
}
