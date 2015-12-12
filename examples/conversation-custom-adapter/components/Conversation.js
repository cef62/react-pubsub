import React, { Component } from 'react';
import { TALK } from '../utils/constants';
import { createPubSubConnector } from 'react-pubsub';
import subscriptionShape from 'react-pubsub/shapes/subscriptionShape';

class Conversation extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    const { pubSub: { add } } = this.props;
    add(TALK, ({ msg, owner }) => {
      const { conversation: oldConversation = '' } = this.state;
      const conversation = `${oldConversation}\n[${owner}]: ${msg}`;
      this.setState({ conversation });
    });
  }

  render() {
    const { conversation } = this.state;
    return (
      <div>
        <textarea rows="20" cols="50" value={conversation} />
      </div>
    );
  }
}

Conversation.propTypes = {
  pubSub: subscriptionShape.isRequired,
};

export default createPubSubConnector()(Conversation);
