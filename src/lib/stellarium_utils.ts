import { ParsedStellariumData } from "@/types";

export function parseStellariumData(text: string): ParsedStellariumData {
  let data = {} as ParsedStellariumData;

  const RADecData = parseRADec(text);
  if (RADecData) {
    data.RA = RADecData.RA;
    data.declination = RADecData.declination;
  }
  const nameData = parseObjectName(text);
  if (nameData) {
    data.objectName = nameData.objectName;
  }

  return data;
}

function parseRADec(text: string) {
  let matches = text.match(
    /RA\/Dec \(on date\): *([-0-9hms.+°]+)\/([-0-9.+°'"]+)/
  );
  if (matches) {
    return { RA: matches[1], declination: matches[2] };
  }
}

function parseObjectName(text: string) {
  let matches = text.match(/<h2>(.*?)<\/h2>/);
  if (matches) {
    return { objectName: matches[1].split("<br")[0] };
  }
}
