export function roundExposure(value: number): number {
  let newValue = 100000;
  if (value > 0.8) {
    newValue = Math.round(value);
  } else if (value > 0.08) {
    newValue = Math.round(value * 10) / 10;
  } else if (value > 0.008) {
    newValue = Math.round(value * 100) / 100;
  } else if (value > 0.0008) {
    newValue = Math.round(value * 1000) / 1000;
  } else {
    newValue = Math.round(value * 10000) / 10000;
  }

  return newValue;
}

export function olderThanHours(prevTime: number, hours: number): boolean {
  const oneDay = hours * 60 * 60 * 1000;
  return Date.now() - prevTime > oneDay;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
export function range(start: number, stop: number, step: number) {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (_, i) => start + i * step
  );
}

// https://www.vedantu.com/question-answer/calculate-the-right-ascension-and-decli-class-11-physics-cbse-5ff94d1cbfdd3912f3ab841e
export function convertHMSToDecimalDegrees(
  text: string,
  decimalPlaces = 5
): number | undefined {
  let hmsMatches = text.match(/(\d{1,2})[hH](\d{1,2})[mM]([0-9.]+)[sS]/);
  if (hmsMatches) {
    // eslint-disable-next-line  no-unused-vars
    let [_, hour, minute, second] = hmsMatches;
    let decimal =
      (Number(hour) + Number(minute) / 60 + Number(second) / 3600) * 15;
    return formatFloatToDecimalPlaces(decimal, decimalPlaces);
  }

  let decimalMatches = text.match(/([0-9.]+)/);
  if (decimalMatches) {
    return formatFloatToDecimalPlaces(Number(decimalMatches[1]), decimalPlaces);
  }
}

export function convertDMSToDecimalDegrees(
  text: string,
  decimalPlaces = 5
): number | undefined {
  let dmsMatches = text.match(/(\d{1,3})°(\d{1,2})'([0-9.]+)"/);
  let isNegative = text[0] === "-";
  if (dmsMatches) {
    // eslint-disable-next-line  no-unused-vars
    let [_, degree, minute, second] = dmsMatches;
    let decimal = Number(degree) + Number(minute) / 60 + Number(second) / 3600;
    decimal = isNegative ? -1 * decimal : decimal;
    return formatFloatToDecimalPlaces(decimal, decimalPlaces);
  }

  let decimalMatches = text.match(/([0-9.]+)/);
  if (decimalMatches) {
    let decimal = formatFloatToDecimalPlaces(
      Number(decimalMatches[1]),
      decimalPlaces
    );
    return isNegative ? -1 * decimal : decimal;
  }
}

// https://stackoverflow.com/a/32178833
function formatFloatToDecimalPlaces(
  value: number,
  decimalPlaces: number
): number {
  return Number(
    Math.round(parseFloat(value + "e" + decimalPlaces)) + "e-" + decimalPlaces
  );
}
