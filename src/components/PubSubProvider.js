import { Component, PropTypes, Children } from 'react';
import pubSubShape from '../shapes/pubSubShape';

let didWarnAboutCoreChanged = false;
const warnOfCoreChanges = () => {
  if (didWarnAboutCoreChanged) {
    return;
  }
  didWarnAboutCoreChanged = true;
  console.error( // eslint-disable-line no-console
    `<PubSubProvider> currently can't dynamically change the pubSubCore!`
  );
};

export default class PubSubProvider extends Component {

  constructor(props, context) {
    super(props, context);
    this.pubSubCore = props.pubSubCore;
  }

  getChildContext() {
    return { pubSubCore: this.pubSubCore };
  }

  componentWillReceiveProps(nextProps) {
    const { pubSubCore } = this;
    const { pubSubCore: nextPubSubCore } = nextProps;

    if (pubSubCore !== nextPubSubCore) {
      warnOfCoreChanges();
    }
  }

  render() {
    const { children } = this.props;
    return Children.only(children);
  }
}

PubSubProvider.propTypes = {
  pubSubCore: pubSubShape.isRequired,
  children: PropTypes.element.isRequired,
};

PubSubProvider.childContextTypes = {
  pubSubCore: pubSubShape.isRequired,
};
