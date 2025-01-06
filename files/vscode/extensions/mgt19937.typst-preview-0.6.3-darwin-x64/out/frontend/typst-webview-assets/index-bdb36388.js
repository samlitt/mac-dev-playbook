var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const typst = "";
function isGElem(node) {
  return node.tagName === "g";
}
function equalElem(prev, next) {
  const prevDataTid = prev.getAttribute(
    "data-tid"
    /* Tid */
  );
  const nextDataTid = next.getAttribute(
    "data-tid"
    /* Tid */
  );
  return prevDataTid && prevDataTid === nextDataTid;
}
function interpretTargetView(originChildren, targetChildren, tIsU = (_x) => true) {
  const availableOwnedResource = /* @__PURE__ */ new Map();
  const targetView = [];
  for (let i = 0; i < originChildren.length; i++) {
    const prevChild = originChildren[i];
    if (!tIsU(prevChild)) {
      continue;
    }
    const data_tid = prevChild.getAttribute(
      "data-tid"
      /* Tid */
    );
    if (!data_tid) {
      targetView.push(["remove", i]);
      continue;
    }
    if (!availableOwnedResource.has(data_tid)) {
      availableOwnedResource.set(data_tid, [prevChild, []]);
    }
    availableOwnedResource.get(data_tid)[1].push(i);
  }
  const toPatch = [];
  for (let i = 0; i < targetChildren.length; i++) {
    const nextChild = targetChildren[i];
    if (!tIsU(nextChild)) {
      continue;
    }
    const nextDataTid = nextChild.getAttribute(
      "data-tid"
      /* Tid */
    );
    if (!nextDataTid) {
      throw new Error("not data tid for reusing g element for " + nextDataTid);
    }
    const reuseTargetTid = nextChild.getAttribute(
      "data-reuse-from"
      /* ReuseFrom */
    );
    if (!reuseTargetTid) {
      targetView.push(["append", nextChild]);
      continue;
    }
    if (!availableOwnedResource.has(reuseTargetTid)) {
      throw new Error("no available resource for reuse " + reuseTargetTid);
    }
    const rsrc = availableOwnedResource.get(reuseTargetTid);
    const prevIdx = rsrc[1].shift();
    if (prevIdx === void 0) {
      if (nextDataTid === reuseTargetTid) {
        const clonedNode = rsrc[0].cloneNode(true);
        toPatch.push([clonedNode, nextChild]);
        targetView.push(["append", clonedNode]);
      } else {
        targetView.push(["append", nextChild]);
      }
      continue;
    }
    toPatch.push([originChildren[prevIdx], nextChild]);
    targetView.push(["reuse", prevIdx]);
  }
  for (let [_, unusedIndices] of availableOwnedResource.values()) {
    for (let unused of unusedIndices) {
      targetView.push(["remove", unused]);
    }
  }
  return [targetView, toPatch];
}
function changeViewPerspective(originChildren, targetView, tIsU = (_x) => true) {
  const originView = [];
  let removeIndices = [];
  for (let inst of targetView) {
    if (inst[0] === "remove") {
      removeIndices.push(inst[1]);
    }
  }
  removeIndices = removeIndices.sort((a, b) => a - b);
  const removeShift = [];
  {
    let r = 0;
    for (let i = 0; i < removeIndices.length; i++) {
      while (r < removeIndices[i]) {
        removeShift.push(r - i);
        r++;
      }
      removeShift.push(void 0);
      originView.push(["remove", removeIndices[i] - i]);
      r++;
    }
    while (r <= originChildren.length) {
      removeShift.push(r - removeIndices.length);
      r++;
    }
  }
  const getShift = (off) => {
    if (off >= removeShift.length || removeShift[off] === void 0) {
      throw new Error(`invalid offset ${off} for getShift ${removeShift}`);
    }
    return removeShift[off];
  };
  let targetViewCursor = 0;
  let appendOffset = 0;
  const swapIns = [];
  const inserts = [];
  const interpretOriginView = (off) => {
    off = getShift(off);
    while (targetViewCursor < targetView.length) {
      const inst = targetView[targetViewCursor];
      switch (inst[0]) {
        case "append":
          inserts.push(["insert", appendOffset, inst[1]]);
          appendOffset++;
          break;
        case "reuse":
          const target_off = getShift(inst[1]);
          swapIns.push(target_off);
          appendOffset++;
          break;
      }
      targetViewCursor++;
    }
  };
  for (let off = 0; off < originChildren.length; off++) {
    const prevChild = originChildren[off];
    if (removeShift[off] === void 0) {
      continue;
    }
    if (!tIsU(prevChild)) {
      const target_off = getShift(off);
      swapIns.push(target_off);
      continue;
    }
    interpretOriginView(off);
  }
  interpretOriginView(originChildren.length);
  const simulated = [];
  for (let i = 0; i < swapIns.length; i++) {
    simulated.push(i);
  }
  for (let i = 0; i < swapIns.length; i++) {
    const off = swapIns[i];
    for (let j = 0; j < simulated.length; j++) {
      if (simulated[j] === off) {
        simulated.splice(j, 1);
        if (i <= j) {
          simulated.splice(i, 0, off);
        } else {
          simulated.splice(i + 1, 0, off);
        }
        if (j !== i) {
          originView.push(["swap_in", i, j]);
        }
        break;
      }
    }
  }
  return [...originView, ...inserts];
}
function runOriginViewInstructions(prev, originView) {
  for (const [op, off, fr] of originView) {
    switch (op) {
      case "insert":
        prev.insertBefore(fr, prev.children[off]);
        break;
      case "swap_in":
        prev.insertBefore(prev.children[fr], prev.children[off]);
        break;
      case "remove":
        prev.children[off].remove();
        break;
      default:
        throw new Error("unknown op " + op);
    }
  }
}
function patchRoot(prev, next) {
  patchAttributes(prev, next);
  patchSvgHeader(prev, next);
  patchChildren(prev, next);
  return;
  function patchSvgHeader(prev2, next2) {
    var _a;
    for (let i = 0; i < 3; i++) {
      const prevChild = prev2.children[i];
      const nextChild = next2.children[i];
      if (prevChild.tagName === "defs") {
        if (prevChild.getAttribute("class") === "glyph") {
          prevChild.append(...nextChild.children);
        } else if (prevChild.getAttribute("class") === "clip-path") {
          prevChild.append(...nextChild.children);
        }
      } else if (prevChild.tagName === "style" && nextChild.getAttribute("data-reuse") !== "1") {
        if (nextChild.textContent) {
          var doc = document.implementation.createHTMLDocument(""), styleElement = document.createElement("style");
          styleElement.textContent = nextChild.textContent;
          doc.body.appendChild(styleElement);
          const currentSvgSheet = prevChild.sheet;
          const rulesToInsert = ((_a = styleElement.sheet) == null ? void 0 : _a.cssRules) || [];
          for (const rule of rulesToInsert) {
            currentSvgSheet.insertRule(rule.cssText);
          }
        }
      }
    }
  }
}
function patchAttributes(prev, next) {
  const prevAttrs = prev.attributes;
  const nextAttrs = next.attributes;
  if (prevAttrs.length === nextAttrs.length) {
    let same = true;
    for (let i = 0; i < prevAttrs.length; i++) {
      const prevAttr = prevAttrs[i];
      const nextAttr = nextAttrs.getNamedItem(prevAttr.name);
      if (nextAttr === null || prevAttr.value !== nextAttr.value) {
        same = false;
        break;
      }
    }
    if (same) {
      return;
    }
  }
  const removedAttrs = [];
  for (let i = 0; i < prevAttrs.length; i++) {
    removedAttrs.push(prevAttrs[i].name);
  }
  for (const attr of removedAttrs) {
    prev.removeAttribute(attr);
  }
  for (let i = 0; i < nextAttrs.length; i++) {
    prev.setAttribute(nextAttrs[i].name, nextAttrs[i].value);
  }
}
function patchChildren(prev, next) {
  const [targetView, toPatch] = interpretTargetView(
    prev.children,
    next.children,
    isGElem
  );
  for (let [prevChild, nextChild] of toPatch) {
    reuseOrPatchElem(prevChild, nextChild);
  }
  const originView = changeViewPerspective(
    prev.children,
    targetView,
    isGElem
  );
  runOriginViewInstructions(prev, originView);
}
function reuseOrPatchElem(prev, next) {
  const canReuse = equalElem(prev, next);
  next.removeAttribute(
    "data-reuse-from"
    /* ReuseFrom */
  );
  patchAttributes(prev, next);
  if (canReuse) {
    return true;
  }
  replaceNonSVGElements(prev, next);
  patchChildren(prev, next);
  return false;
  function replaceNonSVGElements(prev2, next2) {
    const removedIndecies = [];
    for (let i = 0; i < prev2.children.length; i++) {
      const prevChild = prev2.children[i];
      if (!isGElem(prevChild)) {
        removedIndecies.push(i);
      }
    }
    for (const index of removedIndecies.reverse()) {
      prev2.children[index].remove();
    }
    for (let i = 0; i < next2.children.length; i++) {
      const nextChild = next2.children[i];
      if (!isGElem(nextChild)) {
        prev2.appendChild(nextChild.cloneNode(true));
      }
    }
  }
}
function triggerRipple(docRoot, left, top, className, animation) {
  const ripple = document.createElement("div");
  ripple.className = className;
  ripple.style.left = left.toString() + "px";
  ripple.style.top = top.toString() + "px";
  docRoot.appendChild(ripple);
  ripple.style.animation = animation;
  ripple.onanimationend = () => {
    docRoot.removeChild(ripple);
  };
}
function isSourceMappingLocNode(ty) {
  return ["t", "i", "s"].includes(ty);
}
function isSourceMappingRefNode(ty) {
  return ["p", "g", "u"].includes(ty);
}
function parseSourceMappingNode(node) {
  const elements = node.split(",");
  const ty = elements[0];
  if (isSourceMappingLocNode(ty)) {
    return [ty, [elements[1]]];
  }
  if (!isSourceMappingRefNode(ty)) {
    throw new Error(`unknown type ${ty}`);
  }
  const result = elements.slice(1).map((x) => Number.parseInt(x, 16));
  return [ty, result];
}
function castToSourceMappingElement(elem) {
  if (elem.classList.length === 0) {
    return void 0;
  }
  for (const cls of [
    "typst-text",
    "typst-group",
    "typst-image",
    "typst-shape",
    "typst-page"
  ]) {
    if (elem.classList.contains(cls)) {
      return [cls, elem];
    }
  }
  return void 0;
}
function castToNestSourceMappingElement(elem) {
  while (elem) {
    const result = castToSourceMappingElement(elem);
    if (result) {
      return result;
    }
    let chs = elem.children;
    if (chs.length !== 1) {
      return void 0;
    }
    elem = chs[0];
  }
  return void 0;
}
function castChildrenToSourceMappingElement(elem) {
  return Array.from(elem.children).map(castToNestSourceMappingElement).filter((x) => x);
}
function removeSourceMappingHandler(docRoot) {
  const prevSourceMappingHandler = docRoot.sourceMappingHandler;
  if (prevSourceMappingHandler) {
    docRoot.removeEventListener("click", prevSourceMappingHandler);
    console.log("remove removeSourceMappingHandler");
  }
}
function initSourceMapping(docRoot, dataPages, dataSourceMapping) {
  const findSourceLocation = (elem) => {
    const visitChain = [];
    while (elem) {
      let srcElem = castToSourceMappingElement(elem);
      if (srcElem) {
        visitChain.push(srcElem);
      }
      if (elem === docRoot) {
        visitChain.push(["typst-root", elem]);
        break;
      }
      elem = elem.parentElement;
    }
    if (elem !== docRoot) {
      return;
    }
    let parentElements = [];
    const root = visitChain.pop();
    if (root[0] !== "typst-root") {
      return;
    }
    parentElements = castChildrenToSourceMappingElement(elem);
    if (!parentElements) {
      return;
    }
    let locInfo = dataPages;
    visitChain.reverse();
    for (const [ty, elem2] of visitChain) {
      const childrenElements = castChildrenToSourceMappingElement(elem2);
      if (locInfo.length !== parentElements.length) {
        console.error("length mismatch", locInfo, parentElements);
        break;
      }
      const idx = parentElements.findIndex((x) => x[0] === ty && x[1] === elem2);
      if (idx === -1) {
        console.error("not found", ty, elem2, " in ", locInfo);
        break;
      }
      const locInfoItem = locInfo[idx];
      switch (ty) {
        case "typst-page":
          if (locInfoItem[0] !== "p") {
            console.error("type mismatch", locInfo, ty, elem2);
            return;
          }
          break;
        case "typst-group":
          if (locInfoItem[0] !== "g") {
            console.error("type mismatch", locInfo, ty, elem2);
            return;
          }
          break;
        case "typst-text":
          if (locInfoItem[0] !== "t") {
            console.error("type mismatch", locInfo, ty, elem2);
            return;
          }
          return locInfoItem;
        case "typst-image":
          if (locInfoItem[0] !== "i") {
            console.error("type mismatch", locInfo, ty, elem2);
            return;
          }
          return locInfoItem;
        case "typst-shape":
          if (locInfoItem[0] !== "s") {
            console.error("type mismatch", locInfo, locInfoItem, ty, elem2);
            return;
          }
          return locInfoItem;
        default:
          console.error("unknown type", ty, elem2);
          return;
      }
      parentElements = childrenElements;
      locInfo = locInfoItem[1].map((x) => {
        if (x >= dataSourceMapping.length) {
          console.error("invalid index", x, dataSourceMapping);
          return ["u", []];
        }
        return dataSourceMapping[x];
      });
    }
  };
  removeSourceMappingHandler(docRoot);
  const sourceMappingHandler = docRoot.sourceMappingHandler = (event) => {
    let elem = event.target;
    const sourceLoc = findSourceLocation(elem);
    if (!sourceLoc) {
      return;
    }
    console.log("source location", sourceLoc);
    const triggerWindow = document.body || document.firstElementChild;
    const basePos = triggerWindow.getBoundingClientRect();
    const left = event.clientX - basePos.left;
    const top = event.clientY - basePos.top;
    triggerRipple(
      triggerWindow,
      left,
      top,
      "typst-debug-react-ripple",
      "typst-debug-react-ripple-effect .4s linear"
    );
    window.typstWebsocket.send(`srclocation ${sourceLoc[1][0]}`);
    return;
  };
  docRoot.addEventListener("click", sourceMappingHandler);
}
class SvgDocument {
  constructor(hookedElem) {
    __publicField(this, "currentScale");
    __publicField(this, "imageContainerWidth");
    __publicField(this, "patchQueue");
    __publicField(this, "svgUpdating");
    __publicField(this, "holdingSrcElement");
    this.hookedElem = hookedElem;
    this.currentScale = 1;
    this.imageContainerWidth = hookedElem.offsetWidth;
    this.patchQueue = [];
    this.svgUpdating = false;
    const factors = [
      0.1,
      0.2,
      0.3,
      0.4,
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.3,
      1.5,
      1.7,
      1.9,
      2.1,
      2.4,
      2.7,
      3,
      3.3,
      3.7,
      4.1,
      4.6,
      5.1,
      5.7,
      6.3,
      7,
      7.7,
      8.5,
      9.4,
      10
    ];
    const wheelEventHandler = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        if (window.onresize !== null) {
          window.onresize = null;
        }
        const prevScale = this.currentScale;
        if (event.deltaY < 0) {
          if (this.currentScale >= factors.at(-1)) {
            return;
          } else {
            this.currentScale = factors.filter((x) => x > this.currentScale).at(0);
          }
        } else if (event.deltaY > 0) {
          if (this.currentScale <= factors.at(0)) {
            return;
          } else {
            this.currentScale = factors.filter((x) => x < this.currentScale).at(-1);
          }
        } else {
          return;
        }
        const scrollFactor = this.currentScale / prevScale;
        const scrollX = event.pageX * (scrollFactor - 1);
        const scrollY = event.pageY * (scrollFactor - 1);
        this.hookedElem.style.transformOrigin = "0 0";
        this.hookedElem.style.transform = `scale(${this.currentScale})`;
        window.scrollBy(scrollX, scrollY);
      }
    };
    const vscodeAPI = typeof acquireVsCodeApi !== "undefined";
    if (vscodeAPI) {
      window.addEventListener("wheel", wheelEventHandler);
    } else {
      document.body.addEventListener("wheel", wheelEventHandler, { passive: false });
    }
  }
  rescale() {
    const newImageContainerWidth = this.hookedElem.offsetWidth;
    this.currentScale = this.currentScale * (newImageContainerWidth / this.imageContainerWidth);
    this.imageContainerWidth = newImageContainerWidth;
    this.hookedElem.style.transformOrigin = "0px 0px";
    this.hookedElem.style.transform = `scale(${this.currentScale})`;
  }
  initScale() {
    this.imageContainerWidth = this.hookedElem.offsetWidth;
    const svgWidth = Number.parseFloat(
      this.hookedElem.firstElementChild.getAttribute("width") || "1"
    );
    this.currentScale = this.imageContainerWidth / svgWidth;
    this.rescale();
  }
  grabSourceMappingElement(svgElement) {
    let srcElement = svgElement.lastElementChild || void 0;
    if (!srcElement || !srcElement.classList.contains("typst-source-mapping")) {
      srcElement = void 0;
    }
    this.holdingSrcElement = srcElement;
  }
  postprocessChanges() {
    const docRoot = this.hookedElem.firstElementChild;
    if (docRoot) {
      window.initTypstSvg(docRoot, this.holdingSrcElement);
      this.holdingSrcElement = void 0;
      this.initScale();
    }
  }
  processQueue(svgUpdateEvent) {
    let t0 = performance.now();
    let t1 = void 0;
    let t2 = void 0;
    let t3 = void 0;
    switch (svgUpdateEvent[0]) {
      case "new":
        this.hookedElem.innerHTML = svgUpdateEvent[1];
        t1 = t2 = performance.now();
        this.grabSourceMappingElement(this.hookedElem);
        t3 = performance.now();
        break;
      case "diff-v0":
        if (this.hookedElem.firstElementChild) {
          removeSourceMappingHandler(
            this.hookedElem.firstElementChild
          );
        }
        const elem = document.createElement("div");
        elem.innerHTML = svgUpdateEvent[1];
        const svgElement = elem.firstElementChild;
        t1 = performance.now();
        patchRoot(this.hookedElem.firstElementChild, svgElement);
        this.grabSourceMappingElement(elem);
        t2 = performance.now();
        t3 = performance.now();
        break;
      default:
        console.log("svgUpdateEvent", svgUpdateEvent);
        t0 = t1 = t2 = t3 = performance.now();
        break;
    }
    console.log(
      `parse ${(t1 - t0).toFixed(2)} ms, replace ${(t2 - t1).toFixed(
        2
      )} ms, postprocess ${(t3 - t2).toFixed(2)} ms, total ${(t3 - t0).toFixed(
        2
      )} ms`
    );
  }
  triggerSvgUpdate() {
    if (this.svgUpdating) {
      return;
    }
    this.svgUpdating = true;
    const doSvgUpdate = () => {
      if (this.patchQueue.length === 0) {
        this.svgUpdating = false;
        this.postprocessChanges();
        return;
      }
      try {
        while (this.patchQueue.length > 0) {
          this.processQueue(this.patchQueue.shift());
        }
        this.initScale();
        requestAnimationFrame(doSvgUpdate);
      } catch (e) {
        console.error(e);
        this.svgUpdating = false;
        this.postprocessChanges();
      }
    };
    requestAnimationFrame(doSvgUpdate);
  }
  addChangement(change) {
    if (change[0] === "new") {
      this.patchQueue.splice(0, this.patchQueue.length);
    }
    this.patchQueue.push(change);
    this.triggerSvgUpdate();
  }
}
window.onload = function() {
  const hookedElem = document.getElementById("imageContainer");
  const svgDoc = new SvgDocument(hookedElem);
  window.onresize = () => svgDoc.rescale();
  function setupSocket() {
    window.typstWebsocket = new WebSocket("ws://127.0.0.1:23625");
    window.typstWebsocket.addEventListener("open", () => {
      console.log("WebSocket connection opened");
      window.typstWebsocket.send("current");
    });
    window.typstWebsocket.addEventListener("close", () => {
      setTimeout(setupSocket, 1e3);
    });
    window.typstWebsocket.addEventListener("message", (event) => {
      var _a;
      const data = event.data;
      if ("current not avalible" === data) {
        return;
      }
      const message_idx = data.indexOf(",");
      const message = [data.slice(0, message_idx), data.slice(message_idx + 1)];
      console.log(message);
      if (message[0] === "jump") {
        const [page, x, y] = message[1].split(" ").map(Number);
        const rootElem = (_a = document.getElementById("imageContainer")) == null ? void 0 : _a.firstElementChild;
        if (rootElem) {
          window.handleTypstLocation(rootElem, page, x, y);
        }
        return;
      }
      svgDoc.addChangement(message);
    });
    window.typstWebsocket.addEventListener("close", () => {
      console.log("WebSocket connection closed");
    });
    window.typstWebsocket.addEventListener("error", (error) => {
      console.error("WebSocket Error: ", error);
    });
  }
  setupSocket();
};
let ignoredEvent = function() {
  let last = {}, diff, time;
  return function(callback, delay, id) {
    time = (/* @__PURE__ */ new Date()).getTime();
    id = id || "ignored event";
    diff = last[id] ? time - last[id] : time;
    if (diff > delay) {
      last[id] = time;
      callback();
    }
  };
}();
var overLapping = function(a, b) {
  var aRect = a.getBoundingClientRect();
  var bRect = b.getBoundingClientRect();
  return !(aRect.right < bRect.left || aRect.left > bRect.right || aRect.bottom < bRect.top || aRect.top > bRect.bottom) && /// determine overlapping by area
  (Math.abs(aRect.left - bRect.left) + Math.abs(aRect.right - bRect.right)) / Math.max(aRect.width, bRect.width) < 0.5 && (Math.abs(aRect.bottom - bRect.bottom) + Math.abs(aRect.top - bRect.top)) / Math.max(aRect.height, bRect.height) < 0.5;
};
var searchIntersections = function(root) {
  let parent = void 0, current = root;
  while (current) {
    if (current.classList.contains("typst-group")) {
      parent = current;
      break;
    }
    current = current.parentElement;
  }
  if (!parent) {
    console.log("no group found");
    return;
  }
  const group = parent;
  const children = group.children;
  const childCount = children.length;
  const res = [];
  for (let i = 0; i < childCount; i++) {
    const child = children[i];
    if (!overLapping(child, root)) {
      continue;
    }
    res.push(child);
  }
  return res;
};
var getRelatedElements = function(event) {
  let relatedElements = event.target.relatedElements;
  if (relatedElements === void 0 || relatedElements === null) {
    relatedElements = event.target.relatedElements = searchIntersections(
      event.target
    );
  }
  return relatedElements;
};
function findAncestor(el, cls) {
  while (el && !el.classList.contains(cls)) {
    el = el.parentElement;
  }
  return el;
}
window.initTypstSvg = function(docRoot, srcMapping) {
  var elements = docRoot.getElementsByClassName("pseudo-link");
  for (var i = 0; i < elements.length; i++) {
    let elem = elements[i];
    elem.addEventListener("mousemove", mouseMoveToLink);
    elem.addEventListener("mouseleave", mouseLeaveFromLink);
  }
  if (srcMapping) {
    const dataPages = srcMapping.getAttribute("data-pages").split("|").map(parseSourceMappingNode);
    const dataSourceMapping = srcMapping.getAttribute("data-source-mapping").split("|").map(parseSourceMappingNode);
    srcMapping.remove();
    setTimeout(() => {
      initSourceMapping(docRoot, dataPages, dataSourceMapping);
    }, 0);
  }
  return;
  function mouseMoveToLink(event) {
    ignoredEvent(
      function() {
        const elements2 = getRelatedElements(event);
        if (elements2 === void 0 || elements2 === null) {
          return;
        }
        for (var i2 = 0; i2 < elements2.length; i2++) {
          var elem = elements2[i2];
          if (elem.classList.contains("hover")) {
            continue;
          }
          elem.classList.add("hover");
        }
      },
      200,
      "mouse-move"
    );
  }
  function mouseLeaveFromLink(event) {
    const elements2 = getRelatedElements(event);
    if (elements2 === void 0 || elements2 === null) {
      return;
    }
    for (var i2 = 0; i2 < elements2.length; i2++) {
      var elem = elements2[i2];
      if (!elem.classList.contains("hover")) {
        continue;
      }
      elem.classList.remove("hover");
    }
  }
};
window.handleTypstLocation = function(elem, page, x, y) {
  const docRoot = findAncestor(elem, "typst-doc");
  if (!docRoot) {
    console.warn("no typst-doc found", elem);
    return;
  }
  const children = docRoot.children;
  let nthPage = 0;
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName === "g") {
      nthPage++;
    }
    if (nthPage == page) {
      const page2 = children[i];
      const dataWidth = Number.parseFloat(page2.getAttribute("data-page-width") || "0") || 0;
      const dataHeight = Number.parseFloat(page2.getAttribute("data-page-height") || "0") || 0;
      const rect = page2.getBoundingClientRect();
      const xOffsetInner = Math.max(0, x / dataWidth - 0.05) * rect.width;
      const yOffsetInner = Math.max(0, y / dataHeight - 0.05) * rect.height;
      const xOffsetInnerFix = x / dataWidth * rect.width - xOffsetInner;
      const yOffsetInnerFix = y / dataHeight * rect.height - yOffsetInner;
      const docRoot2 = document.body || document.firstElementChild;
      const basePos = docRoot2.getBoundingClientRect();
      const xOffset = rect.left - basePos.left + xOffsetInner;
      const yOffset = rect.top - basePos.top + yOffsetInner;
      const left = xOffset + xOffsetInnerFix;
      const top = yOffset + yOffsetInnerFix;
      window.scrollTo({ behavior: "smooth", left: basePos.left, top: yOffset });
      triggerRipple(
        docRoot2,
        left,
        top,
        "typst-jump-ripple",
        "typst-jump-ripple-effect .4s linear"
      );
      return;
    }
  }
};
