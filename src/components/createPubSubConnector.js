import { Component, createElement } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import isPlainObject from '../utils/isPlainObject';
import shallowEqual from '../utils/shallowEqual';
import pubSubShape from '../utils/pubSubShape';

const defaultRetriveProps = () => ({});
const defaultMapPublishToProps = publish => ({ publish });

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function wrapPublishMethods(mapPublishToProps) {
  return publish => Object.keys(mapPublishToProps)
  .filter(key => typeof mapPublishToProps[key] === 'function')
  .reduce((acc, key) => {
    acc[key] = (...args) => mapPublishToProps[key](publish, ...args);
    return acc;
  }, {});
}

function cleanEmptyKeys(obj = {}) {
  Object.keys(obj)
  .filter(key => obj[key] === undefined || obj[key] === null)
  .forEach(key => delete obj[key]);
  return obj;
}

export default function createPubSubConnector(mapSubscriptionsToProps, mapPublishToProps, options = {}) {
  const shouldMapSubscriptions = Boolean(mapSubscriptionsToProps);
  const finalMapPublishToProps = isPlainObject(mapPublishToProps) ?
    wrapPublishMethods(mapPublishToProps) :
    mapPublishToProps || defaultMapPublishToProps;
  const shouldUpdatePublishProps = finalMapPublishToProps.length > 1;
  const { withRef = false } = options || {};

  let mappedSubscriptions = {};
  function registerMappedSubscriptions(pubSub, subscriptionsMap = {}, updateSubscriptionProps, getProps) {
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
        callback = (retrieveProps = defaultRetriveProps, silent = false) =>
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

          updateSubscriptionProps(newValues, silent);
          return newValues;
        };
      } else {
        callback = result => updateSubscriptionProps({ [transformerOrAlias]: result });
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
      return {};
    }

    const silent = true;

    return Object.keys(subscriptionsMap)
    .reduce((acc, key) => {
      if (
        typeof subscriptionsMap[key] === 'function'
          && mappedSubscriptions[key] !== undefined
      ) {
        const {
          refresh,
          lastResult,
          shouldUpdateSubscriptionProps,
        } = mappedSubscriptions[key];

        if (shouldUpdateSubscriptionProps) {
          const res = refresh(getProps, silent)(...lastResult);
          Object.assign(acc, res);
        }
      }
      return acc;
    }, {});
  }

  function computePublishProps(pubSub, props) {
    const { publish } = pubSub;
    const publishProps = shouldUpdatePublishProps ?
      finalMapPublishToProps(publish, props) :
      finalMapPublishToProps(publish);

    if (!isPlainObject(publishProps)) {
      throw new Error(
        `'mapPublishToProps' must return an object.`
        + `Instead received ${publishProps}`
      );
    }
    return publishProps;
  }

  function computeMappedSubscriptionProps(mappedSubscriptionProps = {}, props = {}) {
    const nextSubscriptionsProps = refreshMappedSubscriptions(mapSubscriptionsToProps, () => props);
    const merged = Object.assign({}, mappedSubscriptionProps, nextSubscriptionsProps);
    return cleanEmptyKeys(merged);
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
            (...args) => this.updateSingleMappedSubscription(...args),
            () => this.props
          );
        }

        this.publishProps = computePublishProps(this.pubSub, props);
        this.mappedSubscriptionProps = computeMappedSubscriptionProps({}, props);
        this.state = {};
      }

      shouldComponentUpdate(nextProps, nextState) {
        const stateChanged = !shallowEqual(nextState, this.state);
        const propsChanged = !shallowEqual(nextProps, this.props);
        let publishPropsChanged = false;
        let mappedSubscriptionsPropsChanged = false;

        if (propsChanged && shouldUpdatePublishProps) {
          publishPropsChanged = this.updatePublishProps(nextProps);
        }

        if (propsChanged && shouldMapSubscriptions) {
          mappedSubscriptionsPropsChanged = this.updateMappedSubscriptions(nextProps);
        }

        return propsChanged || stateChanged || publishPropsChanged || mappedSubscriptionsPropsChanged;
      }

      componentWillUnmount() {
        mappedSubscriptions = {};
        this.pubSub.unsubscribe();
      }

      getWrappedInstance() {
        if (!withRef) {
          throw new Error(
            `To access the wrapped instance, you need to specify explicitly`
            + ` { withRef: true } in the options passed to the createPubSubConnector() call.`
          );
        }
        return this.refs.wrappedInstance;
      }

      updateSingleMappedSubscription(updatedSubscription, silent = false) {
        if (!silent && updatedSubscription) {
          Object.assign(this.mappedSubscriptionProps, updatedSubscription);
          cleanEmptyKeys(this.mappedSubscriptionProps);
          const lastSubscription = this.state.lastSubscription ? this.state.lastSubscription + 1 : 1;
          this.setState({ lastSubscription });
        }
      }

      updateMappedSubscriptions(props = this.props) {
        const nextSubscriptionProps = computeMappedSubscriptionProps(this.mappedSubscriptionProps, props);
        if (shallowEqual(nextSubscriptionProps, this.mappedSubscriptionProps)) {
          return false;
        }

        this.mappedSubscriptionProps = nextSubscriptionProps;
        return true;
      }

      updatePublishProps(props = this.props) {
        const nextPublishProps = computePublishProps(this.pubSub, props);
        if (shallowEqual(nextPublishProps, this.publishProps)) {
          return false;
        }

        this.publishProps = nextPublishProps;
        return true;
      }

      hasSubscriptions() {
        return Object.keys(mappedSubscriptions).length > 0;
      }

      render() {
        const { pubSub } = this;
        const ref = withRef ? 'wrappedInstance' : null;
        return createElement(
          Composed,
          Object.assign(
            { pubSub, ref },
            this.props,
            this.mappedSubscriptionProps,
            this.publishProps
          )
        );
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
