import React, { Component, PropTypes } from 'react';
import { TALK } from '../utils/constants';
import pubSubShape from 'react-pubsub/utils/pubSubShape';

export default class User extends Component {
  constructor(props, context) {
    super(props, context);
    this.pubSub = context.pubSubCore.register(this);
    this.state = {};
  }

  componentWillUnmount() {
    this.pubSub.unsubscribe();
    delete this.pubSub;
    delete this.pubSubCore;
  }

  talk() {
    const { owner } = this.props;
    const { publish } = this.pubSub;
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

User.contextTypes = {
  pubSubCore: pubSubShape.isRequired,
};

User.propTypes = {
  owner: PropTypes.string.isRequired,
};
