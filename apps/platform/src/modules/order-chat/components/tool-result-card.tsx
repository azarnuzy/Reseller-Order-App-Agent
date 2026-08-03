import type { UIMessagePart } from "@anvia/react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  LoaderCircleIcon,
  MinusIcon,
  PackageCheckIcon,
  PackageIcon,
  PlusIcon,
  ShoppingBagIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";
import type {
  ConfirmedOrder,
  Draft,
  DraftLine,
  OrderSummary,
  Product,
  ToolEnvelope,
  ToolErrorResult,
  Totals,
} from "../order-chat-types";

type ToolPart = Extract<UIMessagePart, { type: "tool" }>;

type ToolResultCardProps = {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  part: ToolPart;
};

export function ToolResultCard({ disabled, onQueueMessage, part }: ToolResultCardProps) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return <ToolActivity toolName={part.toolName} />;
  }

  if (part.state === "error") {
    return (
      <ToolErrorCard
        error={{
          code: "TOOL_ERROR",
          message: part.error?.message ?? "The assistant could not complete this step.",
          retryable: true,
        }}
      />
    );
  }

  const result = readToolEnvelope(part.output);
  if (!result) {
    return <ToolActivity complete toolName={part.toolName} />;
  }

  if (!result.ok) {
    return <ToolErrorCard error={result.error} />;
  }

  const data = result.data;

  if (["searchProducts", "recommendProducts", "getTopProducts"].includes(part.toolName)) {
    const products = getProducts(data);
    return products ? (
      <ProductListCard
        disabled={disabled}
        onQueueMessage={onQueueMessage}
        products={products}
        title={productListTitle(part.toolName)}
      />
    ) : null;
  }

  if (part.toolName === "getProductDetail" && isProduct(data)) {
    return (
      <ProductDetailCard disabled={disabled} onQueueMessage={onQueueMessage} product={data} />
    );
  }

  if (part.toolName === "checkProductAvailability" && isAvailability(data)) {
    return <AvailabilityCard availability={data} />;
  }

  if (
    [
      "getActiveDraft",
      "addDraftItem",
      "updateDraftItem",
      "removeDraftItem",
      "saveCustomerData",
      "cancelDraft",
    ].includes(part.toolName)
  ) {
    if (data === null && part.toolName === "getActiveDraft") {
      return <EmptyDraftCard />;
    }

    if (isDraft(data)) {
      return (
        <DraftCard
          disabled={disabled}
          draft={data}
          onQueueMessage={onQueueMessage}
        />
      );
    }
  }

  if (part.toolName === "validateDraft" && isDraftValidation(data)) {
    return (
      <DraftValidationCard
        disabled={disabled}
        onQueueMessage={onQueueMessage}
        validation={data}
      />
    );
  }

  if (part.toolName === "getOrderSummary" && isOrderSummary(data)) {
    return (
      <ConfirmationSummaryCard
        disabled={disabled}
        onQueueMessage={onQueueMessage}
        summary={data}
      />
    );
  }

  const order = getConfirmedOrder(data);
  if (["confirmOrder", "getOrder"].includes(part.toolName) && order) {
    return <ConfirmedOrderCard order={order} />;
  }

  return <ToolActivity complete toolName={part.toolName} />;
}

