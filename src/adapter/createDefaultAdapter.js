const createDefaultAdapter = () => {
  const actions = {};
  const hOP = actions.hasOwnProperty;
  return {
    subscribe(action, cb) {
      if (!action || typeof action !== 'string') {
        throw new Error(`Default adapter '.subscribe()' expected an action (string) as first argument instead received: ${action}`);
      }

      if (!cb || typeof cb !== 'function') {
        throw new Error(`Default adapter '.subscribe()' expected a function as second argument instead received: ${cb}`);
      }

      if (!hOP.call(actions, action)) {
        actions[action] = [];
      }

      actions[action].push(cb);
      return [action, cb];
    },

    unsubscribe(token) {
      if (!token || !Array.isArray(token)) {
        throw new Error(`Default adapter '.unsubscribe()' expected a token (array) instead received: ${token}`);
      }

      if (token.length !== 2
          || typeof token[0] !== 'string' || typeof token[1] !== 'function') {
        throw new Error(`Default adapter '.unsubscribe()' expected a valid token ([string, function]) instead received: ${token}`);
      }

      const [action, cb] = token;
      const callbacks = actions[action] || [];
      const idx = callbacks.indexOf(cb);
      if (idx < 0) {
        console.error(`You're unsubscribing an unrecognized token ${token}`); // eslint-disable-line no-console
      } else {
        callbacks.splice(idx, 1);
      }
    },

    publish(action, ...params) {
      if (!action || typeof action !== 'string') {
        throw new Error(`Default adapter '.publish()' expected an action (string) as first argument instead received: ${action}`);
      }

      if (!hOP.call(actions, action)) {
        console.info(`The action '${action}' being published has no listeners`); // eslint-disable-line no-console
        return;
      }

      actions[action].forEach((cb) => cb(...params));
    },
  };
};

export default createDefaultAdapter;
