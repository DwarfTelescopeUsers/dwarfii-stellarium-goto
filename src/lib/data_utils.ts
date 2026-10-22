import { data_dwarf2_config } from "@/lib/data_dwarf2_config";
import { data_dwarf3_config } from "@/lib/data_dwarf3_config";

// Function to get the exposures from JSON data
const getExposuresDwarf2 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf2_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 0);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getExposuresDwarf3 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf3_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 0);
  value = supportParam.gearMode;
  return value ? value : false;
};

// Camera ranges extracted from the DWARFLAB 3.4.1 parameter catalog. The
// Mini deliberately has a narrower gain range, a longer tele exposure range,
// and its own two-position filter selector.
const getExposuresDwarfMini = () => ({
  defaultValueIndex: 156,
  values: [
    ...getExposuresDwarf3().values.filter(({ index }) => index >= 120),
    { index: 168, name: "180" },
  ],
});

export const allowedExposures = {
  1: getExposuresDwarf2(),
  2: getExposuresDwarf3(),
  4: getExposuresDwarfMini(),
};

export const getExposureIndexDefault = (DwarfModelId = 1) => {
  let index = 75;
  if (allowedExposures[DwarfModelId])
    index = allowedExposures[DwarfModelId].defaultValueIndex;
  return index;
};

export const getExposureDefault = (DwarfModelId = 1) => {
  let foundOption;
  let index;
  if (allowedExposures[DwarfModelId])
    index = allowedExposures[DwarfModelId].defaultValueIndex;
  foundOption = allowedExposures[DwarfModelId].values.find(
    (option) => option.index === index,
  );
  return foundOption ? foundOption.name : "1/30";
};

export const getExposureNameByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedExposures[DwarfModelId])
    foundOption = allowedExposures[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Auto";
};

export const getExposureValueByIndex = (index, DwarfModelId = 1) => {
  const name = getExposureNameByIndex(index, DwarfModelId);
  if (name == "Auto") return eval(getExposureDefault(DwarfModelId));
  else return eval(name);
};

export const getExposureIndexByName = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedExposures[DwarfModelId])
    foundOption = allowedExposures[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index = allowedExposures[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 75;
};

// Function to get the gains from JSON data
const getGainsDwarf2 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf2_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 1);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getGainsDwarf3 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf3_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 1);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getGainsDwarfMini = () => ({
  defaultValueIndex: 18,
  values: getGainsDwarf3().values.filter(
    ({ index }) => index >= 12 && index <= 30,
  ),
});

export const allowedGains = {
  1: getGainsDwarf2(),
  2: getGainsDwarf3(),
  4: getGainsDwarfMini(),
};

export const getGainNameByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedGains[DwarfModelId])
    foundOption = allowedGains[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Auto";
};

export const getGainIndexByName = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedGains[DwarfModelId])
    foundOption = allowedGains[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index = allowedGains[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 0;
};

// Function to get the WB Color Temp from JSON data
const getWBColorTempDwarf2 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf2_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 2);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getWBColorTempDwarf3 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf3_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 2);
  value = supportParam.gearMode;
  return value ? value : false;
};

export const allowedWBColorTemp = {
  1: getWBColorTempDwarf2(),
  2: getWBColorTempDwarf3(),
  4: getWBColorTempDwarf3(),
};

export const getWBColorTempValueByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedWBColorTemp[DwarfModelId])
    foundOption = allowedWBColorTemp[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Auto";
};

