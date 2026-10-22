type FieldValues = number | "default" | undefined;

type Fields = {
  gain: FieldValues | string;
  exposure: FieldValues | string;
  wideGain: FieldValues | string;
  wideExposure: FieldValues | string;
  IR: FieldValues;
  binning: FieldValues;
  fileFormat: FieldValues;
  count: FieldValues;
  AiEnhance: FieldValues;
};

type AstroValidationOptions = {
  camera?: "telephoto" | "wide";
  requireLegacyFields?: boolean;
};

export function validateAstroSettings(
  values: Fields,
  options: AstroValidationOptions = {},
) {
  const errors: { [k: string]: string } = {};
  const camera = options.camera ?? "telephoto";
  const requiredFields =
    camera === "wide"
      ? ["wideGain", "wideExposure", "count"]
      : [
          "gain",
          "exposure",
          "IR",
          "count",
          ...(options.requireLegacyFields
            ? ["binning", "fileFormat", "AiEnhance"]
            : []),
        ];

  requiredFields.forEach((item) => {
    if (
      values[item as keyof Fields] === undefined ||
      values[item as keyof Fields] === "default"
    ) {
      errors[item] = `${item} is required`;
    }
  });

  const count = Number(values.count);
  if (!Number.isFinite(count) || count < 1) {
    errors.count = "count must be at least 1";
  }

  return errors;
}
