export const allowedExposures = {
  defaultValueIndex: 75,
  values: [
    {
      index: 0,
      name: "1/10000",
    },
    {
      index: 3,
      name: "1/8000",
    },
    {
      index: 6,
      name: "1/6400",
    },
    {
      index: 9,
      name: "1/5000",
    },
    {
      index: 12,
      name: "1/4000",
    },
    {
      index: 15,
      name: "1/3200",
    },
    {
      index: 18,
      name: "1/2500",
    },
    {
      index: 21,
      name: "1/2000",
    },
    {
      index: 24,
      name: "1/1600",
    },
    {
      index: 27,
      name: "1/1250",
    },
    {
      index: 30,
      name: "1/1000",
    },
    {
      index: 33,
      name: "1/800",
    },
    {
      index: 36,
      name: "1/640",
    },
    {
      index: 39,
      name: "1/500",
    },
    {
      index: 42,
      name: "1/400",
    },
    {
      index: 45,
      name: "1/320",
    },
    {
      index: 48,
      name: "1/250",
    },
    {
      index: 51,
      name: "1/200",
    },
    {
      index: 54,
      name: "1/160",
    },
    {
      index: 57,
      name: "1/125",
    },
    {
      index: 60,
      name: "1/100",
    },
    {
      index: 63,
      name: "1/80",
    },
    {
      index: 66,
      name: "1/60",
    },
    {
      index: 69,
      name: "1/50",
    },
    {
      index: 72,
      name: "1/40",
    },
    {
      index: 75,
      name: "1/30",
    },
    {
      index: 78,
      name: "1/25",
    },
    {
      index: 81,
      name: "1/20",
    },
    {
      index: 90,
      name: "1/10",
    },
    {
      index: 93,
      name: "1/8",
    },
    {
      index: 96,
      name: "1/6",
    },
    {
      index: 99,
      name: "1/5",
    },
    {
      index: 102,
      name: "1/4",
    },
    {
      index: 105,
      name: "1/3",
    },
    {
      index: 108,
      name: "0.4",
    },
    {
      index: 111,
      name: "0.5",
    },
    {
      index: 114,
      name: "0.6",
    },
    {
      index: 117,
      name: "0.8",
    },
    {
      index: 120,
      name: "1",
    },
    {
      index: 123,
      name: "1.3",
    },
    {
      index: 126,
      name: "1.6",
    },
    {
      index: 129,
      name: "2",
    },
    {
      index: 132,
      name: "2.5",
    },
    {
      index: 135,
      name: "3.2",
    },
    {
      index: 138,
      name: "4",
    },
    {
      index: 141,
      name: "5",
    },
    {
      index: 144,
      name: "6",
    },
    {
      index: 147,
      name: "8",
    },
    {
      index: 150,
      name: "10",
    },
    {
      index: 153,
      name: "13",
    },
    {
      index: 156,
      name: "15",
    },
  ],
};

export const getExposureNameByIndex = (index) => {
  const foundOption = allowedExposures.values.find(
    (option) => option.index === index
  );
  return foundOption ? foundOption.name : "Auto";
};

export const getExposureValueByIndex = (index) => {
  const name = getExposureNameByIndex(index);
  if (name == "Auto") return 1;
  else return eval(name);
};

export const getExposureIndexByName = (name) => {
  const foundOption = allowedExposures.values.find(
    (option) => option.name === name
  );
  return foundOption ? foundOption.index : allowedExposures.defaultValueIndex;
};

export const allowedGains = {
  defaultValueIndex: 0,
  values: [
    {
      index: 0,
      name: "0",
    },
    {
      index: 3,
      name: "10",
    },
    {
      index: 6,
      name: "20",
    },
    {
      index: 9,
      name: "30",
    },
    {
      index: 12,
      name: "40",
    },
    {
      index: 15,
      name: "50",
    },
    {
      index: 18,
      name: "60",
    },
    {
      index: 21,
      name: "70",
    },
    {
      index: 24,
      name: "80",
    },
    {
      index: 27,
      name: "90",
    },
    {
      index: 30,
      name: "100",
    },
    {
      index: 33,
      name: "110",
    },
    {
      index: 36,
      name: "120",
    },
    {
      index: 39,
      name: "130",
    },
    {
      index: 42,
      name: "140",
    },
    {
      index: 45,
      name: "150",
    },
    {
      index: 48,
      name: "160",
    },
    {
      index: 51,
      name: "170",
    },
    {
      index: 54,
      name: "180",
    },
    {
      index: 57,
      name: "190",
    },
    {
      index: 60,
      name: "200",
    },
    {
      index: 63,
      name: "210",
    },
    {
      index: 66,
      name: "220",
    },
    {
      index: 69,
      name: "230",
    },
    {
      index: 72,
      name: "240",
    },
  ],
};

export const getGainNameByIndex = (index) => {
  const foundOption = allowedGains.values.find(
    (option) => option.index === index
  );
  return foundOption ? foundOption.name : "Auto";
};

export const getGainIndexByName = (name) => {
  const foundOption = allowedGains.values.find(
    (option) => option.name === name
  );
  return foundOption ? foundOption.index : allowedGains.defaultValueIndex;
};
