import test from 'ava';
import sinon from 'sinon';
import 'babel-core/register';
import createPubSubAdapter from '../../src/adapter/createPubSubAdapter';

test('createPubSubAdapter: should return an object with a specific interface', t => {
  const api = createPubSubAdapter({});
  t.true(api.hasOwnProperty('publish'));
  t.true(api.hasOwnProperty('subscribe'));
  t.true(api.hasOwnProperty('unsubscribe'));
  t.end();
});

test('createPubSubAdapter: should expose correct methods from given adapter', t => {
  const api = createPubSubAdapter({
    publish: sinon.spy(),
    subscribe: sinon.spy(),
    unsubscribe: sinon.spy(),
  });

  api.publish();
  t.true(api.publish.called);

  api.subscribe();
  t.true(api.subscribe.called);

  api.unsubscribe();
  t.true(api.unsubscribe.called);
  t.end();
});

test('createPubSubAdapter: should throws if doesn\'t receive a valid adapter', t => {
  t.throws(() => {
    const api = createPubSubAdapter();
    api.publish();
  });
  t.throws(() => {
    const api = createPubSubAdapter({ hello() {} });
    api.publish();
  });
  t.throws(() => {
    const api = createPubSubAdapter([1, 2, 3]);
    api.publish();
  });
  t.end();
});

