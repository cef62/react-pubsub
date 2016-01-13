import test from 'ava';
import sinon from 'sinon';
import 'babel-core/register';
import createSubscription from '../../src/adapter/createSubscription';

test('should return an object with a valid pubSub interface', t => {
  const api = createSubscription({}, () => {});
  t.true(api.hasOwnProperty('add'));
  t.true(api.hasOwnProperty('removeAll'));
  t.true(api.hasOwnProperty('unsubscribe'));
  t.true(api.hasOwnProperty('publish'));
  t.true(api.hasOwnProperty('subscriptions'));
  t.is(typeof api.add, 'function');
  t.is(typeof api.removeAll, 'function');
  t.is(typeof api.unsubscribe, 'function');
  t.is(typeof api.publish, 'function');
  t.true(Array.isArray(api.subscriptions));
});

test('should throws if `adapter` is missing or falsy', t => {
  t.throws(() => createSubscription());
  t.throws(() => createSubscription(null));
  t.throws(() => createSubscription(false));
  t.throws(() => createSubscription(0));
});

test('should throws if `unsubscribe` is missing or falsy', t => {
  t.throws(() => createSubscription({}));
  t.throws(() => createSubscription({}, null));
  t.throws(() => createSubscription({}, false));
  t.throws(() => createSubscription({}, 0));
});

test('.unsubscribe() should invoke `unsubscribe` method received on creation', t => {
  const unsubscribe = sinon.spy();
  const api = createSubscription({}, unsubscribe);
  api.unsubscribe();
  t.true(unsubscribe.called);
});

test('.add() should throws if `action` is missing or falsy', t => {
  const api = createSubscription({}, () => {});
  t.throws(() => api.add());
  t.throws(() => api.add(null));
  t.throws(() => api.add(false));
  t.throws(() => api.add(0));
});

test('.add() should throws if `action` is not a string', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  t.throws(() => api.add());
  t.doesNotThrow(() => api.add('test', () => {}));
});

test('.add() should throws if `callback` is missing or falsy', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  t.throws(() => api.add('test'));
  t.throws(() => api.add('test', null));
  t.throws(() => api.add('test', false));
  t.throws(() => api.add('test', 0));
});

test('.add() should throws if `callback` is not a function', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  t.throws(() => api.add('test', 'hey'));
  t.doesNotThrow(() => api.add('test', () => {}));
});

test('.add() should invoke .subscribe() on the given adapter object', t => {
  const adapter = {
    subscribe: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  const cb = () => {};
  api.add('test', cb);

  t.true(adapter.subscribe.called);
  t.true(adapter.subscribe.calledWith('test', cb));
});

test('.add() should append the registered subscription to `subscription` list', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  const cb = () => {};

  t.is(api.subscriptions.length, 0);
  api.add('test', cb);
  t.is(api.subscriptions.length, 1);
});

test('.add() should return a function', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});

  const unsubscribe = api.add('test', () => {});
  t.is(typeof unsubscribe, 'function');
});

test('.add() returned function should remove the subscription from the adapter', t => {
  const adapter = {
    subscribe() {},
    unsubscribe: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});

  const unsubscribe = api.add('test', () => {});
  unsubscribe();
  t.true(adapter.unsubscribe.called);
});

test('.add() returned function should remove the subscription from the subscriptions list', t => {
  const adapter = {
    subscribe() {},
    unsubscribe() {},
  };
  const api = createSubscription(adapter, () => {});

  const unsubscribe = api.add('test', () => {});
  t.is(api.subscriptions.length, 1);
  unsubscribe();
  t.is(api.subscriptions.length, 0);
});

test('.add() returned function should throws if the subscriptions list doesn\'t contains the subscription token', t => {
  const adapter = {
    subscribe() {},
    unsubscribe() {},
  };
  const api = createSubscription(adapter, () => {});

  const unsubscribe = api.add('test', () => {});
  t.is(api.subscriptions.length, 1);
  api.subscriptions.pop();
  t.is(api.subscriptions.length, 0);
  t.throws(() => unsubscribe());
});

test('.removeAll() should clear the subscriptions list', t => {
  const adapter = {
    subscribe() {},
    unsubscribe() {},
  };
  const api = createSubscription(adapter, () => {});

  api.add('test', () => {});
  t.is(api.subscriptions.length, 1);
  api.removeAll();
  t.is(api.subscriptions.length, 0);
});

test('.removeAll() should unsubscribe all tokens registered via .add()', t => {
  const adapter = {
    subscribe() {},
    unsubscribe: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});

  api.add('test1', () => {});
  api.add('test2', () => {});
  api.add('test3', () => {});
  api.removeAll();

  t.is(adapter.unsubscribe.callCount, 3);
});

test('.publish() should throws if the action received is not a string', t => {
  const adapter = {
    subscribe() {},
    publish() {},
  };
  const api = createSubscription(adapter, () => {});

  t.doesNotThrow(() => api.publish('test', {}));
  t.throws(() => api.publish(4, {}));
  t.throws(() => api.publish({}, {}));
  t.throws(() => api.publish([], {}));
});

test('.publish() should invoke .publish() on the given adapter object ', t => {
  const adapter = {
    subscribe() {},
    publish: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  api.publish('test', {});

  t.true(adapter.publish.called);
  t.is(adapter.publish.callCount, 1);
});

test('.publish() should pass the received action type to the invoked .publish() on the adapter', t => {
  const adapter = {
    subscribe() {},
    publish: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  api.publish('test', {});

  t.is(adapter.publish.lastCall.args[0], 'test');
});

test('.publish() should pass the received arguments to the invoked .publish() on the adapter', t => {
  const adapter = {
    subscribe() {},
    publish: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  const param1 = { a: 1, b: 2 };
  const param2 = 55;
  api.publish('test', param1, param2);

  t.is(adapter.publish.lastCall.args[0], 'test');
  t.is(adapter.publish.lastCall.args[1], param1);
  t.is(adapter.publish.lastCall.args[2], param2);
});
