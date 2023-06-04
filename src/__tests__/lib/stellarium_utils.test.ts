import {
  parseStellariumData,
  processObservationList,
  formatObsevationObjectName,
} from "@/lib/stellarium_utils";
import { StellariumObservationObject, ObservationObject } from "@/types";

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

  it("parses negative numbers", () => {
    let text =
      "<h2>Spica (Azimech - Alaraph)<br />α Vir - 67<br />SAO 157923</h2>Type: <b>double star, variable star</b> (ELL+BCEP)<br />RA/Dec (J2000.0):    13h25m12.45s/-11°09'47.6\"<br/>RA/Dec (on date):    13h26m25.97s/-11°17'03.2\"<br/>HA/Dec:     6h29m41.30s/-11°17'03.2\"  (apparent)<br/>Az./Alt.: +264°38'41.8\"/-12°23'19.1\"  (apparent)";

    let expected = {
      RA: "13h26m25.97s",
      declination: "-11°17'03.2\"",
      objectName: "Spica (Azimech - Alaraph)",
    };
    let res = parseStellariumData(text);

    expect(res).toEqual(expected);
  });
});

describe("processObservationList", () => {
  it("formats and sorts a list of observation objects", () => {
    let observations: StellariumObservationObject[] = [
      {
        constellation: "CMa",
        dec: "-20°45'32\"",
        designation: "M 41",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "4.50",
        name: "Little Beehive Cluster",
        nameI18n: "Little Beehive Cluster",
        objtype: "open star cluster",
        ra: "6h45m59.8s",
        type: "Nebula",
      },
      {
        constellation: "Cyg",
        dec: "+30°42'18\"",
        designation: "C 34",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "7.00",
        name: "Filamentary Nebula",
        nameI18n: "Filamentary Nebula",
        objtype: "supernova remnant",
        ra: "20h45m38.7s",
        type: "Nebula",
      },
      {
        constellation: "Cas",
        dec: "+61°26'50\"",
        designation: "IC 1805",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "6.50",
        name: "Heart Nebula",
        nameI18n: "Heart Nebula",
        objtype: "cluster associated with nebulosity",
        ra: "2h32m39.6s",
        type: "Nebula",
      },
      {
        constellation: "Ori",
        dec: "-2°30'04\"",
        designation: "IC 434",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "7.30",
        name: "Horsehead Nebula",
        nameI18n: "Horsehead Nebula",
        objtype: "HII region",
        ra: "5h40m46.7s",
        type: "Nebula",
      },
      {
        constellation: "Sco",
        dec: "-32°15'10\"",
        designation: "M 6",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "4.20",
        name: "Butterfly Cluster",
        nameI18n: "Butterfly Cluster",
        objtype: "open star cluster",
        ra: "17h40m21.4s",
        type: "Nebula",
      },
      {
        constellation: "Ari",
        dec: "+11°16'08\"",
        designation: "Jupiter",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "-2.09",
        name: "Jupiter",
        nameI18n: "Jupiter",
        objtype: "planet",
        ra: "2h02m08.0s",
        type: "Planet",
      },
      {
        constellation: "Leo",
        dec: "+13°05'33\"",
        designation: "M 65",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "9.30",
        name: "Leo Triplet",
        nameI18n: "Leo Triplet",
        objtype: "galaxy",
        ra: "11h18m56.2s",
        type: "Nebula",
      },

      {
        constellation: "Cyg",
        dec: "+31°44'22\"",
        designation: "C 33",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "7.00",
        name: "East Veil Nebula",
        nameI18n: "East Veil Nebula",
        objtype: "supernova remnant",
        ra: "20h56m19.6s",
        type: "Nebula",
      },
      {
        constellation: "Dor",
        dec: "-69°45'27\"",
        designation: "PGC 17223",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "0.90",
        name: "Large Magellanic Cloud",
        nameI18n: "Large Magellanic Cloud",
        objtype: "galaxy",
        ra: "5h23m31.2s",
        type: "Nebula",
      },
      {
        constellation: "Gem",
        dec: "+24°21'08\"",
        designation: "Venus",
        fov: 0,
        isVisibleMarker: true,
        jd: 0,
        landscapeID: "",
        location: "",
        magnitude: "-4.34",
        name: "Venus",
        nameI18n: "Venus",
        objtype: "planet",
        ra: "7h36m33.8s",
        type: "Planet",
      },
    ];
    let expected: ObservationObject[] = [
      {
        dec: "+11°16'08\"",
        designation: "Jupiter",
        displayName: "Jupiter",
        magnitude: "-2.09",
        objtype: "planet",
        ra: "2h02m08.0s",
        sortName1: "Jupiter",
        sortName2: -1,
      },
      {
        dec: "+24°21'08\"",
        designation: "Venus",
        displayName: "Venus",
        magnitude: "-4.34",
        objtype: "planet",
        ra: "7h36m33.8s",
        sortName1: "Venus",
        sortName2: -1,
      },
      {
        dec: "+31°44'22\"",
        designation: "C 33",
        displayName: "C 33 - East Veil Nebula",
        magnitude: "7.00",
        objtype: "supernova remnant",
        ra: "20h56m19.6s",
        sortName1: "C",
        sortName2: 33,
      },
      {
        dec: "+30°42'18\"",
        designation: "C 34",
        displayName: "C 34 - Filamentary Nebula",
        magnitude: "7.00",
        objtype: "supernova remnant",
        ra: "20h45m38.7s",
        sortName1: "C",
        sortName2: 34,
      },
      {
        dec: "-2°30'04\"",
        designation: "IC 434",
        displayName: "IC 434 - Horsehead Nebula",
        magnitude: "7.30",
        objtype: "HII region",
        ra: "5h40m46.7s",
        sortName1: "IC",
        sortName2: 434,
      },
      {
        dec: "+61°26'50\"",
        designation: "IC 1805",
        displayName: "IC 1805 - Heart Nebula",
        magnitude: "6.50",
        objtype: "cluster associated with nebulosity",
        ra: "2h32m39.6s",
        sortName1: "IC",
        sortName2: 1805,
      },
      {
        dec: "-32°15'10\"",
        designation: "M 6",
        displayName: "M 6 - Butterfly Cluster",
        magnitude: "4.20",
        objtype: "open star cluster",
        ra: "17h40m21.4s",
        sortName1: "M",
        sortName2: 6,
      },
      {
        dec: "-20°45'32\"",
        designation: "M 41",
        displayName: "M 41 - Little Beehive Cluster",
        magnitude: "4.50",
        objtype: "open star cluster",
        ra: "6h45m59.8s",
        sortName1: "M",
        sortName2: 41,
      },
      {
        dec: "+13°05'33\"",
        designation: "M 65",
        displayName: "M 65 - Leo Triplet",
        magnitude: "9.30",
        objtype: "galaxy",
        ra: "11h18m56.2s",
        sortName1: "M",
        sortName2: 65,
      },
      {
        dec: "-69°45'27\"",
        designation: "PGC 17223",
        displayName: "PGC 17223 - Large Magellanic Cloud",
        magnitude: "0.90",
        objtype: "galaxy",
        ra: "5h23m31.2s",
        sortName1: "PGC",
        sortName2: 17223,
      },
    ];

    let res = processObservationList(observations);
    expect(res).toEqual(expected);
  });
});

