import { parseStellariumData } from "@/lib/stellarium_utils";

describe("parseStellariumData", () => {
  it("parses object name, RA and declination in hh:mm:ss format", () => {
    let text = `<h2>Sun</h2>Type: <b>star</b><br/>RA/Dec (J2000.0):     3h43m23.32s/+19°43'59.3"<br/>RA/Dec (on date):     3h44m43.70s/+19°48'25.0"<br/>HA/Dec:    20h00m46.20s/+19°49'04.7"  (apparent)<br/>`;
    let expected = {
      RA: "3h44m43.70s",
      declination: "+19°48'25.0\"",
      objectName: "Sun",
    };
    let res = parseStellariumData(text);

    expect(res).toEqual(expected);
  });

  it("parses object name, RA and declination in decimal format", () => {
    let text = `<h2>Sun</h2>Type: <b>star</b><br/>RA/Dec (J2000.0):     56.99046°/19.9770°<br/>RA/Dec (on date):     57.32990°/20.0476°<br/>HA/Dec:    20h00m46.20s/+19°49'04.7"  (apparent)<br/>`;

    let expected = {
      RA: "57.32990°",
      declination: "20.0476°",
      objectName: "Sun",
    };
    let res = parseStellariumData(text);

    expect(res).toEqual(expected);
  });
});
