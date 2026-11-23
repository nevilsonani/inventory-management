/**
 * A tiny browser-only store. State lives in memory, is mirrored to
 * localStorage (so changes survive a refresh and sync across tabs) and is
 * read by components through `useInventory()`.
 *
 * Components that read the store must render inside <ClientOnly>, which keeps
 * them out of the server prerender (there is no localStorage on the server).
 */
import { useSyncExternalStore } from "react";
import type { InventoryState, Result } from "./types";
import * as domain from "./domain";
import { createSeedState, STATE_VERSION } from "./seed";

const STORAGE_KEY = "sasthasoft.inventory";

let state: InventoryState | null = null;
const listeners = new Set<() => void>();

function load(): InventoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as InventoryState;
      if (saved.version === STATE_VERSION) return saved;
    }
  } catch {
    // Corrupt or unavailable storage: fall back to fresh sample data.
  }
  return save(createSeedState());
}

function save(next: InventoryState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode). The app keeps working in memory.
  }
  return next;
}

function emit() {
  for (const listener of listeners) listener();
}

function getState() {
  state ??= load();
  return state;
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  state = load();
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useInventory(): InventoryState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Applies a domain result. Returns it unchanged so callers can show feedback. */
function commit(result: Result): Result {
  if (result.ok) {
    state = save(result.state);
    emit();
  }
  return result;
}

type DomainFn<Args extends unknown[]> = (state: InventoryState, ...args: Args) => Result;

const bind =
  <Args extends unknown[]>(fn: DomainFn<Args>) =>
  (...args: Args) =>
    commit(fn(getState(), ...args));

export const actions = {
  createSalesOrder: bind(domain.createSalesOrder),
  dispatchSalesOrder: bind(domain.dispatchSalesOrder),
  markSalesOrderPaid: bind(domain.markSalesOrderPaid),
  cancelSalesOrder: bind(domain.cancelSalesOrder),
  createPurchaseOrder: bind(domain.createPurchaseOrder),
  receivePurchaseOrder: bind(domain.receivePurchaseOrder),
  cancelPurchaseOrder: bind(domain.cancelPurchaseOrder),
  adjustStock: bind(domain.adjustStock),
  transferStock: bind(domain.transferStock),
  createItem: bind(domain.createItem),
  updateItem: bind(domain.updateItem),
  createCustomer: bind(domain.createCustomer),
  createSupplier: bind(domain.createSupplier),
  resetDemoData() {
    state = save(createSeedState());
    emit();
  },
};
