import { Component, createElement } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import isPlainObject from '../../utils/isPlainObject';
import shallowEqual from '../../utils/shallowEqual';
import pubSubShape from '../../shapes/pubSubShape';

import registerSubscriptionsMap from './registerSubscriptionsMap';
import registerSubscriptionFunction from './registerSubscriptionFunction';

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
  if (
    mapSubscriptionsToProps &&
    (typeof mapSubscriptionsToProps !== 'function' && !isPlainObject(mapSubscriptionsToProps))
  ) {
    throw new Error(
      `"createPubSubConnector" expected "mapSubscriptionsToProps" to be a function`
      + ` or a plain object, instead received: ${mapSubscriptionsToProps}.`
    );
  }
  const shouldMapSubscriptions = Boolean(mapSubscriptionsToProps);
  const mapSubscriptionIsFunction = typeof mapSubscriptionsToProps === 'function';

  const finalMapPublishToProps = isPlainObject(mapPublishToProps) ?
    wrapPublishMethods(mapPublishToProps) :
    mapPublishToProps || defaultMapPublishToProps;
  const shouldUpdatePublishProps = finalMapPublishToProps.length > 1;

  const { withRef = false, ownProps = true, forceInitialValues = false } = options || {};

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
        this.state = {};
        this.pubSub = this.pubSubCore.register(this);
        this.mappedSubscriptionProps = {};
        this.subscriptionsMap = {};

        if (shouldMapSubscriptions) {
          if (mapSubscriptionIsFunction) {
            this.subscriptionsMap = registerSubscriptionFunction();
            this.applySubscription = this.subscriptionsMap.register(
              this.pubSub,
              mapSubscriptionsToProps,
              (...args) => this.updateSingleMappedSubscription(...args),
                () => this.props
            );

            this.mappedSubscriptionProps = this.applySubscription(props);

            if (!isPlainObject(this.mappedSubscriptionProps)) {
              throw new Error(
                `'pubSubConnector' expected an object returned from`
                + ` given .applySubscription() method. Instead received:`
                + ` ${this.mappedSubscriptionProps}`
              );
            }
          } else {
            this.subscriptionsMap = registerSubscriptionsMap(ownProps);
            this.subscriptionsMap.register(
              this.pubSub,
              mapSubscriptionsToProps,
              (...args) => this.updateSingleMappedSubscription(...args),
                () => this.props
            );
          }
        }

        this.publishProps = computePublishProps(this.pubSub, props);
      }

      componentWillMount() {
        if (forceInitialValues) {
          this.subscriptionsMap.invokeMappedSubscriptions();
        }
      }

      shouldComponentUpdate(nextProps, nextState) {
        const stateChanged = !shallowEqual(nextState, this.state);
        const propsChanged = !shallowEqual(nextProps, this.props);

        if (propsChanged && shouldUpdatePublishProps) {
          this.updatePublishProps(nextProps);
        }

        if (propsChanged && shouldMapSubscriptions && mapSubscriptionIsFunction) {
          this.updateMappedSubscriptionsProps(nextProps);
        }

        return propsChanged || stateChanged;
      }

      componentWillUnmount() {
        this.subscriptionsMap.mappedSubscriptions = {};
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

      updateSingleMappedSubscription(updatedSubscription) {
        if (updatedSubscription) {
          Object.assign(this.mappedSubscriptionProps, updatedSubscription);
          cleanEmptyKeys(this.mappedSubscriptionProps);
          const lastSubscription = this.state.lastSubscription ? this.state.lastSubscription + 1 : 1;
          this.setState({ lastSubscription });
        }
      }

      updateMappedSubscriptionsProps(props = this.props) {
        const newValues = this.applySubscription(props);
        Object.assign(this.mappedSubscriptionProps, newValues);
        cleanEmptyKeys(this.mappedSubscriptionProps);
      }

      updatePublishProps(props = this.props) {
        const nextPublishProps = computePublishProps(this.pubSub, props);

        if (shallowEqual(nextPublishProps, this.publishProps)) {
          return false;
        }

        this.publishProps = nextPublishProps;
      }

      hasSubscriptions() {
        if (shouldMapSubscriptions) {
          return mapSubscriptionIsFunction || Object.keys(this.subscriptionsMap.mappedSubscriptions).length > 0;
        }
        return false;
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
