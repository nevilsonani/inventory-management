"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { actions } from "@/lib/store";

/** Add a customer or a supplier. The two share most fields. */
export function ContactDialog({ kind, onClose }: { kind: "customer" | "supplier"; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    gstin: "",
    paymentTermsDays: "30",
    leadTimeDays: "7",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: event.target.value });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const shared = {
      name: form.name,
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
    };
    const result =
      kind === "customer"
        ? actions.createCustomer({
            ...shared,
            gstin: form.gstin.trim().toUpperCase(),
            paymentTermsDays: Number(form.paymentTermsDays),
          })
        : actions.createSupplier({ ...shared, leadTimeDays: Math.max(0, Math.round(Number(form.leadTimeDays) || 0)) });
    if (!result.ok) return setError(result.error);
    onClose();
    toast.success(`${form.name.trim()} added`);
  }

  const noun = kind === "customer" ? "customer" : "supplier";

  return (
    <Dialog
      title={`Add ${noun}`}
      description={kind === "customer" ? "Customers can be billed on sales orders." : "Suppliers can receive purchase orders."}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="contact-form">
            Add {noun}
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business name" className="sm:col-span-2">
          <Input value={form.name} onChange={set("name")} required data-autofocus />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactName} onChange={set("contactName")} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={set("city")} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+91" />
        </Field>
        {kind === "customer" ? (
          <>
            <Field label="GSTIN">
              <Input value={form.gstin} onChange={set("gstin")} className="font-mono uppercase" maxLength={15} />
            </Field>
            <Field label="Payment terms">
              <Select value={form.paymentTermsDays} onChange={set("paymentTermsDays")}>
                {[0, 15, 30, 45, 60].map((days) => (
                  <option key={days} value={days}>
                    {days === 0 ? "Due on receipt" : `Net ${days} days`}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Usual lead time (days)" hint="Sets the default expected date on new purchase orders.">
            <Input type="number" min={0} step={1} value={form.leadTimeDays} onChange={set("leadTimeDays")} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Dialog>
  );
}
