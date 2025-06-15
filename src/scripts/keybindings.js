let controls;
import CONSTANTS from "./constants.js";
import Logger from "./lib/Logger.js";
import { PointerSettingsMenu } from "./settings/settings-menu.js";
export default function init() {
  Logger.debug("Pointer Initializing controls");
  const settings = foundry.utils.mergeObject(
    PointerSettingsMenu.defaultSettings.controls,
    game.user.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.SETTINGS)?.controls,
  );
  removeListeners();

  setUpControls(settings);

  addListeners();
}

/**
 * The original version of this function was removed in Foundry VTT v9.
 */
export function getKey(event) {
  if (event.code === "Space") return event.code;
  if (/^Digit/.test(event.code)) return event.code[5];
  if (event.location === 3 && (event.code in game.keyboard.moveKeys || event.code in game.keyboard.zoomKeys)) {
    return event.code;
  }
  return event.key;
}

function setUpControls(settings) {
  controls = { pointer: {}, ping: {}, force: {} };

  for (let objKey of ["ping", "pointer"]) {
    const keys = settings[objKey].key.split(" + ");
    const metaKeys = keys.splice(0, keys.length - 1);
    controls[objKey].meta = {};
    for (const meta of ["Ctrl", "Shift", "Meta", "Alt"])
      controls[objKey].meta[meta.toLowerCase() + "Key"] = metaKeys.includes(meta);

    if (keys[0]?.includes("Click")) {
      controls[objKey].event = "mouse";
      if (keys[0].includes("Left")) controls[objKey].button = 0;
      else controls[objKey].button = 2;
    } else {
      controls[objKey].event = "key";
      controls[objKey].key = keys[0];
    }
  }
  controls.ping.pointerActive = settings.ping.pointerActive;

  if (game.user.isGM) {
    const keys = settings.ping.force.split(" + ");

    const metaKeys = keys.splice(0, keys.length - 1);
    controls.force.meta = {};
    for (const meta of ["Ctrl", "Shift", "Meta", "Alt"])
      controls.force.meta[meta.toLowerCase() + "Key"] = metaKeys.includes(meta);

    if (keys[0]?.includes("Click")) {
      controls.force.event = "mouse";
      if (keys[0].includes("Left")) controls.force.button = 0;
      else controls.force.button = 2;
    } else {
      controls.force.event = "key";
      controls.force.key = keys[0];
    }
  }
}

function removeListeners() {
  if (!controls) return;
  if (controls.pointer.event === "key") {
    window.removeEventListener(`${controls.pointer.event}down`, onPointerDown);
    window.removeEventListener(`${controls.pointer.event}up`, onPointerUp);
  } else {
    window.removeEventListener(`${controls.pointer.event}down`, onPointerDown);
    window.removeEventListener(`${controls.pointer.event}up`, onPointerUp);
  }

  if (controls.ping.event === "key") {
    window.removeEventListener(`${controls.ping.event}down`, onPing);
  } else {
    window.removeEventListener(`${controls.ping.event}down`, onPing);
  }

  if (controls.force.event) {
    if (controls.force.event === "key") {
      window.removeEventListener(`${controls.ping.event}down`, onForcePing);
    } else {
      window.removeEventListener(`${controls.ping.event}down`, onForcePing);
    }
  }
}

function addListeners() {
  if (controls.pointer.event === "key") {
    window.addEventListener(`${controls.pointer.event}down`, onPointerDown);
    window.addEventListener(`${controls.pointer.event}up`, onPointerUp);
  } else {
    window.addEventListener(`${controls.pointer.event}down`, onPointerDown);
    window.addEventListener(`${controls.pointer.event}up`, onPointerUp);
  }

  if (controls.ping.event === "key") {
    window.addEventListener(`${controls.ping.event}down`, onPing);
  } else {
    window.addEventListener(`${controls.ping.event}down`, onPing);
  }

  if (controls.force.event) {
    if (controls.force.event === "key") {
      window.addEventListener(`${controls.ping.event}down`, onForcePing);
    } else {
      window.addEventListener(`${controls.ping.event}down`, onForcePing);
    }
  }
}

function checkKey(ev, obj) {
  if (ev.target !== document.body && ev.target !== canvas.app.view) return false;
  // if (document.activeElement !== document.body) return false;

  const key = getKey(ev);
  if (key) {
    if (key?.toUpperCase() !== obj.key?.toUpperCase()) return false;
  } else {
    // else pointer event, which always has the correct key

    if (ev.button !== obj.button) return false;
  }

  for (let key of Object.keys(obj.meta)) {
    if (obj.meta[key] !== ev[key]) return false;
  }
  ev.preventDefault();
  ev.stopPropagation();
  return true;
}

function onPointerDown(ev) {
  if (ev.repeat) {
    return;
  }
  if (!checkKey(ev, controls.pointer) || controls.pointer.active || !canvas.controls.pointer) {
    return;
  }
  Logger.debug("Pointer Key down", ev);
  controls.pointer.active = true;
  canvas.controls.pointer.start();
}

function onPointerUp(ev) {
  // Be a bit more liberal here.
  // since the checkKey method doesn't work as good for key up events
  if (ev.key && ev.key.toUpperCase() !== controls.pointer.key.toUpperCase()) {
    return;
  }
  // handle mouse interaction differently.. again, so when both are bound to mouse, the pointer does not get deactivated
  else if (ev.button && !checkKey(ev, controls.pointer)) {
    return;
  }
  if (!canvas.controls.pointer) {
    Logger.debug("Pointer controls not available, cannot stop pointer");
    return;
  }
  Logger.debug("Pointer Key up", ev);
  controls.pointer.active = false;
  canvas.controls.pointer.stop();
}

function onPing(ev) {
  if (controls.ping.pointerActive && !controls.pointer.active) {
    return;
  }
  if (!checkKey(ev, controls.ping)) {
    return;
  }
  Logger.debug("Pointer on Ping", ev);
  canvas.controls.pointer.ping();
}

function onForcePing(ev) {
  if (controls.ping.pointerActive && !controls.pointer.active) {
    return;
  }
  if (!checkKey(ev, controls.force)) {
    return;
  }
  Logger.debug("Pointer on Force Ping", ev);
  canvas.controls.pointer.ping({ force: true });
}
