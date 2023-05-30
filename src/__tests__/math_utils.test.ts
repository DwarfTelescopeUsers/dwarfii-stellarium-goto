import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
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

describe("convertDMSToDecimalDegrees", () => {
  it("converts hour minute seconds into decimal degrees", () => {
    let text = "30°50'10.4\"";
    let expected = 30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
  });

  it("converts  negative hour minute seconds into decimal degrees", () => {
    let text = "-30°50'10.4\"";
    let expected = -30.83622;

    let res = convertDMSToDecimalDegrees(text);

    expect(res).toEqual(expected);
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

    expect(res).toEqual(expected);
  });
});
