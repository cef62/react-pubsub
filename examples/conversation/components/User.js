import React, { Component, PropTypes } from 'react';
import { TALK } from '../utils/constants';
import pubSubShape from 'react-pubsub/shapes/pubSubShape';

export default class User extends Component {
  constructor(props, context) {
    super(props, context);
    this.pubSub = context.pubSubCore.register(this);
    this.state = {};
    this.inputChanged = this.inputChanged.bind(this);
    this.talk = this.talk.bind(this);
  }

  componentWillUnmount() {
    this.context.pubSubCore.unregister(this);
    delete this.pubSub;
  }

  talk() {
    const { owner } = this.props;
    const { publish } = this.pubSub;
    const { message: msg } = this.state;
    const timestamp = new Date();
    publish(TALK, { msg, owner, timestamp });
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
          onChange={this.inputChanged}
          value={message}
          type="text" placeholder="Say something"/>
        <button
          disabled={!message}
          onClick={this.talk}>talk</button>
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