describe("formatObsevationObjectName", () => {
  let properties = {
    constellation: "Leo",
    dec: "+13°05'33\"",
    fov: 0,
    isVisibleMarker: true,
    jd: 0,
    landscapeID: "",
    location: "",
    magnitude: "9.30",
    objtype: "galaxy",
    ra: "11h18m56.2s",
    type: "Nebula",
  };

  it("uses designation, name, and nameI18n to create name if they are different", () => {
    let object: StellariumObservationObject = {
      designation: "M 1",
      name: "name",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "M 1 - name; nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("uses designation and name if name and nameI18n are the same", () => {
    let object: StellariumObservationObject = {
      designation: "M 1",
      name: "name",
      nameI18n: "name",
      ...properties,
    };
    let expected = "M 1 - name";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("uses designation and nameI18n to create name if designation and name are the same", () => {
    let object: StellariumObservationObject = {
      designation: "M 1",
      name: "M 1",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "M 1 - nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("uses designation to create name if designation, name, nameI18n are the same", () => {
    let object: StellariumObservationObject = {
      designation: "M 1",
      name: "M 1",
      nameI18n: "M 1",
      ...properties,
    };
    let expected = "M 1";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("ignores names that are empty strings", () => {
    let object: StellariumObservationObject = {
      designation: "M 1",
      name: "",
      nameI18n: "",
      ...properties,
    };
    let expected = "M 1";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("name and nameI18n to create name if they are different", () => {
    let object: StellariumObservationObject = {
      designation: "",
      name: "name",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "name; nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("name to create name if they are different", () => {
    let object: StellariumObservationObject = {
      designation: "",
      name: "name",
      nameI18n: "",
      ...properties,
    };
    let expected = "name";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("nameI18n to create name if they are different", () => {
    let object: StellariumObservationObject = {
      designation: "",
      name: "",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("handles missing designation", () => {
    let object: StellariumObservationObject = {
      name: "name",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "name; nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("handles missing nameI18n", () => {
    let object: StellariumObservationObject = {
      designation: "designation",
      name: "name",
      ...properties,
    };
    let expected = "designation - name";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });

  it("handles missing name", () => {
    let object: StellariumObservationObject = {
      designation: "designation",
      nameI18n: "nameI18n",
      ...properties,
    };
    let expected = "designation - nameI18n";

    let res = formatObsevationObjectName(object);
    expect(res).toEqual(expected);
  });
});
