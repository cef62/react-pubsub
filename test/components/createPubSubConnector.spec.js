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
import consoleMock from '../helpers/consoleMock';
import initJsDom from '../helpers/document';
import createPubSubConnector from '../../src/components/createPubSubConnector';
import createPubSub from '../../src/adapter/createPubSub';
import subscriptionShape from '../../src/shapes/subscriptionShape';

const log = consoleMock(); // eslint-disable-line no-unused-vars
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
});

test('should pass pubSub subscription with a valid shape', t => {
  const pubSubCore = createPubSub();

  class Container extends Component {
    render() {
      return (<Passthrough {...this.props} />);
    }
  }
  Container.propTypes = {
    pubSub: subscriptionShape.isRequired,
  };
  const WrapperContainer = createPubSubConnector()(Container);

  const spy = sinon.spy(console, 'error');
  TestUtils.renderIntoDocument(
    <ProviderMock pubSubCore={pubSubCore}>
    <WrapperContainer />
    </ProviderMock>
  );
  console.error.restore();
  t.is(spy.callCount, 0);
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
      [UPDATE]: (payload = {}, props) => {
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
    pubSub.publish(UPDATE, { label: 'myLabel', name: 'myNewName' });
    t.is(stub.props.updatedField, 'myNewName');

    pubSub.publish(UPDATE, { label: 'myLabel' });
    t.is(stub.props.updatedField, undefined);

    pubSub.publish(SPEAK, 'New Message');
    t.is(stub.props.lastMessage, 'New Message');
  }
);

test(
  'should not update subscribed actions when props changes if `mapSubscriptionsToProps`'
  + ' is an object',
  t => {
    const SIMPLE_UPDATE = 'simpleUpdate';
    const OTHER_UPDATE = 'otherUpdate';
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
      [SIMPLE_UPDATE]: (payload = {}) => {
        const now = new Date().getTime();
        return { simpleField: payload.name, now };
      },
      [OTHER_UPDATE]: (a, b) => {
        const otherNow = new Date().getTime();
        return { otherNow, a, b };
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
    let nowValue = stub.props.now;
    wrapper.setState({ updateField: 'label' });
    t.is(stub.props.now, nowValue);

    pubSub.publish(OTHER_UPDATE, 'yo', 'ye');
    t.is(stub.props.a, 'yo');
    nowValue = stub.props.otherNow;
    wrapper.setState({ updateField: 'color' });
    t.is(stub.props.otherNow, nowValue);
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
});

test('should expose the wrapped component as WrappedComponent', t => {
  class Container extends Component {
    render() {
      return (<Passthrough />);
    }
  }
  const decorated = createPubSubConnector()(Container);

  t.is(decorated.WrappedComponent, Container);
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
});

test(
  'should always pass component props to action callback if'
  + ' `mapSubscriptionsToProps` is an object',
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

    const mapSubscriptionsToProps = {
      [SIMPLE_UPDATE]: (country, ...other) => {
        return { country, other };
      },
    };
    const WrapperContainer = createPubSubConnector(mapSubscriptionsToProps)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <WrapperContainer name="john" color="red" />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    pubSub.publish(SIMPLE_UPDATE, 'Italy');
    t.is(stub.props.country, 'Italy');
    t.is(stub.props.other.length, 1);
  }
);

// TODO: review and change this test
test(
  'should not pass component props to action callback when'
  + ' `mapSubscriptionsToProps` is a function.',
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

    const mapSubscriptionsToProps = (_pubSub, notifyChange/* , getProps */) => {
      let map = {};
      _pubSub.add(
        SIMPLE_UPDATE,
        (country, ...other) => {
          map = Object.assign({}, map, { country, other });
          notifyChange();
        });

      return () => (map);
    };

    const WrapperContainer = createPubSubConnector(mapSubscriptionsToProps)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <WrapperContainer name="john" color="red" />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    pubSub.publish(SIMPLE_UPDATE, 'Italy');
    t.is(stub.props.country, 'Italy');
    t.notOk(stub.props.other.length);
  }
);

