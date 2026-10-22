// /lib/fitsUtils.ts
const fits = require("fitsjs") as {
  astro: {
    FITS: {
      File: new (buffer: ArrayBuffer) => {
        getHDU: (index: number) => { data: number[][] };
      };
    };
  };
};

export const loadFITS = async (
  buffer: ArrayBuffer,
): Promise<number[][] | null> => {
  try {
    // Create a new FITS file instance
    const fitsFile = new fits.astro.FITS.File(buffer);
    const hdu = fitsFile.getHDU(0); // Get the primary HDU
    const imageData = hdu.data as number[][];

    // If you need the header, you can access it with hdu.header
    // console.log(hdu.header);

    return imageData;
  } catch (error) {
    console.error("Error loading FITS file:", error);
    return null;
  }
};
