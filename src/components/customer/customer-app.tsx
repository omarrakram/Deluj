"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShoppingBag, WifiOff } from "lucide-react";
import { DelujProvider, useDeluj, useNow } from "@/client/store";
import { useGuest } from "@/client/guest";
import { Sheet } from "@/components/ui/sheet";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { defaultSelections, estimateLine } from "@/domain/cart";
import { newId } from "@/domain/ids";
import { contextName, seedMenu, sortMenu } from "@/domain/menu";
import { formatEGP } from "@/domain/money";
import { isActive } from "@/domain/orders";
import { buildCooccurrence, recommend } from "@/domain/recommend";
import { SERVICE_KIND_META } from "@/domain/requests";
import { tableLabel } from "@/domain/tables";
import type { MenuItem, PaymentMethod, ServiceKind } from "@/domain/types";
import { CartSheetBody } from "./cart-sheet";
import { CheckoutSheetBody, type CheckoutPhase } from "./checkout-sheet";
import { ItemSheetBody } from "./item-sheet";
import { MenuView } from "./menu-view";
import { ServiceSheetBody } from "./service-sheet";
import { TrackingView } from "./tracking-view";

const SEED_MENU = sortMenu(seedMenu());

type SheetState = { type: "item"; itemId: string; nonce: number } | { type: "cart" } | { type: "checkout" } | { type: "service" } | null;

export function CustomerApp({ tableCode }: { tableCode: string }) {
  return (
    <DelujProvider tableCode={tableCode}>
      <ToastProvider>
        <Customer tableCode={tableCode} />
      </ToastProvider>
    </DelujProvider>
  );
}

