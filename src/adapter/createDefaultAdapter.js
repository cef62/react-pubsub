const createPubSubAdapter = () => {
  const actions = {};
  const hOP = actions.hasOwnProperty;
  return {
    subscribe(action, cb) {
      if (!hOP.call(actions, action)) {
        actions[action] = [];
      }
      actions[action].push(cb);
      return [action, cb];
    },
    unsubscribe(token) {
      const [ action, cb ] = token;
      const callbacks = actions[action];
      const idx = callbacks.indexOf(cb);
      if (idx < 0) {
        console.warn(`You're unsubscribing an unrecognized token`); // eslint-disable-line no-console
      } else {
        callbacks.splice(idx, 1);
      }
    },
    publish(action, params) {
      if (!hOP.call(actions, action)) {
        console.warn(`You're try to publish to an unregisterd action ${action}`); // eslint-disable-line no-console
        return;
      }
      actions[action].forEach( (cb) => cb.apply(undefined, params) );
    },
  };
};

export default createPubSubAdapter;

