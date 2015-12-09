import { Component, createElement } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import isPlainObject from '../utils/isPlainObject';
import pubSubShape from '../utils/pubSubShape';

const defaultRetriveProps = () => ({});

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default function createPubSubConnector(mapSubscriptionsToProps, options = {}) {
  const shouldMapSubscriptions = Boolean(mapSubscriptionsToProps);
  const { withRef = false } = options;

  let mappedSubscriptions = {};
  function registerMappedSubscriptions(pubSub, subscriptionsMap = {}, setState, getProps) {
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
        const shouldUpdateSubscriptionProps = transformerOrAlias.length > 1;
        callback = (retrieveProps = defaultRetriveProps) =>
        (...args) => {
          // store received values
          mappedSubscriptions[key].lastResult = args;
          mappedSubscriptions[key].shouldUpdateSubscriptionProps = shouldUpdateSubscriptionProps;

          // transform values
          const newValues = transformerOrAlias(args, retrieveProps());

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

          // TODO: add controls to avoid triggering setState if value isn't changed and
          setState(newValues);
        };
      } else {
        callback = result => setState({ [transformerOrAlias]: result });
      }

      return callback;
    };

    mappedSubscriptions = Object.keys(subscriptionsMap)
    .reduce((acc, key) => {
      const refresh = updateMappedSubscriptions(key, subscriptionsMap[key]);
      let callback = refresh;
      if (typeof subscriptionsMap[key] === 'function') {
        callback = refresh(getProps);
      }
      acc[key] = {
        key,
        refresh,
        unsubscribe: add(key, callback),
      };
      return acc;
    }, {});
  }

  function refreshMappedSubscriptions(subscriptionsMap = {}, getProps) {
    const mappedSubscriptionsKeys = Object.keys(mappedSubscriptions);
    if (!mappedSubscriptionsKeys.length) {
      return;
    }

    Object.keys(subscriptionsMap)
    .forEach(key => {
      if (
        typeof subscriptionsMap[key] === 'function'
          && typeof mappedSubscriptions[key] !== 'undefined'
      ) {
        const {
          refresh,
          lastResult,
          shouldUpdateSubscriptionProps,
        } = mappedSubscriptions[key];

        if (shouldUpdateSubscriptionProps) {
          refresh(getProps)(...lastResult);
        }
      }
    });
  }

  return function wrapComponent(Composed) {
    class PubSubConnector extends Component {
      constructor(props, context) {
        super(props, context);
        this.pubSubCore = props.pubSubCore || context.pubSubCore;

        if (!this.pubSubCore) {
          throw new Error(
            `Could not find "pubSubCore" in either the context or `
            + `props of "${this.constructor.displayName}". `
            + `Either wrap the root component in a <PubSubProvider>, `
            + `or explicitly pass "pubSubCore" as a prop to "${this.constructor.displayName}".`
          );
        }

        this.pubSub = this.pubSubCore.register(this);
        if (shouldMapSubscriptions) {
          registerMappedSubscriptions(
            this.pubSub,
            mapSubscriptionsToProps,
            (...args) => this.setState(...args),
            () => this.props
          );
        }
      }

      componentWillUpdate(nextProps) {
        if (this.props === nextProps) {
          return;
        }

        if (shouldMapSubscriptions) {
          refreshMappedSubscriptions(
            mapSubscriptionsToProps,
            () => nextProps
          );
        }
      }

      componentWillUnmount() {
        mappedSubscriptions = {};
        this.pubSub.unsubscribe();
        delete this.pubSub;
        delete this.pubSubCore;
      }

      getWrappedInstance() {
        if (!withRef) {
          throw new Error(
            `To access the wrapped instance, you need to specify explicitly`
            + `{ withRef: true } in the options passed to the createPubSubConnector() call.`
          );
        }
        return this.refs.wrappedInstance;
      }

      render() {
        const { pubSub } = this;
        const ref = withRef ? 'wrappedInstance' : null;
        return createElement(Composed, Object.assign({ pubSub, ref }, this.props, this.state));
      }
    }

    PubSubConnector.contextTypes = {
      pubSubCore: pubSubShape,
    };

    PubSubConnector.propTypes = {
      pubSubCore: pubSubShape,
    };

    PubSubConnector.displayName = `PubSubConnector(${getDisplayName(Composed)})`;
    PubSubConnector.WrappedComponent = Composed;

    return hoistStatics(PubSubConnector, Composed);
  };
}
