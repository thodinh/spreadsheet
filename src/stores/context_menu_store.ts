import {
  HEADER_HEIGHT,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_HEIGHT,
  MENU_WIDTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { FullMenuItem, MenuItem } from "../registries";
import { DOMCoordinates } from "../types";
import { store, Store, StoreConfig } from "./providers";

interface OpenMenu {
  isOpen: true;
  menuItems: FullMenuItem[];
  subMenu: Store<Menu, MenuActions>;
  position: DOMCoordinates;
  menuHeight: number;
  popoverProps: {
    marginTop: number;
    flipHorizontalOffset: number;
    flipVerticalOffset: number;
  };
}

interface ClosedMenu {
  isOpen: false;
}

type Menu = OpenMenu | ClosedMenu;

interface MenuInternalState {
  menuItems: any[];
  depth: number;
  position?: DOMCoordinates;
  subMenu?: Store<Menu, MenuActions>;
  scrollOffset: number;
}

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

class MenuActions {
  constructor(private state: MenuInternalState) {}

  open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
    this.state.menuItems = menuItems;
    this.state.position = position;
    // check if menuItems are different?
    this.state.subMenu?.notify.close();
  }

  close() {
    this.state.subMenu?.notify.close();
    this.state.menuItems = [];
    this.state.position = { x: 0, y: 0 };
  }

  openSubMenu(menuIndex: number, subMenuItems: FullMenuItem[], position: DOMCoordinates) {
    // same as computed state
    if (this.state.menuItems.length === 0 || this.state.position === undefined) {
      return;
    }
    if (this.state.subMenu === undefined) {
      this.state.subMenu = store(menuProvider(this.state.depth + 1));
    }
    const menusAbove = this.state.menuItems.slice(0, menuIndex);
    const y = menuComponentHeight(menusAbove) + position.y - (this.state.scrollOffset || 0);
    const x = position.x + MENU_WIDTH;
    this.state.subMenu.notify.open(subMenuItems, { y, x });
  }

  closeSubMenu() {
    this.state.subMenu?.notify.close();
  }

  scroll(scrollOffset: number) {
    this.state.scrollOffset = scrollOffset;
  }
}

export type MenuStore = Store<Menu, MenuActions>;
type MenuStoreProvider = (
  stores,
  depth?: number
) => StoreConfig<MenuInternalState, Menu, MenuActions>;

export const menuProvider: MenuStoreProvider = (stores, depth: number = 1) => ({
  actions: MenuActions,
  state: {
    depth,
    menuItems: [],
    scrollOffset: 0,
  },
  computeView: (state) => {
    if (state.menuItems.length === 0 || state.position === undefined) {
      return { isOpen: false };
    }
    return {
      isOpen: true,
      menuItems: state.menuItems,
      position: state.position,
      subMenu: state.subMenu || store(menuProvider(state.depth + 1)),
      menuHeight: menuComponentHeight(state.menuItems),
      popoverProps: computePopoverProps(state.depth),
    };
  },
});

function menuComponentHeight(menuItems: MenuItem[]): number {
  const separators = menuItems.filter((m) => m.separator);
  const others = menuItems;
  return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
}

function computePopoverProps(depth: number) {
  const isRoot = depth === 1;
  return {
    // some margin between the header and the component
    marginTop: HEADER_HEIGHT + 6 + TOPBAR_HEIGHT,
    flipHorizontalOffset: MENU_WIDTH * (depth - 1),
    flipVerticalOffset: isRoot ? 0 : MENU_ITEM_HEIGHT,
  };
}