// TODO: add test to better cover `mapSubscriptionsToProps` when is a function

test(
  'should throws if `mapSubscriptionsToProps` is not a function'
  + ' or a plain object',
  t => {
    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    t.throws(
      () => createPubSubConnector('subscriptionsToProps')(Container),
        /"createPubSubConnector" expected "mapSubscriptionsToProps" to be a function or a plain object, instead received:/
    );
    t.throws(
      () => createPubSubConnector([1, 2, 3])(Container),
        /"createPubSubConnector" expected "mapSubscriptionsToProps" to be a function or a plain object, instead received:/
    );
    t.doesNotThrow(() => createPubSubConnector()(Container));
    t.doesNotThrow(() => createPubSubConnector({})(Container));
    t.doesNotThrow(() => createPubSubConnector({ action: () => {} })(Container));
    t.doesNotThrow(() => createPubSubConnector(() => {})(Container));
  }
);

test(
  'should throws if `mapSubscriptionsToProps` is a function but does not return a function',
  t => {
    const pubSubCore = createPubSub();
    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }
    const invalidSubscription = () => 'hello';
    let Wrapper = createPubSubConnector(invalidSubscription)(Container);

    t.throws(
      () => TestUtils.renderIntoDocument(
        <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
        </ProviderMock>
      )
    );

    const validSubscription = () => () => ({});
    Wrapper = createPubSubConnector(validSubscription)(Container);
    t.doesNotThrow(
      () => TestUtils.renderIntoDocument(
        <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
        </ProviderMock>
      )
    );
  }
);

test(
  'should invoke only once `mapSubscriptionsToProps` if is a function',
  t => {
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
    const subscription = () => () => ({});
    const spy = sinon.spy(subscription);
    const Wrapper = createPubSubConnector(spy)(Container);

    TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <Wrapper color="red" />
      </ProviderMock>
    );

    t.true(spy.calledOnce);
    t.is(spy.lastCall.args.length, 3);
    t.is(spy.lastCall.args[0], pubSub);
    t.is(typeof spy.lastCall.args[1], 'function'); // update method
    t.is(typeof spy.lastCall.args[2], 'function'); // get current props method
    t.same(spy.lastCall.args[2](), { color: 'red' });
  }
);

// TODO: add specific error messages in pubSubConnector
test(
  'should throws if the function returned from `mapSubscriptionsToProps` is'
  + ' not undefined, null or an object',
  t => {
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    let Wrapper = createPubSubConnector(() => () => {})(Container);
    t.throws(
    () => TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
      </ProviderMock>
      )
      // /'pubSubConnector' expected an object returned from given \.applySubscription\(\) method\. Instead received:/
    );

    Wrapper = createPubSubConnector(() => () => ({ a: 1 }))(Container);
    t.doesNotThrow(() => TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
      </ProviderMock>
    ));

    Wrapper = createPubSubConnector(() => () => ([1, 2]))(Container);
    t.throws(
      () => TestUtils.renderIntoDocument(
        <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
        </ProviderMock>
      )
      // /'pubSubConnector' expected an object returned from given \.applySubscription\(\) method\. Instead received:/
    );

    Wrapper = createPubSubConnector(() => () => 'hello!')(Container);
    t.throws(
      () => TestUtils.renderIntoDocument(
        <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
        </ProviderMock>
      )
      // /'pubSubConnector' expected an object returned from given \.applySubscription\(\) method\. Instead received:/
    );
  }
);

test(
  'should not invoke the function returned from `mapSubscriptionsToProps`'
  + ' when the component is instantiated.',
  t => {
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    const spy = sinon.spy(() => ({}));
    const subscription = () => spy;
    const Wrapper = createPubSubConnector(subscription)(Container);

    TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
      </ProviderMock>
    );

    t.false(spy.calledOnce);
  }
);

