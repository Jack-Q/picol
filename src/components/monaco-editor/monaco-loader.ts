const global = window as any;

const load = (srcPath : String, callback : () => void) : void => {
  if (global.monaco) {
    callback();
    return;
  }

  const config = {
    paths: {
      vs: `${srcPath}/vs`
    }
  };

  const loaderUrl = `${config.paths.vs}/loader.js`;
  const onGotAmdLoader = () => {
    if (global.LOADER_PENDING) {
      global.require.config(config);
    }

    // Load monaco
    global.require(['vs/editor/editor.main'], () => {
      callback();
    });

    // Call the delayed callbacks when AMD loader has been loaded
    if (global.LOADER_PENDING) {
      global.LOADER_PENDING = false;
      const loaderCallbacks = global.LOADER_CALLBACKS;
      if (loaderCallbacks && loaderCallbacks.length) {
        let currentCallback = loaderCallbacks.shift();
        while (currentCallback) {
          currentCallback.fn.call(currentCallback.window);
          currentCallback = loaderCallbacks.shift();
        }
      }
    }
  };

  // Load AMD loader if necessary
  if (global.LOADER_PENDING) {
    // We need to avoid loading multiple loader.js when there are multiple editors
    // loading concurrently  delay to call callbacks except the first one
    global.LOADER_CALLBACKS = global.LOADER_CALLBACKS || [];
    global.LOADER_CALLBACKS.push({window: global, fn: onGotAmdLoader});
  } else if (typeof global.require === 'undefined') {
    const loaderScript = window
      .document
      .createElement('script');
    loaderScript.type = 'text/javascript';
    loaderScript.src = loaderUrl;
    loaderScript.addEventListener('load', onGotAmdLoader);
    global.document.body.appendChild(loaderScript);
    global.LOADER_PENDING = true;
  } else {
    onGotAmdLoader();
  }
};

export default { load };