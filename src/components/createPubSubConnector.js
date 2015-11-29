import { Component, createElement } from 'react';
import pubSubShape from '../utils/pubSubShape';

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

const createPubSubConnector = Composed => {
  class PubSubConnector extends Component {
    constructor(props, context) {
      super(props, context);
      this.pubSubCore = props.pubSubCore || context.pubSubCore; // eslint-disable-line react/prop-types
      this.pubSub = this.pubSubCore.register(this);
    }

    render() {
      const { pubSub } = this;
      return createElement(Composed, Object.assign({pubSub}, this.props));
    }
  }

  PubSubConnector.contextTypes = {
    pubSubCore: pubSubShape,
  };

  PubSubConnector.propTypes = {
    pubSubCore: pubSubShape,
  };

  PubSubConnector.displayName = `PubSubConnector(${getDisplayName(Component)})`;
  PubSubConnector.WrappedComponent = Component;

  return PubSubConnector;
};

export default createPubSubConnector;
