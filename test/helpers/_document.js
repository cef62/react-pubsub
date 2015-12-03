// import ExecutionEnvironment from 'react/lib/ExecutionEnvironment';
import jsdom from 'jsdom';

export default function jsdomReact() {
  const doc = jsdom.jsdom('<!doctype html><html><body></body></html>');
  const win = doc.defaultView;
  global.document = doc;
  global.window = win;
  global.navigator = win.navigator;

  const globalKeys = Object.keys(global);
  Object.keys(win).forEach( key => {
    if ( !globalKeys.find( gKey => gKey === key ) ) {
      global[key] = win[key];
    }
  });

  // ExecutionEnvironment.canUseDOM = true;
}
