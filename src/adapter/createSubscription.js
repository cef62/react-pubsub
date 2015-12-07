/*
   Creates the subscription object

   @param component function the React component
   @param autoUnmount boolean defaults to true, if it has to remove all subscriptions on cwunmount
   @param adapter object the pubsub adapter
   @return the subscription object
   */
const createSubscription = (component, adapter) => {
  const sub = {
    componentWillUnmount: component.componentWillUnmount,
    subscriptions: [],
    add(action, cb) {
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
      adapter.publish(action, params);
    },
  };

  return sub;
};

export default createSubscription;
