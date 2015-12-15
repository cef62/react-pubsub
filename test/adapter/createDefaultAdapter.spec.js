import test from 'ava';
import sinon from 'sinon';
import 'babel-core/register';
import consoleMock from '../helpers/_consoleMock';
import createDefaultAdapter from '../../src/adapter/createDefaultAdapter';

const log = consoleMock(); // eslint-disable-line no-unused-vars

test('should return an object with a valid adapter interface', t => {
  const adapter = createDefaultAdapter();

  t.true(adapter.hasOwnProperty('subscribe'));
  t.true(adapter.hasOwnProperty('unsubscribe'));
  t.true(adapter.hasOwnProperty('publish'));
  t.is(typeof adapter.subscribe, 'function');
  t.is(typeof adapter.unsubscribe, 'function');
  t.is(typeof adapter.publish, 'function');

  t.end();
});

test('.subscribe() should throws if `action` is missing or falsy', t => {
  const { subscribe } = createDefaultAdapter();

  t.throws(
    () => subscribe(),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe(null),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe(0),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe(false),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );

  t.end();
});

test('.subscribe() should throws if `action` is not a string', t => {
  const { subscribe } = createDefaultAdapter();

  t.throws(
    () => subscribe(33),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe(true),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe([]),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => subscribe({}),
    /Default adapter '\.subscribe\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.doesNotThrow(() => subscribe('test', () => {}));

  t.end();
});

test('.subscribe() should throws if `callback` is missing or falsy', t => {
  const { subscribe } = createDefaultAdapter();

  t.throws(
    () => subscribe('test'),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', null),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', false),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', 0),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );

  t.end();
});

test('.subscribe() should throws if `callback` is not a function', t => {
  const { subscribe } = createDefaultAdapter();

  t.throws(
    () => subscribe('test', 44),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', 'callback'),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', true),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', []),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.throws(
    () => subscribe('test', {}),
    /Default adapter '\.subscribe\(\)' expected a function as second argument instead received:/
  );
  t.doesNotThrow(() => subscribe('test', () => {}));

  t.end();
});

test('.subscribe() should return a subscription token', t => {
  const { subscribe } = createDefaultAdapter();
  const token = subscribe('test', () => {});

  t.true(Array.isArray(token));
  t.end();
});

test('.unsubscribe() should throws if `token` is missing or falsy', t => {
  const { unsubscribe } = createDefaultAdapter();

  t.throws(
    () => unsubscribe(),
    /Default adapter '\.unsubscribe\(\)' expected a token \(array\) instead received:/
  );
  t.throws(
    () => unsubscribe(0),
    /Default adapter '\.unsubscribe\(\)' expected a token \(array\) instead received:/
  );
  t.throws(
    () => unsubscribe(null),
    /Default adapter '\.unsubscribe\(\)' expected a token \(array\) instead received:/
  );
  t.throws(
    () => unsubscribe(false),
    /Default adapter '\.unsubscribe\(\)' expected a token \(array\) instead received:/
  );

  t.end();
});

test('.unsubscribe() should throws if `token` doesn\'t validate', t => {
  const { unsubscribe } = createDefaultAdapter();

  t.throws(
    () => unsubscribe([]),
    /Default adapter '\.unsubscribe\(\)' expected a valid token \(\[string, function\]\) instead received:/
  );
  t.throws(
    () => unsubscribe(['test']),
    /Default adapter '\.unsubscribe\(\)' expected a valid token \(\[string, function\]\) instead received:/
  );
  t.throws(
    () => unsubscribe([2, 'test']),
    /Default adapter '\.unsubscribe\(\)' expected a valid token \(\[string, function\]\) instead received:/
  );
  t.throws(
    () => unsubscribe([() => {}, 'test']),
    /Default adapter '\.unsubscribe\(\)' expected a valid token \(\[string, function\]\) instead received:/
  );
  t.doesNotThrow(() => unsubscribe(['test', () => {}]));

  t.end();
});

test('.unsubscribe() should print an error if `token` is not bind to a subscription', t => {
  const { unsubscribe } = createDefaultAdapter();

  const spy = sinon.spy(console, 'error');
  unsubscribe(['test', () => {}]);
  console.error.restore(); // eslint-disable-line no-console

  t.is(spy.callCount, 1);
  t.true(spy.calledWith(`You're unsubscribing an unrecognized token test,function () {}`));

  t.end();
});

test('.unsubscribe() should unsubscribe given `token`', t => {
  const { publish, subscribe, unsubscribe } = createDefaultAdapter();
  const callback = sinon.spy();
  const token = subscribe('yoooo', callback);

  publish('yoooo', ['some data']);
  t.true(callback.called);
  t.true(callback.calledWith('some data'));
  unsubscribe(token);
  publish('yoooo', ['some data']);
  t.true(callback.calledOnce);

  t.end();
});

test('.publish() should throws if `action` is missing or falsy', t => {
  const { publish } = createDefaultAdapter();

  t.throws(
    () => publish(),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish(0),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish(false),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish(null),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );

  t.end();
});

test('.publish() should throws if `action` is not a string', t => {
  const { publish } = createDefaultAdapter();

  t.throws(
    () => publish(33),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish(true),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish([]),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.throws(
    () => publish({}),
    /Default adapter '\.publish\(\)' expected an action \(string\) as first argument instead received:/
  );
  t.doesNotThrow(() => publish('test'));

  t.end();
});

test('.publish() should throws if `params` is defined and is not an array', t => {
  const { publish } = createDefaultAdapter();

  t.throws(
    () => publish('test', 33),
    /Default adapter '\.publish\(\)' expected the second argument to be null or an array instead received:/
  );
  t.throws(
    () => publish('test', true),
    /Default adapter '\.publish\(\)' expected the second argument to be null or an array instead received:/
  );
  t.throws(
    () => publish('test', 'test'),
    /Default adapter '\.publish\(\)' expected the second argument to be null or an array instead received:/
  );
  t.throws(
    () => publish('test', {}),
    /Default adapter '\.publish\(\)' expected the second argument to be null or an array instead received:/
  );
  t.doesNotThrow(() => publish('test', []));

  t.end();
});

test('.publish() should not throw if `params` is missing', t => {
  const { publish } = createDefaultAdapter();
  t.doesNotThrow(() => publish('test'));
  t.end();
});

test('.publish() should notify if `action` has no listener', t => {
  const { publish } = createDefaultAdapter();

  const spy = sinon.spy(console, 'info');
  publish('myTest');
  console.info.restore(); // eslint-disable-line no-console

  t.is(spy.callCount, 1);
  t.true(spy.calledWith(`The action 'myTest' being published has no listeners`));

  t.end();
});

test('.publish() should invoke subscribed listeners for received `action`', t => {
  const { subscribe, publish } = createDefaultAdapter();
  const callback1 = sinon.spy();
  const callback2 = sinon.spy();
  const callback3 = sinon.spy();
  subscribe('test', callback1);
  subscribe('test', callback2);
  subscribe('test', callback3);

  publish('test', ['some data']);

  t.true(callback1.called);
  t.true(callback2.called);
  t.true(callback3.called);
  t.true(callback1.calledWith('some data'));
  t.true(callback2.calledWith('some data'));
  t.true(callback3.calledWith('some data'));

  t.end();
});
