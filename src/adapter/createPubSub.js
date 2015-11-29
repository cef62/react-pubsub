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
  return {
    register(component, autoUnmount = true) {
      if (!subscribersMap[component]) {
        subscribersMap[component] = createSubscription(component, autoUnmount, adapterAPI);
      }
      return subscribersMap[component];
    },
    unregister(component) {
      if (subscribersMap[component]) {
        subscribersMap[component].removeAll();
        delete subscribersMap[component];
      } else {
        console.log(`${component.displayName} is NOT registerd to PubSub`); // eslint-disable-line no-console
      }
    },
  };
};
export default createPubSub;
