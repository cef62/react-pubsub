import test from 'ava';
import sinon from 'sinon';
import 'babel-core/register';
import consoleMock from '../helpers/_consoleMock';
import createPubSub from '../../src/adapter/createPubSub';

const log = consoleMock(); // eslint-disable-line no-unused-vars

test('should return an object with a valid pubSubCore interface', t => {
  const pubSubCore = createPubSub();

  t.true(typeof pubSubCore.register === 'function');
  t.true(typeof pubSubCore.unregister === 'function');

  t.end();
});

test('should use a default map when subscribersMap is undefined', t => {
  const pubSubCore = createPubSub();
  const fakeComp = 'TEST';
  t.doesNotThrow(() => pubSubCore.register(fakeComp));
  t.end();
});

test('should use subscribersMap when passed', t => {
  const map = {};
  const pubSubCore = createPubSub(map);
  const fakeComp = 'TEST';
  const pubSub = pubSubCore.register(fakeComp);

  t.is(map[fakeComp], pubSub);
  t.is(Object.keys(map)[0], fakeComp);

  t.end();
});

test.skip('should use the default pub-sub adapter when `adapter` is undefined', t => {
  // TODO: how to mock 'createDefaultAdapter'?
  const pubSubCore = createPubSub();
  const fakeComp = 'TEST';
  t.doesNotThrow(() => pubSubCore.register(fakeComp));
  t.end();
});

test('should use `adapter` when passed', t => {
  const adapter = {
    subscribe: sinon.spy(),
  };

  const pubSubCore = createPubSub(undefined, adapter);
  const fakeComp = 'TEST';
  const pubSub = pubSubCore.register(fakeComp);
  pubSub.add('test', () => {});

  t.true(adapter.subscribe.called);
  t.end();
});

test('.register() should return an object with a valid interface', t => {
  const pubSubCore = createPubSub();
  const fakeComp = 'TEST';
  const pubSub = pubSubCore.register(fakeComp);

  t.true(Array.isArray(pubSub.subscriptions));
  t.true(typeof pubSub.add === 'function');
  t.true(typeof pubSub.removeAll === 'function');
  t.true(typeof pubSub.publish === 'function');
  t.true(typeof pubSub.unsubscribe === 'function');

  t.end();
});

test('.register() should throws when invoked with falsy target component', t => {
  const pubSubCore = createPubSub();

  t.throws(
    () => pubSubCore.register(),
    /'createPubSub\.register\(\)' expected a component instead received\:/
  );
  t.throws(
    () => pubSubCore.register(null),
    /'createPubSub\.register\(\)' expected a component instead received\:/
  );

  t.end();
});

test('.unregister() should unregister a component registerd with .register()', t => {
  const pubSubCore = createPubSub();
  const fakeComp = 'TEST';
  const pubSub = pubSubCore.register(fakeComp);

  const spy = sinon.spy();
  pubSub.add('test', spy);
  pubSub.publish('test', 'testInvocation');

  t.true(spy.calledOnce);
  t.is(spy.callCount, 1);
  t.true(spy.calledWith('testInvocation'));

  pubSubCore.unregister(fakeComp);
  pubSub.publish('test', 'testInvocation');

  t.is(spy.callCount, 1);
  t.end();
});

test('.unregister() should print an error when receive a component not registered', t => {
  const pubSubCore = createPubSub();
  pubSubCore.register('test');

  const spy = sinon.spy(console, 'error');
  pubSubCore.unregister('otherTest');
  console.error.restore(); // eslint-disable-line no-console
  t.is(spy.callCount, 1);

  t.end();
});


test('.unregister() should throws when invoked with falsy target component', t => {
  const pubSubCore = createPubSub();
  pubSubCore.register('test');

  t.throws(
    () => pubSubCore.unregister(),
    /'createPubSub\.unregister\(\)' expected a component instead received\:/
  );
  t.throws(
    () => pubSubCore.unregister(null),
    /'createPubSub\.unregister\(\)' expected a component instead received\:/
  );

  t.end();
});
