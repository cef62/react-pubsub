import React, { Component, PropTypes } from 'react';
import { TALK } from '../utils/constants';
import { createPubSubConnector } from 'react-pubsub';
import subscriptionShape from 'react-pubsub/shapes/subscriptionShape';

class Conversation extends Component {
  constructor(props, context) {
    super(props, context);
    this.conversation = '';
  }

  componentWillUpdate({ lastMessage = '' }) {
    this.conversation = `${this.conversation}\n${lastMessage}`;
  }

  render() {
    const { conversation } = this;
    return (
      <div>
        <textarea rows="20" cols="50" value={conversation} />
      </div>
    );
  }
}

Conversation.propTypes = {
  pubSub: subscriptionShape.isRequired,
  lastMessage: PropTypes.string,
};

const subscriptionsToPros = {
  [TALK]: ([{ msg, owner }]) => {
    return { lastMessage: `[${owner}]: ${msg}` };
  },
};

export default createPubSubConnector(subscriptionsToPros)(Conversation);
