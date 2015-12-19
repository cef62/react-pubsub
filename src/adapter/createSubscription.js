/*
   Creates the subscription object

   @param autoUnmount boolean defaults to true, if it has to remove all subscriptions on cwunmount
   @param adapter object the pubsub adapter
   @return the subscription object
   */
const createSubscription = (adapter, unsubscribe) => {
  if (!adapter) {
    throw new Error(`'createSubscription()' expected an adapter as first argument instead received: ${adapter}`);
  }

  if (!unsubscribe) {
    throw new Error(`'createSubscription()' expected a function as second argument instead received: ${unsubscribe}`);
  }

  const sub = {
    unsubscribe,
    subscriptions: [],

    add(action, cb) {
      if (!action || typeof action !== 'string') {
        throw new Error(`Subscription '.add()' expected an action (string) as first argument instead received: ${action}`);
      }

      if (!cb || typeof cb !== 'function') {
        throw new Error(`Subscription '.add()' expected a function as second argument instead received: ${cb}`);
      }

      const token = adapter.subscribe(action, cb);
      sub.subscriptions.push(token);
      return () => {
        const idx = sub.subscriptions.indexOf(token);
        if (idx < 0) {
          throw new Error('PubSub Error: you\'re trying to unsubscribe an unrecognized token');
        }
        sub.subscriptions.splice(idx, 1);
        adapter.unsubscribe(token);
      };
    },

    removeAll() {
      sub.subscriptions.forEach(token => adapter.unsubscribe(token));
      sub.subscriptions = [];
    },

    publish(action, ...params) {
      if (!action || typeof action !== 'string') {
        throw new Error(`Subscription '.publish()' expected an action (string) as first argument instead received: ${action}`);
      }

      adapter.publish(action, ...params);
    },
  };

  return sub;
};

export default createSubscription;