export const getWBColorTempIndexByValue = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedWBColorTemp[DwarfModelId])
    foundOption = allowedWBColorTemp[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index = allowedWBColorTemp[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 51;
};

// Function to get the CountBurst from JSON data
const getCountBurstDwarf2 = () => {
  let value;
  const featureParam = data_dwarf2_config.data.featureParams.find(
    (feature) => feature.id === 3,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

const getCountBurstDwarf3 = () => {
  let value;
  const featureParam = data_dwarf3_config.data.featureParams.find(
    (feature) => feature.id === 3,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

export const allowedCountBurst = {
  1: getCountBurstDwarf2(),
  2: getCountBurstDwarf3(),
  4: getCountBurstDwarf3(),
};

export const getCountBurstValueByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedCountBurst[DwarfModelId])
    foundOption = allowedCountBurst[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Select";
};

export const getCountBurstIndexByValue = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedCountBurst[DwarfModelId])
    foundOption = allowedCountBurst[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index = allowedCountBurst[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 0;
};

// Function to get the IntervalBurst from JSON data
const getCountIntervalDwarf2 = () => {
  let value;
  const featureParam = data_dwarf2_config.data.featureParams.find(
    (feature) => feature.id === 9,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

const getCountIntervalDwarf3 = () => {
  let value;
  const featureParam = data_dwarf3_config.data.featureParams.find(
    (feature) => feature.id === 9,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

export const allowedIntervalBurst = {
  1: getCountIntervalDwarf2(),
  2: getCountIntervalDwarf3(),
  4: getCountIntervalDwarf3(),
};

export const getIntervalBurstValueByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedIntervalBurst[DwarfModelId])
    foundOption = allowedIntervalBurst[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Select";
};

export const getIntervalBurstIndexByValue = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedIntervalBurst[DwarfModelId])
    foundOption = allowedIntervalBurst[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index = allowedIntervalBurst[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 0;
};

// Function to get the IntervalTimeLapse from JSON data
const getIntervalTimeLapseDwarf2 = () => {
  let value;
  const featureParam = data_dwarf2_config.data.featureParams.find(
    (feature) => feature.id === 4,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

const getIntervalTimeLapseDwarf3 = () => {
  let value;
  const featureParam = data_dwarf3_config.data.featureParams.find(
    (feature) => feature.id === 4,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

export const allowedIntervalTimeLapse = {
  1: getIntervalTimeLapseDwarf2(),
  2: getIntervalTimeLapseDwarf3(),
  4: getIntervalTimeLapseDwarf3(),
};

export const getIntervalTimeLapseValueByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedIntervalTimeLapse[DwarfModelId])
    foundOption = allowedIntervalTimeLapse[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Select";
};

export const getIntervalTimeLapseIndexByValue = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedIntervalTimeLapse[DwarfModelId])
    foundOption = allowedIntervalTimeLapse[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index =
      allowedIntervalTimeLapse[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 0;
};

// Function to get the TotalTimeTimeLapse from JSON data
const getTotalTimeTimeLapseDwarf2 = () => {
  let value;
  const featureParam = data_dwarf2_config.data.featureParams.find(
    (feature) => feature.id === 5,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

const getTotalTimeTimeLapseDwarf3 = () => {
  let value;
  const featureParam = data_dwarf3_config.data.featureParams.find(
    (feature) => feature.id === 5,
  );
  if (featureParam) value = featureParam.gearMode;
  return value ? value : false;
};

export const allowedTotalTimeTimeLapse = {
  1: getTotalTimeTimeLapseDwarf2(),
  2: getTotalTimeTimeLapseDwarf3(),
  4: getTotalTimeTimeLapseDwarf3(),
};

export const getTotalTimeTimeLapseValueByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedTotalTimeTimeLapse[DwarfModelId])
    foundOption = allowedTotalTimeTimeLapse[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "Select";
};

export const getTotalTimeTimeLapseIndexByValue = (name, DwarfModelId = 1) => {
  let foundOption;
  if (allowedTotalTimeTimeLapse[DwarfModelId])
    foundOption = allowedTotalTimeTimeLapse[DwarfModelId].values.find(
      (option) => option.name === String(name),
    );
  if (!foundOption)
    foundOption.index =
      allowedTotalTimeTimeLapse[DwarfModelId].defaultValueIndex;
  return foundOption ? foundOption.index : 0;
};

// Function to get the IR from JSON data
const getIRDwarf2 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf2_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 8);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getIRDwarf3 = () => {
  let value;
  let supportParam;
  const camera = data_dwarf3_config.data.cameras.find(
    (camera) => camera.id === 0,
  );
  if (camera)
    supportParam = camera.supportParams.find((param) => param.id === 8);
  value = supportParam.gearMode;
  return value ? value : false;
};

const getIRDwarfMini = () => ({
  defaultValueIndex: 0,
  values: [
    { index: 0, name: "Astro Filter" },
    { index: 1, name: "Duo-Band Filter" },
  ],
});

export const allowedIRs = {
  1: getIRDwarf2(),
  2: getIRDwarf3(),
  4: getIRDwarfMini(),
};

export const getIRNameByIndex = (index, DwarfModelId = 1) => {
  let foundOption;
  if (allowedIRs[DwarfModelId])
    foundOption = allowedIRs[DwarfModelId].values.find(
      (option) => option.index === index,
    );
  return foundOption ? foundOption.name : "_";
};
