import CONSTANTS from "./constants.js";
import { PointerManager } from "./pointer-manager.js";
import initControls from "./keybindings.js";

export const initHooks = async () => {};

export const setupHooks = async () => {
  // setApi(API);
};

export const readyHooks = () => {
  foundry.applications.handlebars.loadTemplates([`modules/${CONSTANTS.MODULE_ID}/templates/designer.html`]);

  const manager = PointerManager.init();

  Hooks.on("updateUser", (entity, udata) => {
    if (udata.color) {
      canvas.controls.pointer?.updateUserColor(entity);
    }
    if (udata.flags?.pointer?.settings) {
      canvas.controls.pointer?.update(entity);
    }
    if (udata.flags?.pointer?.settings?.controls && entity.id === game.user.id) {
      initControls(manager);
    }
  });

  initControls(manager);
};
