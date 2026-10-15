export type GtagCommand = (...args: unknown[]) => void;

// Keep the arguments-object command shape used by Google's gtag bootstrap.
export function createGtagQueue(dataLayer: unknown[]): GtagCommand {
  return function () {
    // eslint-disable-next-line prefer-rest-params -- Match Google's documented Arguments command format.
    dataLayer.push(arguments);
  };
}