function Customer({ tableCode }: { tableCode: string }) {
  const { data, ready, link, client } = useDeluj();
  const guest = useGuest(tableCode);
  const toast = useToast();
  const now = useNow(1000);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [view, setView] = useState<"menu" | "tracking">("menu");
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>("choose");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ServiceKind | null>(null);
  const checkoutId = useRef<string | null>(null);
  const table = tableLabel(tableCode);

  const menu = useMemo(() => sortMenu(data?.menu ?? SEED_MENU), [data?.menu]);
  const menuById = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);
  const cooccurrence = useMemo(() => buildCooccurrence(data?.orders ?? []), [data?.orders]);

  // Forget the previous demo run after a reset.
  const resetVersion = data?.meta.resetVersion;
  const { hydrated, syncResetVersion } = guest;
  useEffect(() => {
    if (hydrated && resetVersion !== undefined) syncResetVersion(resetVersion);
  }, [hydrated, resetVersion, syncResetVersion]);

  // Let the team know the table is browsing (once per visit window).
  useEffect(() => {
    if (!ready) return;
    const key = `deluj:opened:${tableCode}`;
    try {
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last < 10 * 60_000) return;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* ignore */
    }
    void client.send({ type: "openTable", tableCode });
  }, [ready, client, tableCode]);

  const myOrders = useMemo(
    () => (data?.orders ?? []).filter((o) => guest.orderIds.includes(o.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data?.orders, guest.orderIds],
  );
  const latestOrder = myOrders[myOrders.length - 1] ?? null;
  const showTracker =
    latestOrder && (isActive(latestOrder) || (latestOrder.servedAt && now - new Date(latestOrder.servedAt).getTime() < 30 * 60_000));
  const activeOrder = showTracker ? latestOrder : null;
  const tableRequests = useMemo(() => (data?.requests ?? []).filter((r) => r.tableCode === tableCode), [data?.requests, tableCode]);

  const cartCount = guest.cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = guest.cart.reduce((s, l) => {
    const item = menuById.get(l.itemId);
    return s + (item ? estimateLine(item, l.selections, l.quantity) : 0);
  }, 0);

  const recsFor = useCallback(
    (anchorItemId?: string, extraIds: string[] = []) =>
      recommend({
        menu,
        cartItemIds: [...guest.cart.map((l) => l.itemId), ...extraIds],
        anchorItemId,
        now,
        cooccurrence,
      }),
    [menu, guest.cart, now, cooccurrence],
  );

  const openItem = (itemId: string) => setSheet({ type: "item", itemId, nonce: Date.now() });

  const quickAdd = (item: MenuItem) => {
    if (!item.available) return;
    guest.addToCart({ itemId: item.id, quantity: 1, selections: defaultSelections(item) });
    navigator.vibrate?.(12);
    toast({ tone: "success", title: `${contextName(item)} added`, body: formatEGP(item.price) });
  };

  const placeOrder = async (method: PaymentMethod) => {
    if (!guest.cart.length) return;
    checkoutId.current ??= newId();
    setCheckoutPhase("processing");
    setCheckoutError(null);
    // A short, honest "authorising" beat for the demo card flow.
    if (method !== "cash") await new Promise((r) => setTimeout(r, 900));
    const result = await client.send({
      type: "placeOrder",
      tableCode,
      paymentMethod: method,
      clientRequestId: checkoutId.current,
      lines: guest.cart.map(({ itemId, quantity, selections, note }) => ({ itemId, quantity, selections, note })),
    });
    if (result.ok && result.order) {
      guest.rememberOrder(result.order.id);
      guest.clearCart();
      checkoutId.current = null;
      setCheckoutPhase("choose");
      setSheet(null);
      setView("tracking");
      window.scrollTo({ top: 0 });
      navigator.vibrate?.([20, 60, 20]);
      return;
    }
    setCheckoutPhase("error");
    if (!result.ok && result.code === "sold_out") {
      setCheckoutError(`${result.message} We've kept the rest of your order — please review it.`);
      checkoutId.current = null;
      setTimeout(() => setSheet({ type: "cart" }), 1600);
    } else {
      setCheckoutError(!result.ok ? result.message : "Something went wrong. Please try again.");
    }
  };

  const sendRequest = async (kind: ServiceKind) => {
    if (pendingRequest) return;
    setPendingRequest(kind);
    const result = await client.send({ type: "createRequest", tableCode, kind, clientRequestId: newId() });
    setPendingRequest(null);
    if (result.ok && result.request) {
      guest.rememberRequest(result.request.id);
      navigator.vibrate?.(15);
      toast({
        tone: "success",
        title: result.duplicate ? "Already on its way" : `${SERVICE_KIND_META[kind].label} — request sent`,
        body: result.duplicate ? "The team already has this request." : "A team member has been notified.",
      });
    } else if (!result.ok) {
      toast({ tone: "error", title: "Couldn't send that", body: result.message });
    }
  };

  const bill = tableRequests.filter((r) => r.kind === "bill").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const billState: "idle" | "sent" | "acknowledged" | "pending" =
    pendingRequest === "bill" ? "pending" : bill && bill.status === "open" ? "sent" : bill && bill.status === "acknowledged" ? "acknowledged" : "idle";

  const sheetItem = sheet?.type === "item" ? menuById.get(sheet.itemId) : undefined;
  const cartRecs = sheet?.type === "cart" ? recsFor(undefined) : [];

  return (
    <div className="min-h-dvh bg-cream">
      {!ready && data === null && link !== "connecting" && (
        <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-2">
          <p className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-lift">
            <WifiOff className="h-4 w-4 text-orange" /> Reconnecting to Deluj — you can keep browsing
          </p>
        </div>
      )}

      {view === "tracking" && latestOrder ? (
        <TrackingView
          order={latestOrder}
          others={myOrders.slice(0, -1).reverse()}
          now={now}
          link={link}
          onBack={() => setView("menu")}
          onService={() => setSheet({ type: "service" })}
          onRequestBill={() => void sendRequest("bill")}
          billState={billState}
        />
      ) : (
        <MenuView
          tableCode={tableCode}
          menu={menu}
          link={link}
          activeOrder={activeOrder}
          now={now}
          onOpenItem={openItem}
          onQuickAdd={quickAdd}
          onOpenService={() => setSheet({ type: "service" })}
          onTrack={() => {
            setView("tracking");
            window.scrollTo({ top: 0 });
          }}
          cartCount={cartCount}
        />
      )}

      {/* Floating cart bar */}
      <AnimatePresence>
        {view === "menu" && cartCount > 0 && !sheet && (
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-4"
          >
            <button
              onClick={() => setSheet({ type: "cart" })}
              className="mx-auto flex h-16 w-full max-w-md items-center justify-between rounded-full bg-ink pl-3 pr-6 text-cream shadow-lift transition active:scale-[0.98]"
              data-testid="cart-bar"
            >
              <span className="flex items-center gap-3">
                <motion.span
                  key={cartCount}
                  initial={{ scale: 1.35 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="relative grid h-11 w-11 place-items-center rounded-full bg-orange"
                >
                  <ShoppingBag className="h-5 w-5 text-white" />
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-powder px-1 text-[11px] font-bold text-ink">{cartCount}</span>
                </motion.span>
                <span className="font-display text-[17px] font-bold">View order</span>
              </span>
              <span className="tabular text-[17px] font-bold">{formatEGP(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets */}
      <Sheet open={sheet?.type === "item" && !!sheetItem} onClose={() => setSheet(null)} label={sheetItem?.name ?? "Item"} tall>
        {sheet?.type === "item" && sheetItem && (
          <ItemSheetBody
            key={`${sheetItem.id}-${sheet.nonce}`}
            item={sheetItem}
            onAdd={(input) => guest.addToCart(input)}
            recommendationsFor={(anchor) => recsFor(anchor, [anchor])}
            onQuickAdd={quickAdd}
            onOpenItem={openItem}
            onViewCart={() => setSheet({ type: "cart" })}
            onClose={() => setSheet(null)}
            cartSummary={{ count: cartCount, total: cartTotal }}
          />
        )}
      </Sheet>

      <Sheet open={sheet?.type === "cart"} onClose={() => setSheet(null)} label="Your order" tall={guest.cart.length > 2}>
        <CartSheetBody
          lines={guest.cart}
          menuById={menuById}
          tableLabel={table}
          recommendations={cartRecs}
          onQuantity={guest.setQuantity}
          onNote={guest.setLineNote}
          onQuickAdd={quickAdd}
          onOpenItem={openItem}
          onCheckout={() => {
            setCheckoutPhase("choose");
            setCheckoutError(null);
            setSheet({ type: "checkout" });
          }}
          onClose={() => setSheet(null)}
          canCheckout={ready}
        />
      </Sheet>

      <Sheet open={sheet?.type === "checkout"} onClose={() => checkoutPhase !== "processing" && setSheet(null)} label="Checkout" hideClose={checkoutPhase === "processing"}>
        <CheckoutSheetBody total={cartTotal} count={cartCount} tableLabel={table} onPay={(m) => void placeOrder(m)} phase={checkoutPhase} error={checkoutError} />
      </Sheet>

      <Sheet open={sheet?.type === "service"} onClose={() => setSheet(null)} label="Need anything?">
        <ServiceSheetBody tableLabel={table} requests={tableRequests} pending={pendingRequest} now={now} onRequest={(k) => void sendRequest(k)} />
      </Sheet>
    </div>
  );
}
