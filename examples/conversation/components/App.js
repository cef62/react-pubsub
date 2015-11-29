import React, { Component } from 'react';
import { createPubSub, PubSubProvider } from 'react-pubsub';
import ConnectedUser from './ConnectedUser';
import Conversation from './Conversation';
import User from './User';

const pubSubCore = createPubSub();

export default class App extends Component {
  render() {
    return (
      <PubSubProvider pubSubCore={pubSubCore}>
        <div>
          <ConnectedUser owner="mat"/>
          <User owner="ste"/>
          <br/><hr/>
          <Conversation />
        </div>
      </PubSubProvider>
    );
  }
}

