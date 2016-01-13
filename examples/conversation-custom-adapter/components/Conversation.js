import React, { Component, PropTypes } from 'react';
import { TALK } from '../utils/constants';
import { createPubSubConnector } from 'react-pubsub';
import subscriptionShape from 'react-pubsub/shapes/subscriptionShape';

class Conversation extends Component {
  render() {
    const { conversation } = this.props;
    return (
      <div>
        <textarea rows="20" cols="50" value={conversation} readOnly/>
      </div>
    );
  }
}

Conversation.propTypes = {
  pubSub: subscriptionShape.isRequired,
  conversation: PropTypes.string,
};

Conversation.defaultProps = {
  conversation: '',
};

const mapSubscriptionsToProps = {
  [TALK]: (res = {}, ownProps) => {
    const { msg, owner } = res;
    const { conversation: oldConversation = '' } = ownProps;
    const conversation = `${oldConversation}\n[${owner}]: ${msg}`;
    return { conversation };
  },
};

export default createPubSubConnector(mapSubscriptionsToProps)(Conversation);
