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
  const WrapperContainer = createPubSubConnector()(Container);

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
  const WrapperContainer = createPubSubConnector()(Container);

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
  const WrapperContainer = createPubSubConnector()(Container);

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
  const WrapperContainer = createPubSubConnector()(Container);

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

  const WrappedContainer = createPubSubConnector()(Container);

  t.is(typeof WrappedContainer.extraMethodSay, 'function');
  t.is(WrappedContainer.extraMethodSay(), 'Hey there!');
  t.is(WrappedContainer.foo, 'bar');

  t.end();
});

test('should use the pubSub core from the props instead of from the context if present', t => {
  const pubSubCore = { register() {}, unregister() {} };
  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }
  const WrappedContainer = createPubSubConnector()(Container);

  const container = TestUtils.renderIntoDocument(<WrappedContainer pubSubCore={pubSubCore} />);
  t.is(container.pubSubCore, pubSubCore);

  t.end();
});

test('should throw an error if the pubSub core is not in the props or context', t => {
  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }
  const WrappedContainer = createPubSubConnector()(Container);

  t.throws(
    () => TestUtils.renderIntoDocument(<WrappedContainer />),
    /Could not find "pubSubCore"/
  );

  t.end();
});


test('should return the instance of the wrapped component for use in calling child methods', t => {
  const pubSubCore = { register() {}, unregister() {} };
  const someData = { some: 'data' };

  class Container extends Component {
    someInstanceMethod() {
      return someData;
    }

    render() {
      return (<Passthrough />);
    }
  }
  const WrappedComponent = createPubSubConnector(null, { withRef: true })(Container);

  const tree = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrappedComponent />
    </ProviderMock>
  );

  const decorated = TestUtils.findRenderedComponentWithType(tree, WrappedComponent);

  t.throws(() => decorated.someInstanceMethod());
  t.is(decorated.getWrappedInstance().someInstanceMethod(), someData);
  t.is(decorated.refs.wrappedInstance.someInstanceMethod(), someData);

  t.end();
});

test('should subscribe pure function components to the pubSub core', t => {
  const subscription = {
    add: sinon.spy(),
    removeAll: sinon.spy(),
    publish: sinon.spy(),
  };
  const pubSubCore = {
    register: () => subscription,
    unregister() {},
  };

  const Container = createPubSubConnector()(function Container(props) {
    return (<Passthrough {...props}/>);
  });

  const spy = sinon.spy(console, 'error');
  const tree = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <Container />
    </ProviderMock>
  );
  console.error.restore();
  t.is(spy.callCount, 0);

  const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
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

test(
  'should map subscriptions defined in `mapSubscriptionsToProps` and '
  + 'pass their payload as props to wrapped component',
  t => {
    const SPEAK = 'speak';
    const UPDATE = 'update';
    const pubSubCore = createPubSub();
    const register = pubSubCore.register;
    let pubSub;
    pubSubCore.register = (...args) => {
      pubSub = register(...args);
      return pubSub;
    };

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    class ControlledState extends Component {
      constructor() {
        super();
        this.state = { updateField: 'label' };
      }

      render() {
        const { updateField } = this.state;
        return (<WrapperContainer updateField={updateField} />);
      }
    }

    const mapSubscriptionsToProps = {
      [SPEAK]: 'lastMessage',
      [UPDATE]: (args, props) => {
        const [payload = {}] = args;
        const { updateField: key } = props;
        return { updatedField: payload[key] };
      },
    };
    const WrapperContainer = createPubSubConnector(mapSubscriptionsToProps)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <ControlledState />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
    const wrapper = TestUtils.findRenderedComponentWithType(tree, ControlledState);

    t.is(stub.props.lastMessage, undefined);
    pubSub.publish(SPEAK, 'Hey there!');
    t.is(stub.props.lastMessage, 'Hey there!');

    t.is(stub.props.updatedField, undefined);
    pubSub.publish(UPDATE, { label: 'myLabel', name: 'myName' });
    t.is(stub.props.updatedField, 'myLabel');
    wrapper.setState({ updateField: 'name' });
    t.is(stub.props.updatedField, 'myName');
    pubSub.publish(UPDATE, { label: 'myLabel', name: 'myNewName' });
    t.is(stub.props.updatedField, 'myNewName');

    pubSub.publish(UPDATE, { label: 'myLabel' });
    t.is(stub.props.updatedField, undefined);

    pubSub.publish(SPEAK, 'New Message');
    t.is(stub.props.lastMessage, 'New Message');

    t.end();
  }
);

test(
  'should update mapped subscriptions defined in `mapSubscriptionsToProps` when'
  + ' props changes only if the callback defines a second arguments in its signature',
  t => {
    const SIMPLE_UPDATE = 'simpleUpdate';
    const pubSubCore = createPubSub();
    const register = pubSubCore.register;
    let pubSub;
    pubSubCore.register = (...args) => {
      pubSub = register(...args);
      return pubSub;
    };

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    class ControlledState extends Component {
      constructor() {
        super();
        this.state = { updateField: 'label' };
      }

      render() {
        const { updateField } = this.state;
        return (<WrapperContainer updateField={updateField} />);
      }
    }

    const mapSubscriptionsToProps = {
      [SIMPLE_UPDATE]: (args) => {
        const [payload = {}] = args;
        const now = new Date().getTime();
        return { simpleField: payload.name, now };
      },
    };
    const WrapperContainer = createPubSubConnector(mapSubscriptionsToProps)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <ControlledState />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
    const wrapper = TestUtils.findRenderedComponentWithType(tree, ControlledState);

    t.is(stub.props.simpleField, undefined);
    pubSub.publish(SIMPLE_UPDATE, { name: 'john' });
    t.is(stub.props.simpleField, 'john');
    const nowValue = stub.props.now;
    wrapper.setState({ updateField: 'label' });
    t.is(stub.props.now, nowValue);

    t.end();
  }
);
