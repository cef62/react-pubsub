import createDefaultAdapter from './createDefaultAdapter';
import createSubscription from './createSubscription';
import createPubSubAdapter from './createPubSubAdapter';

/*
   createPubSub function

   @param subscribersMap Object, default to empty object, subscribers that will be populated
   like so:
   subscribersMap[MyReactComponent] = {...}
   @param adapter Object, default to default adapter specified
   @returns an object wrapping register/unregister for a particular component
   */
const createPubSub = (subscribersMap = {}, adapter = createDefaultAdapter()) => {
  const adapterAPI = createPubSubAdapter(adapter);
  const api = {
    register(component) {
      if (!component) {
        throw new Error(`'createPubSub.register()' expected a component instead received: ${component}`);
      }
      if (!subscribersMap[component]) {
        const unsubscribe = () => api.unregister(component);
        subscribersMap[component] = createSubscription(adapterAPI, unsubscribe);
      }
      return subscribersMap[component];
    },
    unregister(component) {
      if (!component) {
        throw new Error(`'createPubSub.unregister()' expected a component instead received: ${component}`);
      }
      if (subscribersMap[component]) {
        subscribersMap[component].removeAll();
        delete subscribersMap[component];
      } else {
        console.error(`${component.displayName} is NOT registerd to PubSub`); // eslint-disable-line no-console
      }
    },
  };
  return api;
};
export default createPubSub;
