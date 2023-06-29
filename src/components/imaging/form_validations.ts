type FieldValues = number | "default" | undefined;

type Fields = {
  gain: FieldValues;
  exposure: FieldValues;
  IR: FieldValues;
  binning: FieldValues;
  fileFormat: FieldValues;
  count: FieldValues;
};

export function validateAstroSettings(values: Fields) {
  const errors: { [k: string]: string } = {};
  ["gain", "exposure", "IR", "binning", "fileFormat", "count"].forEach(
    (item) => {
      if (
        values[item as keyof Fields] === undefined ||
        values[item as keyof Fields] === "default"
      ) {
        errors[item] = `${item} is required`;
      }
    }
  );

  return errors;
}
