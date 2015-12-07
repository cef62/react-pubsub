/* eslint no-console:0,react/no-multi-comp:0 */
/*
 * Based on react-redux Provider tests
 * https://github.com/rackt/react-redux/blob/master/test/components/Provider.spec.js
 */
import test from 'ava';
import sinon from 'sinon';
import React, { PropTypes, Component, Children } from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import 'babel-core/register';
import initJsDom from '../helpers/_document';
import createPubSubConnector from '../../src/components/createPubSubConnector';
import createPubSub from '../../src/adapter/createPubSub';

initJsDom();

class Passthrough extends Component {
  render() {
    return (<div {...this.props} />);
  }
}

class ProviderMock extends Component {
  getChildContext() {
    return { pubSubCore: this.props.pubSubCore };
  }

  render() {
    return Children.only(this.props.children);
  }
}
ProviderMock.childContextTypes = {
  pubSubCore: PropTypes.object.isRequired,
};
ProviderMock.propTypes = {
  pubSubCore: PropTypes.object.isRequired,
  children: PropTypes.element.isRequired,
};

test('should add the PubSub core to the child context', t => {
  const pubSubCore = { register() {}, unregister() {} };

  class Container extends Component {
    render() {
      return (<div {...this.props} />);
    }
  }
  const WrapperContainer = createPubSubConnector(Container);

  const tree = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrapperContainer pass="through" />
    </ProviderMock>
  );

  const container = TestUtils.findRenderedComponentWithType(tree, WrapperContainer);
  t.is(container.context.pubSubCore, pubSubCore);

  t.end();
});

test('should pass props to the given component', t => {
  const pubSubCore = { register() {}, unregister() {} };

  class Container extends Component {
    render() {
      return (<Passthrough {...this.props} />);
    }
  }
  const WrapperContainer = createPubSubConnector(Container);

  const container = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrapperContainer pass="through" count={33} />
    </ProviderMock>
  );

  const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
  t.is(stub.props.pass, 'through');
  t.is(stub.props.count, 33);
  t.is(stub.props.other, undefined);
  t.doesNotThrow(
    () => TestUtils.findRenderedComponentWithType(container, WrapperContainer)
  );

  t.end();
});

test('should pass pubSub subscriptions as props to the given component', t => {
  const subscription = {
    add: sinon.spy(),
    removeAll: sinon.spy(),
    publish: sinon.spy(),
  };
  const pubSubCore = {
    register: () => subscription,
    unregister() {},
  };

  class Container extends Component {
    render() {
      return (<Passthrough {...this.props} />);
    }
  }
  const WrapperContainer = createPubSubConnector(Container);

  const container = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrapperContainer />
    </ProviderMock>
  );

  const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
  const cb = () => {};
  const action = { msg: 'message' };
  subscription.add('test_action', cb);
  subscription.publish('test_action', action);
  subscription.removeAll();
  t.is(stub.props.pubSub, subscription);
  t.true(subscription.add.calledOnce);
  t.true(subscription.add.calledWith('test_action', cb));
  t.true(subscription.publish.calledOnce);
  t.true(subscription.publish.calledWith('test_action', action));
  t.true(subscription.removeAll.calledOnce);

  t.end();
});

test('should unsubscribe before unmounting', t => {
  const unregisterSpy = sinon.spy();
  const pubSubCore = createPubSub();
  const unregister = pubSubCore.unregister;
  pubSubCore.unregister = (...rest) => {
    unregisterSpy();
    unregister(...rest);
  };

  class Container extends Component {
    render() {
      return (<Passthrough {...this.props} />);
    }
  }
  const WrapperContainer = createPubSubConnector(Container);

  const div = document.createElement('div');
  ReactDOM.render(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrapperContainer />
    </ProviderMock>,
    div
  );

  t.is(unregisterSpy.callCount, 0);
  ReactDOM.unmountComponentAtNode(div);
  t.is(unregisterSpy.callCount, 1);

  t.end();
});

test('should hoist non-react statics from wrapped component', t => {
  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }
  Container.extraMethodSay = () => 'Hey there!';
  Container.foo = 'bar';

  const decorated = createPubSubConnector(Container);

  t.is(typeof decorated.extraMethodSay, 'function');
  t.is(decorated.extraMethodSay(), 'Hey there!');
  t.is(decorated.foo, 'bar');

  t.end();
});