function ProductListCard({
  disabled,
  onQueueMessage,
  products,
  title,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  products: Product[];
  title: string;
}) {
  if (products.length === 0) {
    return (
      <section className="order-tool-card order-empty-card">
        <ShoppingBagIcon className="size-5" />
        <div>
          <p className="font-semibold">No matching products</p>
          <p className="text-sm text-slate-500">Try another name, category, or price range.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="order-tool-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="text-sm text-slate-500">{products.length} trusted catalog results</p>
        </div>
        <Badge variant="secondary">Live stock</Badge>
      </header>
      <div className="order-product-scroller">
        {products.map((product) => (
          <ProductTile
            disabled={disabled}
            key={product.id}
            onQueueMessage={onQueueMessage}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}

function ProductTile({
  disabled,
  onQueueMessage,
  product,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  product: Product;
}) {
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity);
  const canOrder = product.isOrderable && product.stock >= product.minimumOrderQuantity;

  return (
    <article className="order-product-tile">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          alt={product.title}
          className="size-full object-contain p-5"
          loading="lazy"
          src={product.thumbnail}
        />
        {product.discountPercentage > 0 ? (
          <Badge className="absolute right-3 top-3 bg-white text-blue-600 shadow-sm hover:bg-white">
            -{formatPercent(product.discountPercentage)}
          </Badge>
        ) : null}
      </div>
      <div className="grid flex-1 gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-950" title={product.title}>
            {product.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">{product.sku}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            {product.discountPercentage > 0 ? (
              <p className="text-xs text-slate-400 line-through">{money(product.price)}</p>
            ) : null}
            <p className="text-lg font-bold text-blue-600">{money(product.discountedPrice)}</p>
          </div>
          <Badge className={canOrder ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
            {canOrder ? `Stock ${product.stock}` : "Unavailable"}
          </Badge>
        </div>
        <QuantityControl
          disabled={disabled || !canOrder}
          max={product.stock}
          min={product.minimumOrderQuantity}
          onChange={setQuantity}
          value={quantity}
        />
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
          disabled={disabled || !canOrder}
          onClick={() =>
            onQueueMessage(
              `Add exactly ${quantity} units of "${product.title}" (SKU ${product.sku}) to my order.`,
            )
          }
          type="button"
        >
          <ShoppingBagIcon className="size-4" />
          Choose {quantity}
        </Button>
        <p className="text-center text-xs leading-5 text-slate-500">
          Minimum order {product.minimumOrderQuantity}. The message will be prepared for review.
        </p>
      </div>
    </article>
  );
}

function ProductDetailCard({
  disabled,
  onQueueMessage,
  product,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  product: Product;
}) {
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity);
  const canOrder = product.isOrderable && product.stock >= product.minimumOrderQuantity;

  return (
    <section className="order-tool-card grid overflow-hidden sm:grid-cols-[13rem_1fr]">
      <div className="bg-slate-100 p-5">
        <img alt={product.title} className="size-full object-contain" src={product.thumbnail} />
      </div>
      <div className="grid gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
            {product.category.replaceAll("-", " ")}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">{product.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{product.sku}</p>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-slate-600">{product.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xl font-bold text-blue-600">{money(product.discountedPrice)}</span>
          <Badge variant="secondary">MOQ {product.minimumOrderQuantity}</Badge>
          <Badge variant="secondary">Stock {product.stock}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
          <QuantityControl
            disabled={disabled || !canOrder}
            max={product.stock}
            min={product.minimumOrderQuantity}
            onChange={setQuantity}
            value={quantity}
          />
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={disabled || !canOrder}
            onClick={() =>
              onQueueMessage(
                `Add exactly ${quantity} units of "${product.title}" (SKU ${product.sku}) to my order.`,
              )
            }
            type="button"
          >
            Add to order
          </Button>
        </div>
      </div>
    </section>
  );
}

function QuantityControl({
  disabled,
  max,
  min,
  onChange,
  value,
}: {
  disabled: boolean;
  max: number;
  min: number;
  onChange: (quantity: number) => void;
  value: number;
}) {
  return (
    <div className="grid h-10 grid-cols-[2.5rem_1fr_2.5rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <button
        aria-label="Decrease quantity"
        className="grid place-items-center text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        type="button"
      >
        <MinusIcon className="size-4" />
      </button>
      <span className="grid place-items-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        aria-label="Increase quantity"
        className="grid place-items-center text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        type="button"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

function AvailabilityCard({ availability }: { availability: Availability }) {
  const available = availability.status === "AVAILABLE";
  return (
    <section className={`order-tool-card order-status-card ${available ? "is-success" : "is-warning"}`}>
      {available ? <CheckCircle2Icon className="size-5" /> : <AlertCircleIcon className="size-5" />}
      <div>
        <p className="font-semibold">{availabilityLabel(availability.status)}</p>
        <p className="text-sm opacity-75">
          Stock {availability.stock} · Minimum order {availability.minimumOrderQuantity}
        </p>
      </div>
    </section>
  );
}

function DraftCard({
  disabled,
  draft,
  onQueueMessage,
}: {
  disabled: boolean;
  draft: Draft;
  onQueueMessage: (message: string) => void;
}) {
  if (draft.status === "CANCELLED") {
    return (
      <section className="order-tool-card order-empty-card">
        <PackageIcon className="size-5" />
        <div>
          <p className="font-semibold">Draft cancelled</p>
          <p className="text-sm text-slate-500">You can start another order at any time.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="order-tool-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Order draft</h3>
          <p className="text-sm text-slate-500">
            Version {draft.version} · {draft.items.length} product{draft.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge className="bg-blue-50 text-blue-700">Active draft</Badge>
      </header>
      <div className="mt-5 grid gap-5">
        {draft.items.map((item) => (
          <DraftLineCard
            disabled={disabled}
            item={item}
            key={item.id}
            onQueueMessage={onQueueMessage}
          />
        ))}
      </div>
      {draft.items.length ? <TotalsTable totals={draft.totals} /> : null}
      {draft.items.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={disabled}
            onClick={() =>
              onQueueMessage(
                hasMissingCustomer(draft)
                  ? "Continue my order and help me add the recipient and shipping information."
                  : "Validate my current draft and prepare the final order summary.",
              )
            }
            type="button"
          >
            Continue order <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            disabled={disabled}
            onClick={() => onQueueMessage("Cancel my current order draft.")}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      ) : null}
      <ComposerQueueHint />
    </section>
  );
}

function DraftLineCard({
  disabled,
  item,
  onQueueMessage,
}: {
  disabled: boolean;
  item: DraftLine;
  onQueueMessage: (message: string) => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);

  return (
    <article className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
          {item.thumbnail ? (
            <img alt={item.productTitle} className="size-full object-contain p-2" src={item.thumbnail} />
          ) : (
            <PackageIcon className="size-6 text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{item.productTitle}</p>
          <p className="truncate text-sm text-slate-500">{item.sku}</p>
          <p className="mt-1 font-bold text-blue-600">{money(item.lineTotal)}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:w-44">
        <QuantityControl
          disabled={disabled}
          max={Number.MAX_SAFE_INTEGER}
          min={item.minimumOrderQuantity}
          onChange={setQuantity}
          value={quantity}
        />
        <div className="flex justify-end gap-2">
          {quantity !== item.quantity ? (
            <button
              className="text-sm font-medium text-blue-600 hover:underline"
              disabled={disabled}
              onClick={() =>
                onQueueMessage(
                  `Change "${item.productTitle}" (SKU ${item.sku}) to exactly ${quantity} units.`,
                )
              }
              type="button"
            >
              Apply
            </button>
          ) : null}
          <button
            className="inline-flex items-center gap-1 text-sm text-red-500 hover:underline"
            disabled={disabled}
            onClick={() =>
              onQueueMessage(`Remove "${item.productTitle}" (SKU ${item.sku}) from my order.`)
            }
            type="button"
          >
            <Trash2Icon className="size-4" /> Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function CustomerForm({
  disabled,
  onQueueMessage,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const complete = name.trim() && whatsapp.trim() && address.trim().length >= 10;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600">
          <UserRoundIcon className="size-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-950">Recipient information</h3>
          <p className="text-sm text-slate-500">For delivery and order confirmation</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField label="Recipient name" required>
          <Input
            autoComplete="name"
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </FormField>
        <FormField label="WhatsApp number" required>
          <Input
            autoComplete="tel"
            disabled={disabled}
            inputMode="tel"
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="+628123456789"
            value={whatsapp}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Shipping address" required>
            <Textarea
              autoComplete="street-address"
              disabled={disabled}
              onChange={(event) => setAddress(event.target.value)}
              rows={3}
              value={address}
            />
          </FormField>
        </div>
        <FormField label="Email (optional)">
          <Input
            autoComplete="email"
            disabled={disabled}
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </FormField>
        <FormField label="Note (optional)">
          <Input disabled={disabled} onChange={(event) => setNote(event.target.value)} value={note} />
        </FormField>
      </div>
      <Button
        className="mt-5 w-full bg-blue-600 text-white hover:bg-blue-700"
        disabled={disabled || !complete}
        onClick={() =>
          onQueueMessage(
            [
              "Save this recipient information for my current order:",
              `Name: ${name.trim()}`,
              `WhatsApp: ${whatsapp.trim()}`,
              `Address: ${address.trim()}`,
              email.trim() ? `Email: ${email.trim()}` : "",
              note.trim() ? `Note: ${note.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          )
        }
        type="button"
      >
        <CheckCircle2Icon className="size-4" /> Review recipient data
      </Button>
      <ComposerQueueHint />
    </div>
  );
}

function FormField({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function DraftValidationCard({
  disabled,
  onQueueMessage,
  validation,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  validation: DraftValidation;
}) {
  if (validation.valid) {
    return (
      <section className="order-tool-card order-status-card is-success">
        <CheckCircle2Icon className="size-5" />
        <div className="flex-1">
          <p className="font-semibold">Draft verified</p>
          <p className="text-sm opacity-75">Prices, quantities, stock, and recipient data are valid.</p>
        </div>
        <Button
          disabled={disabled}
          onClick={() => onQueueMessage("Prepare the final authoritative summary for my order.")}
          size="sm"
          type="button"
        >
          Review summary
        </Button>
      </section>
    );
  }

  const customerFields = ["name", "whatsapp", "address", "customer"];
  const customerIssues = validation.issues.filter((issue) =>
    customerFields.some(
      (field) => issue.field === field || issue.code.toLowerCase().includes(field),
    ),
  );
  const otherIssues = validation.issues.filter((issue) => !customerIssues.includes(issue));

  if (customerIssues.length > 0 && otherIssues.length === 0) {
    return (
      <section className="order-tool-card p-5 sm:p-6">
        <CustomerForm disabled={disabled} onQueueMessage={onQueueMessage} />
      </section>
    );
  }

  return (
    <section className="order-tool-card p-5">
      <div className="flex gap-3 text-amber-800">
        <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Your draft needs attention</p>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm">
            {otherIssues.map((issue) => (
              <li key={`${issue.code}-${issue.itemId ?? issue.field ?? issue.message}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {customerIssues.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <CustomerForm disabled={disabled} onQueueMessage={onQueueMessage} />
        </div>
      ) : null}
    </section>
  );
}

function ConfirmationSummaryCard({
  disabled,
  onQueueMessage,
  summary,
}: {
  disabled: boolean;
  onQueueMessage: (message: string) => void;
  summary: OrderSummary;
}) {
  return (
    <section className="order-tool-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
            Final review
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Confirm your order</h3>
          <p className="text-sm text-slate-500">Authoritative draft version {summary.draftVersion}</p>
        </div>
        <Badge className="bg-blue-50 text-blue-700">Ready to confirm</Badge>
      </header>
      <div className="mt-5 grid gap-3">
        {summary.items.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.id}>
            <span className="min-w-0 truncate text-slate-700">
              {item.productTitle} × {item.quantity}
            </span>
            <span className="shrink-0 font-semibold text-slate-950">{money(item.lineTotal)}</span>
          </div>
        ))}
      </div>
      <TotalsTable totals={summary.totals} />
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{summary.customer.name}</p>
        <p>{summary.customer.whatsapp}</p>
        <p className="mt-1 leading-5">{summary.customer.address}</p>
      </div>
      <Button
        className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={disabled}
        onClick={() =>
          onQueueMessage(
            `I explicitly confirm order draft version ${summary.draftVersion}. Yes, place this exact order now.`,
          )
        }
        type="button"
      >
        <CheckCircle2Icon className="size-4" /> Confirm order
      </Button>
      <ComposerQueueHint />
    </section>
  );
}

function ConfirmedOrderCard({ order }: { order: ConfirmedOrder }) {
  return (
    <section className="order-tool-card overflow-hidden">
      <header className="grid place-items-center bg-emerald-50 px-5 py-7 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-emerald-600 text-white">
          <PackageCheckIcon className="size-7" />
        </span>
        <h3 className="mt-3 text-xl font-bold text-emerald-700">Order successfully placed</h3>
        <p className="text-sm text-slate-500">We received your confirmed order.</p>
      </header>
      <dl className="grid gap-4 p-5 sm:p-6">
        <OrderFact label="Order number" value={order.orderNumber} valueClass="text-blue-600" />
        <OrderFact label="Status" value="CONFIRMED" valueClass="text-emerald-600" />
        <OrderFact label="Total" value={money(order.totals.total, order.totals.currency)} />
        <OrderFact label="Customer" value={order.customer.name} />
      </dl>
    </section>
  );
}

function OrderFact({
  label,
  value,
  valueClass = "text-slate-950",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`text-right text-sm font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

function TotalsTable({ totals }: { totals: Totals }) {
  return (
    <dl className="mt-5 grid gap-2 border-t border-slate-200 pt-4 text-sm">
      <TotalLine label="Subtotal" value={money(totals.subtotal, totals.currency)} />
      <TotalLine
        label="Discount"
        value={`−${money(totals.discountTotal, totals.currency)}`}
        valueClass="text-emerald-600"
      />
      <TotalLine
        label="Order total"
        strong
        value={money(totals.total, totals.currency)}
        valueClass="text-blue-600"
      />
    </dl>
  );
}

function TotalLine({
  label,
  strong = false,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  strong?: boolean;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "mt-1 text-base font-bold" : ""}`}>
      <dt className={strong ? "text-slate-950" : "text-slate-500"}>{label}</dt>
      <dd className={`${strong ? "text-lg" : ""} font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

function ToolActivity({ complete = false, toolName }: { complete?: boolean; toolName: string }) {
  return (
    <div className="order-tool-activity" role="status">
      {complete ? (
        <CheckCircle2Icon className="size-4 text-emerald-500" />
      ) : (
        <LoaderCircleIcon className="size-4 animate-spin text-blue-600" />
      )}
      <span>{complete ? completedToolLabel(toolName) : activeToolLabel(toolName)}</span>
    </div>
  );
}

function ToolErrorCard({ error }: { error: ToolErrorResult }) {
  return (
    <section className="order-tool-card order-status-card is-error" role="alert">
      <AlertCircleIcon className="size-5" />
      <div>
        <p className="font-semibold">{friendlyErrorTitle(error.code)}</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    </section>
  );
}

function EmptyDraftCard() {
  return (
    <section className="order-tool-card order-empty-card">
      <ShoppingBagIcon className="size-5" />
      <div>
        <p className="font-semibold">Your draft is empty</p>
        <p className="text-sm text-slate-500">Browse products to start an order.</p>
      </div>
    </section>
  );
}

function ComposerQueueHint() {
  return (
    <p className="mt-3 text-center text-xs text-slate-500">
      Your message is prepared in the composer—review it, then press send.
    </p>
  );
}

type Availability = {
  canFulfill: boolean;
  minimumOrderQuantity: number;
  productId: string;
  quantity: number | null;
  status: string;
  stock: number;
};

type DraftValidation = {
  issues: Array<{ code: string; field?: string; itemId?: string; message: string }>;
  valid: boolean;
  version: number;
};

function readToolEnvelope(value: unknown): ToolEnvelope | undefined {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }

  if (!isRecord(parsed) || typeof parsed.ok !== "boolean") {
    return undefined;
  }

  if (parsed.ok === true && "data" in parsed) {
    return { data: parsed.data, ok: true };
  }

  if (parsed.ok === false && isToolError(parsed.error)) {
    return { error: parsed.error, ok: false };
  }

  return undefined;
}

function getProducts(value: unknown): Product[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.products)) {
    return undefined;
  }

  const products = value.products.map((item) =>
    isRecord(item) && isProduct(item.product) ? item.product : item,
  );
  return products.every(isProduct) ? products : undefined;
}

function getConfirmedOrder(value: unknown): ConfirmedOrder | undefined {
  if (isConfirmedOrder(value)) {
    return value;
  }

  return isRecord(value) && isConfirmedOrder(value.order) ? value.order : undefined;
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.sku === "string" &&
    typeof value.thumbnail === "string" &&
    typeof value.discountedPrice === "number" &&
    typeof value.minimumOrderQuantity === "number" &&
    typeof value.stock === "number"
  );
}

function isDraft(value: unknown): value is Draft {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.version === "number" &&
    Array.isArray(value.items) &&
    isTotals(value.totals) &&
    isRecord(value.customer)
  );
}

function isOrderSummary(value: unknown): value is OrderSummary {
  return (
    isRecord(value) &&
    typeof value.draftVersion === "number" &&
    Array.isArray(value.items) &&
    isTotals(value.totals) &&
    isRecord(value.customer)
  );
}

function isConfirmedOrder(value: unknown): value is ConfirmedOrder {
  return (
    isRecord(value) &&
    typeof value.orderNumber === "string" &&
    value.status === "CONFIRMED" &&
    Array.isArray(value.items) &&
    isTotals(value.totals) &&
    isRecord(value.customer)
  );
}

function isTotals(value: unknown): value is Totals {
  return (
    isRecord(value) &&
    typeof value.currency === "string" &&
    typeof value.discountTotal === "number" &&
    typeof value.subtotal === "number" &&
    typeof value.total === "number"
  );
}

function isAvailability(value: unknown): value is Availability {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    typeof value.stock === "number" &&
    typeof value.minimumOrderQuantity === "number"
  );
}

function isDraftValidation(value: unknown): value is DraftValidation {
  return (
    isRecord(value) &&
    typeof value.valid === "boolean" &&
    typeof value.version === "number" &&
    Array.isArray(value.issues)
  );
}

function isToolError(value: unknown): value is ToolErrorResult {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasMissingCustomer(draft: Draft) {
  return !draft.customer.name || !draft.customer.whatsapp || !draft.customer.address;
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "")}%`;
}

function productListTitle(toolName: string) {
  if (toolName === "recommendProducts") return "Recommended products";
  if (toolName === "getTopProducts") return "Popular products";
  return "Available products";
}

function availabilityLabel(status: string) {
  return (
    {
      AVAILABLE: "Quantity available",
      BELOW_MINIMUM_ORDER: "Below minimum order",
      INSUFFICIENT_STOCK: "Not enough stock",
      OUT_OF_STOCK: "Currently out of stock",
      PRODUCT_NOT_ORDERABLE: "Product cannot be ordered",
    }[status] ?? "Availability checked"
  );
}

function activeToolLabel(toolName: string) {
  return (
    {
      addDraftItem: "Adding product to your draft…",
      cancelDraft: "Cancelling your draft…",
      checkProductAvailability: "Checking live stock and order rules…",
      confirmOrder: "Confirming your order securely…",
      getActiveDraft: "Loading your current draft…",
      getOrder: "Looking up your order…",
      getOrderSummary: "Preparing an authoritative summary…",
      getProductDetail: "Loading current product details…",
      getStoreProfile: "Checking store policies…",
      getTopProducts: "Finding popular products…",
      listCategories: "Loading product categories…",
      recommendProducts: "Finding suitable alternatives…",
      removeDraftItem: "Removing the product…",
      saveCustomerData: "Saving recipient information…",
      searchProducts: "Searching the live catalog…",
      updateDraftItem: "Updating the quantity…",
      validateDraft: "Verifying prices, stock, and recipient data…",
    }[toolName] ?? "Working on your request…"
  );
}

function completedToolLabel(toolName: string) {
  return activeToolLabel(toolName).replace("…", "").replace(/ing\b/, "ed");
}

function friendlyErrorTitle(code: string) {
  return (
    {
      CUSTOMER_DATA_INCOMPLETE: "Recipient information is incomplete",
      DRAFT_VERSION_CONFLICT: "Your draft changed",
      INSUFFICIENT_STOCK: "Not enough stock",
      MINIMUM_ORDER_NOT_MET: "Minimum order not met",
      PRODUCT_NOT_ORDERABLE: "Product cannot be ordered",
      PRODUCT_OUT_OF_STOCK: "Product is out of stock",
      TOOL_ERROR: "This step could not be completed",
    }[code] ?? "We couldn't complete this step"
  );
}
