export default function registerSubscriptionFunction() {
  const register = (pubSub, subscriptionsFunction, updateSubscriptionProps, getProps) => {
    // init given function, this invocation will subscribe required actions to
    // passed pubSub instance
    const applySubscription = subscriptionsFunction(pubSub, updateSubscriptionProps, getProps);

    if (typeof applySubscription !== 'function') {
      throw new Error(
        `'initSubscriptionFunction' expected 'subscriptionsFunction' to return`
        + ` a function. Instead received: ${applySubscription}`
      );
    }
    return applySubscription;
  };

  return {
    register,
    invokeMappedSubscriptions: () => {},
    mappedSubscriptions: {},
  };
}