test(
  'should pass down the values returned from initial invocation of the'
  + ' function returned from `mapSubscriptionsToProps`'
  + ' when the component is instantiated.',
  t => {
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    const subscription = () => () => ({ color: 'red', info: { name: 'mike' } });
    const Wrapper = createPubSubConnector(subscription)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    t.is(stub.props.color, 'red');
    t.same(stub.props.info, { name: 'mike' });
  }
);

test(
  'should invoke the function returned from `mapSubscriptionsToProps` every time'
  + ' the props of the component will change and one time when registered',
  t => {
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    const spy = sinon.spy(props => ({
      color: 'red',
      info: { name: props.receivedName },
    }));
    const subscription = () => spy;
    const Wrapper = createPubSubConnector(subscription)(Container);

    class ControlledState extends Component {
      constructor() {
        super();
        this.state = { receivedName: 'mike' };
      }

      render() {
        const { receivedName } = this.state;
        return (<Wrapper receivedName={receivedName} />);
      }
    }

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <ControlledState />
      </ProviderMock>
    );
    const owner = TestUtils.findRenderedComponentWithType(tree, ControlledState);

    t.is(spy.callCount, 2);
    owner.setState({ receivedName: 'john' });
    owner.setState({ receivedName: 'jake' });
    t.is(spy.callCount, 4);
  }
);

test(
  'should pass down the values returned from any invocation of the'
  + ' function returned from `mapSubscriptionsToProps`'
  + ' every time the props of the component will change',
  t => {
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    const subscription = () => props => ({
      color: 'red',
      info: { name: props.receivedName },
    });
    const Wrapper = createPubSubConnector(subscription)(Container);

    class ControlledState extends Component {
      constructor() {
        super();
        this.state = { receivedName: 'mike' };
      }

      render() {
        const { receivedName } = this.state;
        return (<Wrapper receivedName={receivedName} />);
      }
    }

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <ControlledState />
      </ProviderMock>
    );
    const owner = TestUtils.findRenderedComponentWithType(tree, ControlledState);
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    t.is(stub.props.color, 'red');
    t.same(stub.props.info, { name: 'mike' });
    owner.setState({ receivedName: 'john' });
    t.same(stub.props.info, { name: 'john' });
  }
);

test(
  'should pass down the values returned from actions mapped from'
  + ' `mapSubscriptionsToProps`.',
  t => {
    const ACTION = 'action';
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

    const subscription = (pubSubInstance, notify, getProps) => {
      let map = {};
      pubSubInstance.add(ACTION, suffix => {
        const { name } = getProps();
        map = Object.assign({}, map, { name: `${name} [${suffix}]` });
        notify();
      });

      return () => (map);
    };
    const Wrapper = createPubSubConnector(subscription)(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
        <Wrapper name="mike" />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    t.is(stub.props.name, 'mike');
    pubSub.publish(ACTION, 'tyson');
    t.is(stub.props.name, 'mike [tyson]');
  }
);

test(
  'should not invoke actions mapped when component is instantiated'
  + ' but option is { forceInitialValues: false }',
  t => {
    const SIMPLE_UPDATE = 'simpleUpdate';
    const pubSubCore = createPubSub();

    class Container extends Component {
      render() {
        return (<Passthrough {...this.props} />);
      }
    }

    const simpleUpdateHandler = (country = 'unknown country') => {
      console.log('PD', country);
      return { country };
    };
    simpleUpdateHandler.initialValues = ['default country'];

    const WrapperContainer = createPubSubConnector(
      { [SIMPLE_UPDATE]: simpleUpdateHandler },
      null, { forceInitialValues: false }
    )(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock pubSubCore={pubSubCore}>
      <WrapperContainer />
      </ProviderMock>
    );
    const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);

    t.is(stub.props.country, undefined);
  }
);
