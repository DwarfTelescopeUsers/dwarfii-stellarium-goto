// https://www.pluralsight.com/guides/how-to-communicate-between-independent-components-in-reactjs
// https://stackoverflow.com/a/67868799

type EventListener = {
  (event: any): void; // eslint-disable-line no-unused-vars
};

const eventBus = {
  on(eventName: string, callback: EventListener) {
    document.addEventListener(eventName, (e: any) => callback(e.detail));
  },
  dispatch(eventName: string, data: any) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  },
  remove(eventName: string, callback: EventListener = () => {}) {
    document.removeEventListener<any>(eventName, callback);
  },
};
export default eventBus;
