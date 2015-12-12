import test from 'ava';
import 'babel-core/register';
import isPlainObject from '../../src/utils/isPlainObject';

test('should return true only if plain object', t => {
  function Test() {
    this.prop = 1;
  }

  t.is(isPlainObject(new Test()), false);
  t.is(isPlainObject(new Date()), false);
  t.is(isPlainObject([1, 2, 3]), false);
  t.is(isPlainObject(null), false);
  t.is(isPlainObject(), false);
  t.is(isPlainObject({ 'x': 1, 'y': 2 }), true);

  t.end();
});
