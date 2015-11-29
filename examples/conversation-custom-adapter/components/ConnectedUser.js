import React, { Component, PropTypes } from 'react';
import { TALK } from '../utils/constants';
import { createPubSubConnector } from 'react-pubsub';
import subscriptionShape from 'react-pubsub/utils/subscriptionShape';

class ConnectedUser extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  talk() {
    const { owner, pubSub: { publish } } = this.props;
    const { message: msg } = this.state;
    publish(TALK, { msg, owner });
  }

  inputChanged(evt) {
    const { target: { value: message } } = evt;
    this.setState({ message });
  }

  render() {
    const { message } = this.state;
    const { owner } = this.props;
    return (
      <div>
        <strong>{owner}:</strong>
        <input
          onChange={(evt) => this.inputChanged(evt)}
          value={message}
          type="text" placeholder="Say something"/>
        <button
          disabled={!message}
          onClick={() => this.talk()}>talk</button>
      </div>
    );
  }
}

ConnectedUser.propTypes = {
  pubSub: subscriptionShape.isRequired,
  owner: PropTypes.string.isRequired,
};

export default createPubSubConnector(ConnectedUser);
