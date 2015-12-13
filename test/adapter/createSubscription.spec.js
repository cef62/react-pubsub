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

  t.end();
});

test('should throws if `adapter` is missing or falsy', t => {
  t.throws(() => createSubscription());
  t.throws(() => createSubscription(null));
  t.throws(() => createSubscription(false));
  t.throws(() => createSubscription(0));
  t.end();
});

test('should throws if `unsubscribe` is missing or falsy', t => {
  t.throws(() => createSubscription({}));
  t.throws(() => createSubscription({}, null));
  t.throws(() => createSubscription({}, false));
  t.throws(() => createSubscription({}, 0));
  t.end();
});

test('.unsubscribe() should invoke `unsubscribe` method received on creation', t => {
  const unsubscribe = sinon.spy();
  const api = createSubscription({}, unsubscribe);
  api.unsubscribe();
  t.true(unsubscribe.called);
  t.end();
});

test('.add() should throws if `action` is missing or falsy', t => {
  const api = createSubscription({}, () => {});
  t.throws(() => api.add());
  t.throws(() => api.add(null));
  t.throws(() => api.add(false));
  t.throws(() => api.add(0));
  t.end();
});

test('.add() should throws if `action` is not a string', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  t.throws(() => api.add());
  t.doesNotThrow(() => api.add('test', () => {}));
  t.end();
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
  t.end();
});

test('.add() should throws if `callback` is not a function', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});
  t.throws(() => api.add('test', 'hey'));
  t.doesNotThrow(() => api.add('test', () => {}));
  t.end();
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
  t.end();
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

  t.end();
});

test('.add() should return a function', t => {
  const adapter = {
    subscribe() {},
  };
  const api = createSubscription(adapter, () => {});

  const unsubscribe = api.add('test', () => {});
  t.is(typeof unsubscribe, 'function');
  t.end();
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
  t.end();
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

  t.end();
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

  t.end();
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

  t.end();
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

  t.end();
});

test('.publish() should throws if invoked with less than 2 arguments', t => {
  const adapter = {
    subscribe() {},
    publish() {},
  };
  const api = createSubscription(adapter, () => {});

  t.throws(() => api.publish());
  t.throws(() => api.publish('test'));
  t.doesNotThrow(() => api.publish('test', {}));
  t.doesNotThrow(() => api.publish('test', {}, 'extra'));

  t.end();
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

  t.end();
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

  t.end();
});

test('.publish() should pass the received action type to the invoked .publish() on the adapter', t => {
  const adapter = {
    subscribe() {},
    publish: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  api.publish('test', {});

  t.is(adapter.publish.lastCall.args[0], 'test');
  t.end();
});

test('.publish() should pass the received arguments, but the action, as array to the invoked .publish() on the adapter', t => {
  const adapter = {
    subscribe() {},
    publish: sinon.spy(),
  };
  const api = createSubscription(adapter, () => {});
  const param1 = { a: 1, b: 2 };
  const param2 = 55;
  api.publish('test', param1, param2);

  t.true(Array.isArray(adapter.publish.lastCall.args[1]));
  t.is(adapter.publish.lastCall.args[1][0], param1);
  t.is(adapter.publish.lastCall.args[1][1], param2);
  t.end();
});
