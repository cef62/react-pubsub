# React-PubSub

React-PubSub is an abstraction layer for React. The idea is to enable PubSub communication between React components, completely decoupling the PubSub layer and its consumption.
React-PubSub enable support to any compliant PubSub libray via `custom adapters`.

The library is just 14kB and comes with an internal PubSub implementation ready to be used out of the box.

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![build status](https://img.shields.io/travis/cef62/react-pubsub/master.svg?style=flat-square)](https://travis-ci.org/cef62/react-pubsub) [![npm version](https://img.shields.io/npm/v/react-pubsub.svg?style=flat-square)](https://www.npmjs.com/package/react-pubsub) [![npm downloads](https://img.shields.io/npm/dm/react-pubsub.svg?style=flat-square)](https://www.npmjs.com/package/react-pubsub) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# Installation

React-Pubsub requires **React 0.14** or later.

## Using npm based module bundlers

If you are using [webpack](http://webpack.github.io) or [browserify](http://browserify.org/) to manage the project dependencies:

```shell
npm install --save react-pubsub
```

## Using other build systems

If you are using *bower* or other build system an [UMD](https://github.com/umdjs/umd) build is available at [npmcdn.com](https://npmcdn.com):

* **UMD uncompressed**: [react-pubsub.js](https://npmcdn.com/react-pubsub/dist/react-pubsub.js)
* **UMD compressed**: [react-pubsub.min.js](https://npmcdn.com/react-pubsub/dist/react-pubsub.min.js)

Using the *UMD* build `react-pubsub` is available as a global object.

# React Native

React-SubPub should work without problems with React Native, but we've not already tried it.

# Quick Start

React-PubSub offers 3 elements:

* a PubSub Wrapper
* a PubSub Provider
* a PubSub Connector

## Provider Component

To start using it you must create a **PubSub Wrapper** and passit to a **PubSub Provider**.
The **Provider** will expose to its children the **PubSub Wrapper API**.

```javascript
// App.js

import React, { Component } from 'react';
import { createPubSub, PubSubProvider } from 'react-pubsub';
import ConnectedComponent from './ConnectedComponent';

const pubSubCore = createPubSub();

export default class App extends Component {
  render() {
    return (
      <PubSubProvider pubSubCore={pubSubCore}>
        <div>{ .... }</div>
      </PubSubProvider>
    );
  }
}
```
## Connector Component

Any children of **PubSubProvider** who require access to the PubSub API should be wrapped by a **PubSub Connector**.
The connector will pass `pubSub` as **prop** to its child component.

Create the Connected Component:

```javascript
// ConnectedComponent.js

import React, { Component, PropTypes } from 'react';
import { createPubSubConnector } from 'react-pubsub';

class ConnectedComponent extends Component {
  componentDidMount() {
    const { pubSub } = this.props;
    // use PubSub API
  }

  render() {
    return (
      <div>Connected Component</div>
    );
  }
}

ConnectedComponent.propTypes = {
  pubSub: subscriptionShape.isRequired,
};

export default createPubSubConnector()(ConnectedComponent);
```
**Attention** `createPubSubConnector` must be invoked twice, first with configuration parameters and the returned function with the component to be wrapped.

### Remove subscribed events

The **PubSub Connector** automatically remove all subscription when the component will unmount.

# Documentation

More info coming soon...

# License

MIT

