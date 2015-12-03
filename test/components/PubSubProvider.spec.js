/* eslint no-console:0,react/no-multi-comp:0 */
/*
 * Based on react-redux Provider tests
 * https://github.com/rackt/react-redux/blob/master/test/components/Provider.spec.js
 */
import test from 'ava';
import sinon from 'sinon';
import React, { PropTypes, Component } from 'react';
import TestUtils from 'react-addons-test-utils';
import 'babel-core/register';
import initJsDom from '../helpers/_document';
import PubSubProvider from '../../src/components/PubSubProvider';

initJsDom();

class Child extends Component {
  render() {
    return (<div />);
  }
}
Child.contextTypes = {
  pubSubCore: PropTypes.object.isRequired,
};

test.serial('should enforce a single child', t => {
  const pubSubCore = { register() {}, unregister() {} };

  // Ignore propTypes warnings
  const propTypes = PubSubProvider.propTypes;
  PubSubProvider.propTypes = {};

  try {
    t.doesNotThrow(() => TestUtils.renderIntoDocument(
      <PubSubProvider pubSubCore={pubSubCore}>
      <div />
      </PubSubProvider>
    ));

    t.throws(() => TestUtils.renderIntoDocument(
      <PubSubProvider pubSubCore={pubSubCore} />
    ), /exactly one child/ );

    t.throws(() => TestUtils.renderIntoDocument(
      <PubSubProvider pubSubCore={pubSubCore}>
      <div /> <div />
      </PubSubProvider>
    ), /exactly one child/ );
  } finally {
    // Restore PropTypes
    PubSubProvider.propTypes = propTypes;
  }

  t.end();
});

test('should add the PubSub core to the child context', t => {
  const pubSubCore = { register() {}, unregister() {} };

  const spy = sinon.spy(console, 'error');
  const tree = TestUtils.renderIntoDocument(
    <PubSubProvider pubSubCore={pubSubCore}>
    <Child />
    </PubSubProvider>
  );
  console.error.restore();
  t.is(spy.callCount, 0);

  const child = TestUtils.findRenderedComponentWithType(tree, Child);
  t.is(child.context.pubSubCore, pubSubCore);
  t.end();
});

test('should warn only once when receiving a new PubSubCore in props', t => {
  const pubSubCore1 = { register: sinon.spy(), unregister() { return 15; } };
  const pubSubCore2 = { register: sinon.spy(), unregister() { return 16; } };
  const pubSubCore3 = { register: sinon.spy(), unregister() { return 17; } };

  class ProviderContainer extends Component {
    constructor() {
      super();
      this.state = { pubSubCore: pubSubCore1 };
    }

    render() {
      const { pubSubCore } = this.state;
      return (
        <PubSubProvider pubSubCore={pubSubCore}>
        <Child />
        </PubSubProvider>
      );
    }
  }

  const container = TestUtils.renderIntoDocument(<ProviderContainer />);
  const child = TestUtils.findRenderedComponentWithType(container, Child);
  t.is(child.context.pubSubCore.unregister(), 15);

  // mock console.error to avoid it to print on test output
  const tmp = console.error;
  console.error = () => {};

  let spy = sinon.spy(console, 'error');
  container.setState({ pubSubCore: pubSubCore2 });
  console.error.restore();

  t.is(child.context.pubSubCore.unregister(), 15);
  t.is(spy.callCount, 1);
  t.true(spy.calledWith(`<PubSubProvider> currently can't dynamically change the pubSubCore!`));

  spy = sinon.spy(console, 'error');
  container.setState({ pubSubCore: pubSubCore3 });
  console.error.restore();

  t.is(child.context.pubSubCore.unregister(), 15);
  t.is(spy.callCount, 0);

  console.error = tmp;
  t.end();
});
