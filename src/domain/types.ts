// Core domain types shared by the customer app, the kitchen display, the owner
// command center and every backend adapter. Nothing in src/domain may import from
// React, Next.js or a database client: it must run in the browser and on the server.

export type CategoryId =
  | "breakfast"
  | "sandwiches"
  | "focaccia"
  | "salads"
  | "pancakes"
  | "coffee"
  | "iced"
  | "matcha"
  | "refreshers"
  | "beyond"
  | "essentials";

export type CourseKind = "food" | "drink";

export interface Category {
  id: CategoryId;
  /** Short label for the sticky category rail. */
  label: string;
  /** Section title as printed on the Deluj menu. */
  title: string;
  course: CourseKind;
}

export interface ModifierOption {
  id: string;
  label: string;
  /** Price in whole EGP. 0 for free preferences. */
  price: number;
}

export interface ModifierGroup {
  id: string;
  label: string;
  /** single = choose one (radio), multi = toggle any. */
  type: "single" | "multi";
  options: ModifierOption[];
  /** For single groups: the option selected by default. */
  defaultOptionId?: string;
  hint?: string;
}

export type ArtKind =
  | "hot-cup"
  | "espresso"
  | "iced-cup"
  | "matcha"
  | "mojito"
  | "teapot"
  | "bottle"
  | "eggs"
  | "benedict"
  | "bagel"
  | "sandwich"
  | "focaccia"
  | "salad"
  | "pancakes";

export type ArtTone = "orange" | "powder" | "cream" | "peach" | "ink";

export interface ArtSpec {
  kind: ArtKind;
  tone: ArtTone;
  /** Optional accent fill (drink colour, topping) drawn behind the line art. */
  accent?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  /** Verbatim from the Deluj menu where the menu prints one. */
  description?: string;
  /** Whole EGP. */
  price: number;
  category: CategoryId;
  available: boolean;
  featured: boolean;
  sort: number;
  tags: string[];
  modifierGroupIds: string[];
  art: ArtSpec;
  updatedAt: string;
}

export type MenuItemPatch = Partial<Pick<MenuItem, "available" | "price" | "featured" | "category">>;

// ---------------------------------------------------------------------------
// Orders

export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
export type OrderChannel = "dine_in" | "pickup" | "delivery";
/** How the order reached Deluj. Everything except marketplace is a direct order. */
export type OrderVia = "qr" | "app" | "counter" | "marketplace";
export type PaymentMethod = "card" | "apple_pay" | "cash";
export type PaymentStatus = "paid" | "pay_at_table" | "paid_marketplace";

export interface OrderLineModifier {
  groupId: string;
  groupLabel: string;
  optionId: string;
  label: string;
  price: number;
}

export interface OrderLine {
  lineId: string;
  itemId: string;
  name: string;
  category: CategoryId;
  quantity: number;
  unitPrice: number;
  modifiers: OrderLineModifier[];
  note?: string;
  /** (unitPrice + modifiers) * quantity */
  lineTotal: number;
}

export interface Order {
  id: string;
  number: number;
  tableCode: string | null;
  channel: OrderChannel;
  via: OrderVia;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName?: string;
  /** Whether the guest has ordered before (demo customer model). */
  returning: boolean;
  note?: string;
  /** seed = generated demo history; live = placed during the demo. */
  source: "seed" | "live";
  clientRequestId?: string;
  createdAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  servedAt?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Guest service requests

export type ServiceKind = "waiter" | "bill" | "water" | "napkins" | "cutlery" | "sauce";
export type ServiceStatus = "open" | "acknowledged" | "done";

export interface ServiceRequest {
  id: string;
  tableCode: string;
  kind: ServiceKind;
  status: ServiceStatus;
  source: "seed" | "live";
  clientRequestId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Live activity feed ("Live at Deluj")

export type ActivityKind =
  | "order_placed"
  | "order_status"
  | "request_created"
  | "request_status"
  | "menu_updated"
  | "table_opened";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  amount?: number;
  tableCode?: string;
  refId?: string;
  createdAt: string;
}

export interface TableSession {
  tableCode: string;
  openedAt: string;
}

export interface DemoMeta {
  /** Bumped on every reset so every screen reloads its snapshot. */
  resetVersion: number;
  /** Cairo calendar date (YYYY-MM-DD) the seeded day belongs to. */
  businessDate: string;
  seededAt: string;
  lastOrderNumber: number;
}

export interface DemoState {
  menu: MenuItem[];
  orders: Order[];
  requests: ServiceRequest[];
  activity: ActivityEvent[];
  sessions: TableSession[];
  meta: DemoMeta;
}

// ---------------------------------------------------------------------------
// Commands (the only way state changes, on every backend)

export interface CartLineInput {
  itemId: string;
  quantity: number;
  /** groupId -> selected option ids */
  selections: Record<string, string[]>;
  note?: string;
}

export type Command =
  | {
      type: "placeOrder";
      tableCode: string;
      lines: CartLineInput[];
      paymentMethod: PaymentMethod;
      clientRequestId: string;
      note?: string;
    }
  | { type: "setOrderStatus"; orderId: string; status: OrderStatus }
  | { type: "createRequest"; tableCode: string; kind: ServiceKind; clientRequestId: string }
  | { type: "setRequestStatus"; requestId: string; status: ServiceStatus }
  | { type: "updateMenuItem"; itemId: string; patch: MenuItemPatch }
  | { type: "openTable"; tableCode: string }
  | { type: "reset" };

export type CommandResult =
  | { ok: true; order?: Order; request?: ServiceRequest; item?: MenuItem; duplicate?: boolean }
  | { ok: false; code: DomainErrorCode; message: string };

export type DomainErrorCode =
  | "invalid_table"
  | "empty_cart"
  | "unknown_item"
  | "sold_out"
  | "invalid_modifier"
  | "invalid_quantity"
  | "not_found"
  | "invalid_transition"
  | "rate_limited"
  | "invalid_patch";

/** A row-level change, the unit every realtime transport delivers. */
export type Change =
  | { table: "orders"; op: "upsert"; row: Order }
  | { table: "requests"; op: "upsert"; row: ServiceRequest }
  | { table: "menu"; op: "upsert"; row: MenuItem }
  | { table: "activity"; op: "upsert"; row: ActivityEvent }
  | { table: "sessions"; op: "upsert"; row: TableSession }
  | { table: "meta"; op: "upsert"; row: DemoMeta };
