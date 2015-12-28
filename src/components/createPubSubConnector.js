import { Component, createElement } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import isPlainObject from '../utils/isPlainObject';
import shallowEqual from '../utils/shallowEqual';
import pubSubShape from '../shapes/pubSubShape';

const defaultMapPublishToProps = publish => ({ publish });
const defaultMapSubscriptionsToProps = () => ({});
const defaultInitMapSubscriptionsToProps = () => defaultMapSubscriptionsToProps;

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function cleanEmptyKeys(obj = {}) {
  Object.keys(obj)
  .filter(key => obj[key] === undefined || obj[key] === null)
  .forEach(key => delete obj[key]);
  return obj;
}

function wrapSubscritionsMap(mapSubscriptionsToProps) {
  const validMappedSubscriptions = Object.keys(mapSubscriptionsToProps)
  .every(
    key => (typeof mapSubscriptionsToProps[key] === 'function' ||
            typeof mapSubscriptionsToProps[key] === 'string')
  );

  if (!validMappedSubscriptions) {
    throw new Error(
      `Every mapped Subscription of "createPubSubConnector" must be a function`
      + `returning the value to be passed as prop to the decorated component.`
    );
  }

  return (pubSub, notifyChange, getProps) => {
    const { add } = pubSub;
    let map = {};

    const updateStoredMapFromObject = (updatedValue) => {
      const updatedMap = {};
      const keysToUpdate = Object.keys(updatedValue)
      .filter(key => {
        if (map.hasOwnProperty(key)) {
          if (updatedValue[key] && shallowEqual(map[key], updatedValue[key])) {
            return false;
          }
        }
        updatedMap[key] = updatedValue[key];
        return true;
      });

      if (keysToUpdate.length) {
        map = cleanEmptyKeys(Object.assign({}, map, updatedMap));
        return true;
      }
      return false;
    };

    const updateStoredMapFromKey = (key, updatedValue) => {
      if (map.hasOwnProperty(key)) {
        if (updatedValue && shallowEqual(map[key], updatedValue)) {
          return false;
        }
      }
      map = cleanEmptyKeys(Object.assign({}, map, { [key]: updatedValue }));
      return true;
    };

    Object
    .keys(mapSubscriptionsToProps)
    .forEach(key => {
      const transformerOrAlias = mapSubscriptionsToProps[key];
      if (typeof transformerOrAlias === 'function') {
        add(key, (...args) => {
          const updatedValue = transformerOrAlias(...args, getProps());
          if (updateStoredMapFromObject(updatedValue)) {
            notifyChange();
          }
        });
      } else {
        add(key, payload => {
          if (updateStoredMapFromKey(transformerOrAlias, payload)) {
            notifyChange();
          }
        });
      }
    });

    return () => map;
  };
}

