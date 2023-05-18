const geoOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function successHandler(
  position: GeolocationPosition, // eslint-disable-line no-undef
  callback: (coords: GeolocationCoordinates) => void // eslint-disable-line no-unused-vars, no-undef
): void {
  const coords = position.coords;
  callback(coords);
}

function errorHandler(err: any): void {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

export function getCoordinates(
  callback: (coords: GeolocationCoordinates) => void // eslint-disable-line no-unused-vars, no-undef
) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      successHandler(position, callback);
    },
    errorHandler,
    geoOptions
  );
}
