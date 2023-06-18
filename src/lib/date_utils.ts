// https://stackoverflow.com/a/11888430
export const isDstObserved = function (date: Date): boolean {
  var jan = new Date(date.getFullYear(), 0, 1);
  var jul = new Date(date.getFullYear(), 6, 1);
  let stdTimezoneOffset = Math.max(
    jan.getTimezoneOffset(),
    jul.getTimezoneOffset()
  );
  return date.getTimezoneOffset() < stdTimezoneOffset;
};