function wrapPublishMethods(mapPublishToProps) {
  return publish => Object.keys(mapPublishToProps)
  .filter(key => typeof mapPublishToProps[key] === 'function')
  .reduce((acc, key) => {
    acc[key] = (...args) => mapPublishToProps[key](publish, ...args);
    return acc;
  }, {});
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
  const shouldMapSubscriptions = isPlainObject(mapSubscriptionsToProps) ? Object.keys(mapSubscriptionsToProps).length : Boolean(mapSubscriptionsToProps);

  let finalMapSubscriptionsToProps = defaultMapSubscriptionsToProps;
  let doSubscribedPropsDependOnOwnProps = false;


  const finalMapPublishToProps = isPlainObject(mapPublishToProps) ? wrapPublishMethods(mapPublishToProps) : mapPublishToProps || defaultMapPublishToProps;
  const doPublishPropsDependOnOwnProps = finalMapPublishToProps.length > 1;

  const { withRef = false } = options || {};

  function initComputeSubscribedProps(pubSub, notifier, getProps) {
    let subscriber;
    if (isPlainObject(mapSubscriptionsToProps)) {
      subscriber = wrapSubscritionsMap(mapSubscriptionsToProps);
    } else {
      subscriber = mapSubscriptionsToProps || defaultInitMapSubscriptionsToProps;
    }
    finalMapSubscriptionsToProps = subscriber(pubSub, notifier, getProps);
    doSubscribedPropsDependOnOwnProps = finalMapSubscriptionsToProps.length > 0;
  }

  function computeSubscribedProps(props) {
    const subscribedProps = doSubscribedPropsDependOnOwnProps ? finalMapSubscriptionsToProps(props) : finalMapSubscriptionsToProps();

    if (!isPlainObject(subscribedProps)) {
      throw new Error(
        `'mapSubscriptionsToProps' must return an object.`
        + `Instead received ${subscribedProps}`
      );
    }
    return subscribedProps;
  }

  function computePublishProps(pubSub, props) {
    const { publish } = pubSub;
    const publishProps = doPublishPropsDependOnOwnProps ? finalMapPublishToProps(publish, props) : finalMapPublishToProps(publish);

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
      }

      componentWillMount() {
        this.trySubscribe();
      }

      componentWillReceiveProps(nextProps) {
        if (!shallowEqual(nextProps, this.props)) {
          this.haveOwnPropsChanged = true;
        }
      }

      shouldComponentUpdate() {
        return this.haveOwnPropsChanged || this.hasSubscribedPropsChanged;
      }

      componentWillUnmount() {
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

      hasSubscriptions() {
        if (this.pubSub) {
          return this.pubSub.subscriptions.length ? true : false;
        }
        return false;
      }

      notifyChange() {
        const prevSubscribedProps = this.state.subscribedProps;
        const subscribedProps = finalMapSubscriptionsToProps(this.props);

        if (prevSubscribedProps !== subscribedProps) {
          this.hasSubscribedPropsChanged = true;
          this.setState({ subscribedProps });
        }
      }

      trySubscribe() {
        if (shouldMapSubscriptions) {
          initComputeSubscribedProps(
            this.pubSub, () => this.notifyChange(), () => this.props
          );
          this.notifyChange();
        }
      }

      updateSubscribedPropsIfNeeded() {
        const nextSubscribedProps = computeSubscribedProps(this.props);
        if (this.subscribedProps && shallowEqual(nextSubscribedProps, this.subscribedProps)) {
          return false;
        }

        this.subscribedProps = nextSubscribedProps;
        return true;
      }

      updatePublishPropsIfNeeded() {
        const nextPublishProps = computePublishProps(this.pubSub, this.props);
        if (this.publishProps && shallowEqual(nextPublishProps, this.publishProps)) {
          return false;
        }

        this.publishProps = nextPublishProps;
        return true;
      }

      render() {
        const {
          haveOwnPropsChanged,
          hasSubscribedPropsChanged,
          renderedElement,
          pubSub,
        } = this;

        this.haveOwnPropsChanged = false;
        this.hasSubscribedPropsChanged = false;

        let shouldUpdateSubscribedProps = true;
        let shouldUpdatePublishProps = true;
        if (renderedElement) {
          shouldUpdateSubscribedProps = hasSubscribedPropsChanged || (haveOwnPropsChanged && doSubscribedPropsDependOnOwnProps);
          shouldUpdatePublishProps = haveOwnPropsChanged && doPublishPropsDependOnOwnProps;
        }

        let haveSubscribedPropsChanged = false;
        let havePublishPropsChanged = false;
        if (shouldUpdateSubscribedProps) {
          haveSubscribedPropsChanged = this.updateSubscribedPropsIfNeeded();
        }
        if (shouldUpdatePublishProps) {
          havePublishPropsChanged = this.updatePublishPropsIfNeeded();
        }

        if (
          !haveSubscribedPropsChanged &&
          !havePublishPropsChanged &&
          !haveOwnPropsChanged &&
          renderedElement
        ) {
          return renderedElement;
        }

        const baseProps = { pubSub };
        if (withRef) {
          Object.assign(baseProps, { ref: 'wrappedInstance' });
        }

        const mergedProps = Object.assign(
          {},
          this.props,
          this.subscribedProps,
          this.publishProps,
          baseProps
        );

        this.renderedElement = createElement(Composed, mergedProps);

        return this.renderedElement;
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
