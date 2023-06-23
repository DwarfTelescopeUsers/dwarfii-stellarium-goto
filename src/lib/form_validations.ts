type Fields = {
  gain: number;
  exposure: number;
  IR: number;
  binning: number;
  fileFormat: number;
  count: number;
  rightAcension: string;
  declination: string;
};

export function validateAstroSettings(values: Fields) {
  const errors: { [k: string]: string } = {};
  if (Number(values.count) < 1 || Number(values.count) > 999) {
    errors.count = "Count must be between 1 and 999";
  }

  if (values.rightAcension) {
    let matches = values.rightAcension.match(
      /^(\d{1,2})h (\d{1,2})m (\d{1,2}(\.\d{1,2})?)s/
    );
    if (!matches) {
      errors.rightAcension = "Right acension must be in 11h 11m 11s format ";
    } else {
      matches;
      let tmpErrors = [];
      const [_, hour, minute, second] = matches;
      if (Number(hour) < 0 || Number(hour) > 23) {
        tmpErrors.push("Hours must be between 0 and 23.");
      }
      if (Number(minute) < 0 || Number(minute) > 59) {
        tmpErrors.push("Minutes must be between 0 and 59.");
      }
      if (Number(second) < 0 || Number(second) > 59) {
        tmpErrors.push("Seconds must be between 0 and 59.");
      }
      errors.rightAcension = tmpErrors.join(" ");
    }
  }

  if (values.declination) {
    let matches = values.declination.match(
      /^[+-]?(\d{1,2})° (\d{1,2})' (\d{1,2}(\.\d{1,2})?)"/
    );
    if (!matches) {
      errors.declination = "Declination must be in 11° 11' 11\" format ";
    } else {
      matches;
      let tmpErrors = [];
      const [_, degree, minute, second] = matches;
      if (Number(degree) < 0 || Number(degree) > 90) {
        tmpErrors.push("Degrees must be between -90 and 90.");
      }
      if (Number(minute) < 0 || Number(minute) > 59) {
        tmpErrors.push("Minutes must be between 00 and 59.");
      }
      if (Number(second) < 0 || Number(second) > 59) {
        tmpErrors.push("Seconds must be between 00 and 59.");
      }
      errors.declination = tmpErrors.join(" ");
    }
  }

  return errors;
}
