'use strict';

import './popup.css';

(function() {
  const AddrStorage = {
    get: cb => {
      chrome.storage.sync.get(['addr'], result => {
        cb(result.addr);
      });
    },
    set: (value, cb) => {
      chrome.storage.sync.set(
        {
          addr: value,
        },
        () => {
          cb();
        }
      );
    },
  };

  function setupAddr(initialValue = '') {

    document.getElementById('addr').value = initialValue;
    document.getElementById('addr').addEventListener('input', (el) => {
      console.log('el', document.getElementById('addr').value);
      updateAddr({
        addr: document.getElementById('addr').value
      });
    });

  }

  function updateAddr({ addr }) {
    AddrStorage.set(addr, () => {
      console.log('Current addr value passed to contentScript file');
    });
  }

  async function restoreAddr() {
    // Restore addr value
    AddrStorage.get(addr => {
      if (typeof addr === 'undefined') {
        // Set Addr value as ''
        AddrStorage.set('', () => {
          setupAddr('');
        });
      } else {
        setupAddr(addr);
      }
    });

  }


  document.addEventListener('DOMContentLoaded', restoreAddr);
})();
