/*
   createPubSubAdapter function

   @param Object adapter being used
   @returns an object wrapping publish/subscribe/unsubscribe from given adapter
   */
const createPubSubAdapter = (adapter) => {
  const { publish, subscribe, unsubscribe } = adapter;
  return {
    publish,
    subscribe,
    unsubscribe,
  };
};

export default createPubSubAdapter;
