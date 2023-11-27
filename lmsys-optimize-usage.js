// ==UserScript==
// @name         lmsys-enhancer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Optimize page experience (Increase output token count + Auto-switch to direct chat + Auto-switch model)
// @author       joshlee
// @match        https://chat.lmsys.org/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lmsys.org
// @grant        none
// @license      MIT
// ==/UserScript==

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

function optimizePage() {
  window.alert = null;
  document.querySelectorAll(".tab-nav.scroll-hide button")[2].click();
  removeUselessElements();
  setMaxOutputToken();
  changeModel("gpt-4-turbo");

  // Prevent sporadic convo resets
  const ogAEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (
    type,
    listener,
    optionsOrUseCapture
  ) {
    let calledByOpenAI = false;
    if (
      (type == "focus" && this === unsafeWindow) ||
      type == "visibilitychange"
    ) {
      const callStack = new Error().stack + "\n",
        aelCaller = callStack.match(/-extension:\/\/.*\n(.+)/)?.[1];
      calledByOpenAI = !aelCaller?.includes("-extension://");
      if (calledByOpenAI && type == "visibilitychange") {
        ogAEL.call(
          this,
          type,
          function (event) {
            if (document.visibilityState != "visible")
              listener.call(this, event);
          },
          optionsOrUseCapture
        );
      }
    }
    if (!calledByOpenAI) ogAEL.apply(this, arguments);
  };
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
