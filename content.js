const TEXTAREA_SELECTOR = '#__next main form textarea[data-id]';

// set up a queue to handle messages from the server
/**
 * @type {{text: string; ts: string; pending_ts: string; channel: string}[]}
 */
const queue = [];
/** @type {WebSocket|null} */
let socket;
let isWaitingForResponse = false;

function enterPromptAndWaitForResponse(payload, onResponded = (payload) => {}) {
  const textarea = document.querySelector(TEXTAREA_SELECTOR);
  const submitButton = document.querySelector(`${TEXTAREA_SELECTOR} + button`);
  textarea.value = payload.text;

  setTimeout(() => {
    submitButton.click();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataId = document.querySelector(TEXTAREA_SELECTOR).getAttribute('data-id');
        const container = mutation.target.querySelector(`div[class^='${dataId}']`);
        const buttons = container?.parentNode?.parentNode?.querySelectorAll('button');
        if (container && buttons && buttons.length === 2) {
          observer.disconnect();
          onResponded({
            ...payload,
            text: container.innerHTML,
          });
        }
      });
    });
    observer.observe(document.querySelector("#__next main div[class^='react-scroll-to-bottom-']"), {
      subtree: true,
      childList: true,
    });
  }, 300);
}

/**
 * Send the response back to the WebSocket server.
 *
 * @param {object} payload
 * @returns
 */
function sendResponse(payload) {
  if (!payload) return;

  socket?.send(JSON.stringify({ type: 'response', payload }));
}

function simulate() {
  const nextPacket = queue.shift();
  enterPromptAndWaitForResponse(nextPacket, (payload) => {
    sendResponse(payload);
    setTimeout(() => {
      isWaitingForResponse = false;
    }, 100);
  });
}

function processQueue(timeout = 500) {
  if (queue.length > 0 && !isWaitingForResponse) {
    isWaitingForResponse = true;
    simulate();
  }

  setTimeout(() => processQueue(timeout), timeout);

  // check if the session has expired
  document.body.querySelectorAll('[data-headlessui-portal]').forEach((div) => {
    if (div?.innerHTML?.includes('Your session has expired')) {
      socket?.send(JSON.stringify({ type: 'session_expired' }));
    }
  });
}

window.onload = () => {
  if (window.location.pathname !== '/chat') return;

  socket = new WebSocket('ws://localhost:3001');

  // receive a message from the server
  socket.addEventListener('message', ({ data }) => {
    const packet = JSON.parse(data);

    switch (packet.type) {
      case 'prompt':
        queue.push(packet.payload);

        break;
    }
  });

  // process queue items every 0.5 seconds
  processQueue(500);

  // refresh the page in 30 minutes
  setTimeout(() => {
    window.location.reload();
  }, 30 * 60 * 1000);
};
