/* eslint no-console:0,react/no-multi-comp:0 */
/*
 * Based on react-redux Provider tests
 * https://github.com/rackt/react-redux/blob/master/test/components/Provider.spec.js
 */
import test from 'ava';
import sinon from 'sinon';
import React, { PropTypes, Component, Children, createClass } from 'react';
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
  const pubSubCore = createPubSub();

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
  const pubSubCore = createPubSub();

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
  const pubSubCore = createPubSub();
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
  const pubSubCore = createPubSub();
  const someData = { some: 'data' };

  class Container extends Component {
    someInstanceMethod() {
      return someData;
    }

    render() {
      return (<Passthrough />);
    }
  }
  const WrappedComponent = createPubSubConnector(null, null, { withRef: true })(Container);

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

// TODO: improve this test, splitting it in more atomic scenarios
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
  'should update subscriptions from `mapSubscriptionsToProps` when props changes only'
  + ' if the callback defines a second arguments',
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

// TODO: create a similar test for 'mapSubscriptionsToProps'
test('should not invoke mapPublish when props change if it only has one argument', t => {
  const pubSubCore = createPubSub();

  let invocationCount = 0;

  const mapPublish = () => {
    invocationCount++;
    return {};
  };

  class WithoutProps extends Component {
    render() {
      return (<Passthrough {...this.props}/>);
    }
  }
  const WrappedContainer = createPubSubConnector(null, mapPublish)(WithoutProps);

  class OuterComponent extends Component {
    constructor() {
      super();
      this.state = { foo: 'FOO' };
    }

    setFoo(foo) {
      this.setState({ foo });
    }

    render() {
      return (
        <div>
        <WrappedContainer {...this.state} />
        </div>
      );
    }
  }

  let outerComponent;
  TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <OuterComponent ref={c => outerComponent = c} />
    </ProviderMock>
  );

  outerComponent.setFoo('BAR');
  outerComponent.setFoo('DID');

  t.is(invocationCount, 1);

  t.end();
});

// TODO: create a similar test for 'mapSubscriptionsToProps'
test('should invoke mapPublish every time props are changed if it has a second argument', t => {
  const pubSubCore = createPubSub();

  let invocationCount = 0;
  let propsPassedIn;

  const mapPublish = (args, props) => { // eslint-disable-line no-unused-vars
    invocationCount++;
    propsPassedIn = props;
    return {};
  };

  class WithoutProps extends Component {
    render() {
      return (<Passthrough {...this.props}/>);
    }
  }
  const WrappedContainer = createPubSubConnector(null, mapPublish)(WithoutProps);

  class OuterComponent extends Component {
    constructor() {
      super();
      this.state = { foo: 'FOO' };
    }

    setFoo(foo) {
      this.setState({ foo });
    }

    render() {
      return (
        <div>
        <WrappedContainer {...this.state} />
        </div>
      );
    }
  }

  let outerComponent;
  TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <OuterComponent ref={c => outerComponent = c} />
    </ProviderMock>
  );

  outerComponent.setFoo('BAR');
  outerComponent.setFoo('DID');

  t.is(invocationCount, 3);
  t.same(propsPassedIn, { foo: 'DID' });

  t.end();
});

test('should pass publish and avoid subscription if arguments are falsy', t => {
  const pubSubCore = createPubSub();
  const register = pubSubCore.register;
  let pubSub;
  pubSubCore.register = (...args) => {
    pubSub = register(...args);
    return pubSub;
  };

  function runCheck(...connectArgs) {
    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }
    const WrappedContainer = createPubSubConnector(...connectArgs)(Container);

    const container = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <WrappedContainer pass="through" />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);

    t.is(stub.props.publish, pubSub.publish);
    t.is(stub.props.foo, undefined);
    t.is(stub.props.pass, 'through');
    t.doesNotThrow(() => TestUtils.findRenderedComponentWithType(container, WrappedContainer));
    const decorated = TestUtils.findRenderedComponentWithType(container, WrappedContainer);
    t.false(decorated.hasSubscriptions());
  }

  runCheck();
  runCheck(null, null, null);
  runCheck(false, false, false);

  t.end();
});

test('should set the displayName correctly', t => {
  class Foo extends Component {
    render() {
      return (<div />);
    }
  }
  t.is(createPubSubConnector()(Foo).displayName, 'PubSubConnector(Foo)');

  const Bar = createClass({
    displayName: 'Bar',
    render() {
      return (<div />);
    },
  });
  t.is(createPubSubConnector()(Bar).displayName, 'PubSubConnector(Bar)');

  const Comp = createClass({
    render() {
      return (<div />);
    },
  });
  t.is(createPubSubConnector()(Comp).displayName, 'PubSubConnector(Component)');

  t.end();
});

test('should expose the wrapped component as WrappedComponent', t => {
  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }
  const decorated = createPubSubConnector()(Container);

  t.is(decorated.WrappedComponent, Container);
  t.end();
});

test('should throw when trying to access the wrapped instance if withRef is not specified', t => {
  const pubSubCore = createPubSub();

  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }

  const Decorated = createPubSubConnector()(Container);

  const tree = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <Decorated />
    </ProviderMock>
  );

  const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);
  t.throws(
    () => decorated.getWrappedInstance(),
    /To access the wrapped instance, you need to specify explicitly \{ withRef: true \} in the options passed to the createPubSubConnector\(\) call\./
  );

  t.end();
});

test('should return the instance of the wrapped component for use in calling child methods', t => {
  const pubSubCore = createPubSub();

  const someData = { some: 'data' };

  class Container extends Component {
    someInstanceMethod() {
      return someData;
    }

    render() {
      return (<Passthrough />);
    }
  }

  const decorator = createPubSubConnector(null, null, { withRef: true });
  const Decorated = decorator(Container);

  const tree = TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <Decorated />
    </ProviderMock>
  );

  const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);

  t.throws(() => decorated.someInstanceMethod());
  t.is(decorated.getWrappedInstance().someInstanceMethod(), someData);
  t.is(decorated.refs.wrappedInstance.someInstanceMethod(), someData);

  t.end();
});
