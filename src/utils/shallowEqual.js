/*
 * copied from React Redux repository to avoid unnecessary depenendencies
 * https://github.com/rackt/react-redux/blob/master/src/utils/shallowEqual.js
 *
 */
export default function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  return keysA.every(k => objB.hasOwnProperty(k) && objA[k] === objB[k]);
}
