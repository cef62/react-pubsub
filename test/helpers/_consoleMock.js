let original;

const noop = () => {};
export default function mockConsole() {
  if (!original) {
    original = Object.keys(console)
    .reduce((acc, key) => {
      acc[key] = console[key]; // eslint-disable-line no-console
      console[key] = noop; // eslint-disable-line no-console
      return acc;
    }, {});
  }
  return original.log;
}
