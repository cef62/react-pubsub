import isPlainObject from '../../utils/isPlainObject';

export default function registerSubscriptionsMap(ownProps = true) {
  let mappedSubscriptions = {};

  const register = (pubSub, subscriptionsMap = {}, updateSubscriptionProps, getProps) => {
    const { add } = pubSub;

    // TODO: should be necessary to support hot reload
    const mappedSubscriptionsKeys = Object.keys(mappedSubscriptions);
    if (mappedSubscriptionsKeys.length) {
      mappedSubscriptionsKeys.forEach(key => mappedSubscriptions[key].unsubscribe());
    }

    if (!Object.keys(subscriptionsMap).length) {
      return;
    }

    const validMappedSubscriptions = Object.keys(subscriptionsMap)
    .every(key => (typeof subscriptionsMap[key] === 'function' || typeof subscriptionsMap[key] === 'string'));

    if (!validMappedSubscriptions) {
      throw new Error(
        `Every mapped Subscription of "createPubSubConnector" must be a function`
        + `returning the value to be passed as prop to the decorated component.`
      );
    }

    const updateMappedSubscriptions = (key, transformerOrAlias) => {
      let callback;
      if (typeof transformerOrAlias === 'function') {
        callback = (...args) => {
          // transform values
          const newValues = ownProps ? transformerOrAlias(...args, getProps()) : transformerOrAlias(...args);

          if (!isPlainObject(newValues)) {
            throw new Error(
              `Transformer functions for mapped subscriptions must return a plain object, `
              + `instead received %s.`
            );
          }

          if (!Object.keys(newValues).length) {
            throw new Error(
              `Transformer functions for mapped subscriptions must return an object`
              + `with at least one property.`
            );
          }

          updateSubscriptionProps(newValues);
        };
      } else {
        callback = result => updateSubscriptionProps({ [transformerOrAlias]: result });
      }

      return callback;
    };

    mappedSubscriptions = Object.keys(subscriptionsMap)
    .reduce((acc, key) => {
      const callback = updateMappedSubscriptions(key, subscriptionsMap[key]);
      acc[key] = {
        callback,
        originalCallback: subscriptionsMap[key],
        unsubscribe: add(key, callback),
      };
      return acc;
    }, {});
  };

  const invokeMappedSubscriptions = () => {
    mappedSubscriptions = Object.keys(mappedSubscriptions)
    .forEach(key => {
      const { callback, originalCallback } = mappedSubscriptions[key];
      const initialValues = Array.isArray(originalCallback.initialValues) ? originalCallback.initialValues : [];
      callback(...initialValues);
    });
  };

  return {
    register,
    invokeMappedSubscriptions,
    mappedSubscriptions,
  };
}
