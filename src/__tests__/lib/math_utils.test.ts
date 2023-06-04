import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
  convertDecimalDegreesToDMS,
  convertDecimalDegreesToHMS,
  extractDMSValues,
  extractHMSValues,
} from "@/lib/math_utils";

describe("convertHMSToDecimalDegrees", () => {
  it("converts hour minute seconds into decimal degrees", () => {
    let text = "3h50m10.4s";
    let expected = 57.54333;

    let res = convertHMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("return decimal number if it is in decimal degrees", () => {
    let text = "57.54333°";
    let expected = 57.54333;

    let res = convertHMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("otherwise, returns undefined", () => {
    let text = "random";
    let expected = undefined;

    let res = convertHMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("converts hour minute seconds into decimal degrees for given decimal places", () => {
    let text = "3h50m10.4s";
    let decimalPlaces = 2;
    let expected = 57.54;

    let res = convertHMSToDecimalDegrees(text, decimalPlaces);

    expect(res).toEqual(expected);
  });
});

describe("convertDecimalDegreesToHMS", () => {
  it("converts decimal degrees to hour, minute, seconds", () => {
    let decimal = 57.54333;
    let expected = { hour: 3, min: 50, sec: 10.39 };

    let res = convertDecimalDegreesToHMS(decimal);

    expect(res).toEqual(expected);
  });
});

describe("extractHMSValues", () => {
  it("returns hours, minutes, seconds from DMS string", () => {
    let text = "3h50m10.4s";
    let expected = { hour: 3, minute: 50, second: 10.4 };

    let res = extractHMSValues(text);

    expect(res).toEqual(expected);
  });
});

describe("convertDMSToDecimalDegrees", () => {
  it("converts hour minute seconds into decimal degrees", () => {
    let text = "30°50'10.4\"";
    let expected = 30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toBeCloseTo(expected);
  });

  it("converts  negative hour minute seconds into decimal degrees", () => {
    let text = "-30°50'10.4\"";
    let expected = -30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toBeCloseTo(expected);
  });

  it("return decimal number if it is in decimal degrees", () => {
    let text = "30.83622°";
    let expected = 30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("return negative decimal number if it is in decimal degrees", () => {
    let text = "-30.83622°";
    let expected = -30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("otherwise, returns undefined", () => {
    let text = "random";
    let expected = undefined;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("converts degree minute seconds into decimal degrees for given decimal places", () => {
    let text = "30°50'10.4\"";
    let decimalPlaces = 2;
    let expected = 30.84;

    let res = convertDMSToDecimalDegrees(text, decimalPlaces);

    expect(res).toBeCloseTo(expected);
  });
});

describe("convertDecimalDegreesToDMS", () => {
  it("converts decimal degress to degress, minutes, seconds", () => {
    let decimal = 30.83622;
    let expected = { degree: 30, minute: 50, second: 10.392, negative: false };

    let res = convertDecimalDegreesToDMS(decimal);

    expect(res).toEqual(expected);
  });

  it("handles negative decimals", () => {
    let decimal = -30.83622;
    let expected = { degree: 30, minute: 50, second: 10.392, negative: true };

    let res = convertDecimalDegreesToDMS(decimal);

    expect(res).toEqual(expected);
  });
});

describe("extractDMSValues", () => {
  it("returns degree, hour, seconds from DMS string", () => {
    let text = "30°50'10.4\"";
    let expected = { degree: 30, minute: 50, second: 10.4, negative: false };

    let res = extractDMSValues(text);

    expect(res).toEqual(expected);
  });

  it("works with negative DMS string", () => {
    let text = "-30°50'10.4\"";
    let expected = { degree: 30, minute: 50, second: 10.4, negative: true };

    let res = extractDMSValues(text);

    expect(res).toEqual(expected);
  });
});
