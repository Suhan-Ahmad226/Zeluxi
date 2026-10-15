// Polyfill and patch for window.fetch in environments where Window.prototype.fetch is getter-only
(function() {
  if (typeof window === 'undefined') return;

  try {
    const origFetch = window.fetch ? window.fetch.bind(window) : undefined;

    // Define writable data property on window
    try {
      Object.defineProperty(window, 'fetch', {
        value: origFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch {
      try {
        let currentFetch = origFetch;
        Object.defineProperty(window, 'fetch', {
          get() {
            return currentFetch;
          },
          set(fn) {
            currentFetch = fn;
          },
          configurable: true,
          enumerable: true
        });
      } catch {}
    }

    // Define on Window.prototype if accessible
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        const protoDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
        if (protoDesc && (!protoDesc.set || !protoDesc.writable) && protoDesc.configurable) {
          let protoFetch = protoDesc.value || window.fetch;
          Object.defineProperty(Window.prototype, 'fetch', {
            get() {
              return protoFetch;
            },
            set(fn) {
              protoFetch = fn;
              try {
                (window as any).fetch = fn;
              } catch {}
            },
            configurable: true,
            enumerable: true
          });
        }
      } catch {}
    }
  } catch {}

  // Suppress uncaught error if an external script tries to assign to read-only fetch
  window.addEventListener(
    'error',
    (event) => {
      const msg = (event && (event.message || (event.error && event.error.message))) || '';
      if (typeof msg === 'string' && msg.includes('fetch') && msg.includes('getter')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  const prevOnError = window.onerror;
  window.onerror = function(msg, source, lineno, colno, error) {
    const str = String(msg || (error && error.message) || '');
    if (str.includes('fetch') && str.includes('getter')) {
      return true; // suppresses error in browser
    }
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, arguments as any);
    }
  };
})();

export {};
