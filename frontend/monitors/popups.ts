import type { Awaitable, Voidable } from '../helpers';
import Steam from '../steam';

const kOnCloseSet = Symbol.for('non-steam-playtimes.on-close-set');

export enum PopupType {
  Desktop = 'desktop',
  Gamepad = 'gamepad',
  Modal = 'modal',
  ContextMenu = 'contextmenu',
  Unknown = 'unknown',
}

/**
 * Monitor Steam popups and trigger when an action is made on them
 * @param handleOpen Callback to trigger when a popup is opened
 * @returns A function to stop monitoring
 */
export function onPopupCreate(
  handleOpen: (
    popup: Steam.Popup,
    type: PopupType,
    handlers: {
      onOpen: (handleOpen: VoidFunction) => void;
      onClose: (handleClose: VoidFunction) => void;
    },
  ) => Awaitable<Voidable<VoidFunction>>,
) {
  async function handlePopupCreate(popup: Steam.Popup) {
    let type: PopupType = PopupType.Unknown;
    if (popup.window?.name.startsWith('SP Desktop_')) type = PopupType.Desktop;
    else if (popup.window?.name.startsWith('SP BPM_')) type = PopupType.Gamepad;
    else if (popup.window?.name.startsWith('PopupWindow_')) type = PopupType.Modal;
    else if (popup.window?.name.startsWith('contextmenu_')) type = PopupType.ContextMenu;

    const onCloseSet = new Set<VoidFunction>();
    Reflect.set(popup, kOnCloseSet, onCloseSet);

    const onClose = await handleOpen(popup, type, {
      onOpen: (cb: VoidFunction) => cb(),
      onClose: (cb: VoidFunction) => onCloseSet.add(cb),
    });
    if (onClose) onCloseSet.add(onClose);
  }

  async function handlePopupDestroy(popup: Steam.Popup) {
    const onCloseSet = Reflect.get(popup, kOnCloseSet) as Set<VoidFunction>;
    if (onCloseSet) for (const cb of onCloseSet) cb();
    Reflect.deleteProperty(popup, kOnCloseSet);
  }

  const mainWindow = //
    Steam.PopupManager.GetExistingPopup(Steam.DesktopWindowName);
  if (mainWindow) handlePopupCreate(mainWindow);
  const gamepadWindow = //
    Steam.PopupManager.GetExistingPopup(Steam.GamepadWindowName);
  if (gamepadWindow) handlePopupCreate(gamepadWindow);

  const { Unregister: removeCreateCallback } =
    Steam.PopupManager.AddPopupCreatedCallback(handlePopupCreate);
  const { Unregister: removeDestroyCallback } =
    Steam.PopupManager.AddPopupDestroyedCallback(handlePopupDestroy);

  return () => {
    removeCreateCallback();
    removeDestroyCallback();
  };
}
