type Fields = {
  gain: number;
  exposure: number;
  IR: number;
  binning: number;
  fileFormat: number;
  count: number;
};

export function validateAstroSettings(values: Fields) {
  const errors: { [k: string]: string } = {};
  ["gain", "exposure", "IR", "binning", "fileFormat", "count"].forEach(
    (item) => {
      if (values[item as keyof Fields] === undefined) {
        errors[item] = `${item} is required`;
      }
    }
  );

  return errors;
}
