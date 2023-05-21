const geoOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

export function getCoordinates(
  successCallback: (position: GeolocationPosition) => void, // eslint-disable-line no-unused-vars, no-undef
  errorCallback: (err: any) => void // eslint-disable-line no-unused-vars, no-undef
) {
  navigator.geolocation.getCurrentPosition(
    successCallback,
    errorCallback,
    geoOptions
  );
}
