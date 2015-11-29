import postal from 'postal';

const createPostalAdapter = (channelName = 'reactPubSub') => {
  const channel = postal.channel(channelName);
  return {
    subscribe(action, cb) {
      channel.subscribe(action, cb);
    },
    unsubscribe() {
      channel.unsubscribe();
    },
    publish(action, data) {
      channel.publish(action, ...data);
    },
  };
};

export default createPostalAdapter;
