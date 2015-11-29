/*
   Creates the subscription object

   @param component function the React component
   @param autoUnmount boolean defaults to true, if it has to remove all subscriptions on cwunmount
   @param adapter object the pubsub adapter
   @return the subscription object
   */
const createSubscription = (component, autoUnmount = true, adapter) => {
  let sub = {
    componentWillUnmount: component.componentWillUnmount,
    subscriptions: [],
    add(action, cb) {
      const token = adapter.subscribe(action, cb);
      sub.subscriptions.push(token);
      return () => {
        const idx = sub.subscriptions.indexOf(token);
        if (idx < 0) {
          throw new Error('PubSub Error trying to unsubscribe a not recognized token');
        }
        sub.subscriptions.splice(idx, 1);
        adapter.unsubscribe(token);
      };
    },
    removeAll() {
      sub.subscriptions.forEach( token => adapter.unsubscribe(token) );
      sub.subscriptions = [];
    },
    publish(action, ...params) {
      adapter.publish(action, params);
    },
  };

  if (autoUnmount) {
    component.componentWillUnmount = () => {
      const { componentWillUnmount, removeAll } = sub;
      if (componentWillUnmount) {
        componentWillUnmount.apply(component);
      }
      removeAll();
      sub = void 0;
    };
  }

  return sub;
};

export default createSubscription;
