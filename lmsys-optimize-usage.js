// ==UserScript==
// @name         lmsys-enhancer
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Optimize your experience on the chat.lmsys.org with the `lmsys-enhancer` Tampermonkey script.
// @author       joshlee
// @match        https://chat.lmsys.org/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lmsys.org
// @grant        none
// @license      MIT
// ==/UserScript==

const scriptConfig = {
  model: "gpt-4-turbo",
  wsUrl: "wss://chat.lmsys.org/queue/join",
  keepConnectionInterval: 120 * 1000,
  keepConnectionTimeout: 30 * 1000,
  autoCleanBlankDialogInterval: 3000,
  sessionHash: "",
};

const originalSend = WebSocket.prototype.send;

function removeUselessElements() {
  // Remove unnecessary notices and components
  document
    .querySelectorAll("#notice_markdown")
    .forEach((elem) => elem.remove());
  let componentToRemove = document.querySelector("#component-93");
  if (componentToRemove) componentToRemove.remove();
  componentToRemove = document.querySelector("#component-83");
  if (componentToRemove) componentToRemove.remove();
}

function setMaxOutputToken(maxValue = 4096) {
  // Set the maximum token output to the desired value
  const maxOutputTokenInputs = document.querySelectorAll(
    "#component-100 input"
  );
  if (maxOutputTokenInputs.length >= 2) {
    maxOutputTokenInputs[1].max = String(maxValue);
    maxOutputTokenInputs[0].value = String(maxValue);
    maxOutputTokenInputs[1].value = String(maxValue);
    const changeEvent = new Event("change", {
      bubbles: true,
      cancelable: true,
    });
    maxOutputTokenInputs[1].dispatchEvent(changeEvent);
  }
}

function changeModel(model) {
  document.querySelector("#model_selector_row label").click();
  document.querySelector(`li[data-value=${model}]`).dispatchEvent(
    new MouseEvent("mousedown", {
      view: window,
      bubbles: true,
      cancelable: true,
    })
  );
}

function hackWsSend(data) {
  const d = JSON.parse(data);
  // get session_hash
  if (d.session_hash) {
    scriptConfig.sessionHash = d.session_hash;
    console.log("🤗 session_hash:", d.session_hash);
  }
  originalSend.call(this, data);
}

function autoCleanBlankDialog() {
  setInterval(function () {
    var elements = document.querySelectorAll('div[data-testid="user"]');
    elements.forEach(function (element) {
      if (element.textContent.trim() === "") {
        element.parentNode.removeChild(element);
      }
    });
  }, scriptConfig.autoCleanBlankDialogInterval);
}

function keepConnection() {
  const createWebSocket = function () {
    const ws = new WebSocket(scriptConfig.wsUrl);
    ws.onmessage = function (event) {
      // console.log("Received:", event.data);
      const data = JSON.parse(event.data);

      if (data.msg === "send_hash") {
        ws.send(
          JSON.stringify({
            fn_index: 39,
            session_hash: scriptConfig.sessionHash,
          })
        );
      } else if (data.msg === "send_data") {
        const sendData = {
          data: [null, scriptConfig.model, " "],
          event_data: null,
          fn_index: 39,
          session_hash: scriptConfig.sessionHash,
        };
        ws.send(JSON.stringify(sendData));
      }
    };
  };
  createWebSocket();
  setInterval(createWebSocket, scriptConfig.keepConnectionInterval);
}

function optimizePage() {
  window.alert = null;
  WebSocket.prototype.send = hackWsSend;
  document.querySelectorAll(".tab-nav.scroll-hide button")[2].click();
  removeUselessElements();
  setMaxOutputToken();
  changeModel(scriptConfig.model);
  autoCleanBlankDialog();
  setTimeout(keepConnection, scriptConfig.keepConnectionTimeout);
}

(function main() {
  // Create a MutationObserver instance and pass the callback function
  const observer = new MutationObserver((mutations, observer) => {
    // Find the target element using its ID (you may adjust the selector according to your needs)
    const targetElement = document.getElementById("component-1");
    if (targetElement) {
      // If the target element exists, execute the optimize function and stop observing
      optimizePage();
      observer.disconnect(); // Stop observing
    }
  });

  // Configuration for the observer:
  const observerConfig = { childList: true, subtree: true };

  // Select the node that will be observed for mutations
  const targetNode = document.body; // You may specify a more specific parent node to reduce the scope of observation

  // Call the observer's observe method to start observing the target node
  observer.observe(targetNode, observerConfig);
})();
