import test from 'ava';
import 'babel-core/register';
import shallowEqual from '../../src/utils/shallowEqual';

test('should return true if arguments fields are equal', t => {
  t.is(shallowEqual(
    { a: 1, b: 2, c: undefined },
    { a: 1, b: 2, c: undefined }
  ), true);

  t.is(shallowEqual(
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2, c: 3 }
  ), true);

  const o = {};
  t.is(shallowEqual(
    { a: 1, b: 2, c: o },
    { a: 1, b: 2, c: o }
  ), true);
});

test('should return false if first argument has too many keys', t => {
  t.is(shallowEqual(
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2 }
  ), false);
});

test('should return false if second argument has too many keys', t => {
  t.is(shallowEqual(
    { a: 1, b: 2 },
    { a: 1, b: 2, c: 3 }
  ), false);
});

test('should return false if arguments have different keys', t => {
  t.is(shallowEqual(
    { a: 1, b: 2, c: undefined },
    { a: 1, bb: 2, c: undefined }
  ), false);
});
