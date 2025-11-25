// app/receipts/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number; // MUST exist in your API
}

interface ReceiptItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState({
    supplierName: "",
    warehouseId: "",
    notes: "",
  });

  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { productId: 0, productName: "", quantity: 1, price: 0, total: 0 },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("bearer_token") ?? "";

        const [whRes, prodRes] = await Promise.all([
          fetch("/api/warehouses", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch("/api/products", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);

        if (whRes.ok) setWarehouses(await whRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
      } catch (err) {
        toast.error("Failed to load data");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const rand = Math.floor(Math.random() * 9000) + 1000;
    setReceiptNumber(`RCPT-${date}-${time}-${rand}`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // MAIN LOGIC FIXED HERE
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setReceiptItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "productId") {
        const productId = Number(value);
        const product = products.find((p) => p.id === productId);

        item.productId = productId;
        item.productName = product ? product.name : "";
        item.price = product ? Number(product.price) : 0;
        item.total = item.quantity * item.price;
      }

      if (field === "quantity") {
        const qty = Number(value);
        item.quantity = qty;
        item.total = qty * item.price;
      }

      if (field === "price") {
        const p = Number(value);
        item.price = isNaN(p) ? 0 : p;
        item.total = item.quantity * item.price;
      }

      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setReceiptItems((prev) => [...prev, { productId: 0, productName: "", quantity: 1, price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setReceiptItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptNumber) {
      toast.error("Receipt number not generated");
      return;
    }

    if (!formData.warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    const itemsToSend = receiptItems
      .filter((it) => it.productId > 0 && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.price,
        total: it.total,
      }));

    if (itemsToSend.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token") ?? "";

      const payload = {
        receiptNumber,
        warehouseId: Number(formData.warehouseId),
        supplierName: formData.supplierName,
        status: "draft",
        notes: formData.notes,
        items: itemsToSend,
      };

      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create receipt");

      toast.success("Receipt created successfully");
      router.push("/receipts");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/receipts">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold">New Receipt</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Receipt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div>
              <Label>Receipt Number</Label>
              <Input value={receiptNumber} readOnly />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Supplier Name</Label>
                <Input
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>Warehouse</Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(val) => handleSelectChange("warehouseId", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea name="notes" value={formData.notes} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>

        {/* ITEMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Receipt Items
              <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {receiptItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">

                <div className="md:col-span-2">
                  <Label>Product</Label>
                  <Select
                    value={item.productId ? item.productId.toString() : ""}
                    onValueChange={(val) => handleItemChange(index, "productId", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, "price", Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label>Total</Label>
                  <Input value={item.total.toFixed(2)} readOnly />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={receiptItems.length === 1}
                    aria-label="Remove item"
                  >
                    ×
                  </Button>
                </div>

              </div>
            ))}

          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
