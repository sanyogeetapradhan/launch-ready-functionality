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


interface Supplier {
  id: number;
  name: string;
}

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
  unitPrice: number;
  stockQty?: number;
  stockLoading?: boolean;
  stockError?: string;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string; sku: string; sellingPrice?: number }[]>([]);
  
  const [formData, setFormData] = useState({
    supplierName: "",
    warehouseId: "",
    notes: "",
  });

  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { productId: 0, productName: "", quantity: 1, unitPrice: 0, stockQty: undefined, stockLoading: false, stockError: undefined }
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
    setFormData(prev => ({ ...prev, [name]: value }));
    // If warehouse changes, refetch stock for all selected products
    if (name === 'warehouseId') {
      receiptItems.forEach(async (item, idx) => {
        if (item.productId > 0) {
          await handleItemChange(idx, 'productId', item.productId);
        }
      });
    }
  };

  const handleItemChange = async (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updatedItems = [...receiptItems];
    if (field === "productId") {
      const productId = Number(value);
      const product = products.find(p => p.id === productId);
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: productId,
        productName: product ? product.name : "",
        unitPrice: product && typeof product.sellingPrice === 'number' ? product.sellingPrice : 0,
        stockQty: undefined,
        stockLoading: true,
        stockError: undefined,
      };
      setReceiptItems(updatedItems);
      // Fetch stock for this product and selected warehouse
      try {
        const token = localStorage.getItem("bearer_token");
        const stockRes = await fetch(`/api/products/${productId}/stock`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          let qty = undefined;
          if (formData.warehouseId) {
            const whStock = stockData.find((s: any) => s.warehouseId === Number(formData.warehouseId));
            qty = whStock ? whStock.quantity : 0;
          } else {
            qty = Array.isArray(stockData) ? stockData.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) : 0;
          }
          updatedItems[index] = {
            ...updatedItems[index],
            stockQty: qty,
            stockLoading: false,
            stockError: undefined,
          };
        } else {
          updatedItems[index] = {
            ...updatedItems[index],
            stockQty: undefined,
            stockLoading: false,
            stockError: 'Failed to fetch stock',
          };
        }
      } catch (err) {
        updatedItems[index] = {
          ...updatedItems[index],
          stockQty: undefined,
          stockLoading: false,
          stockError: 'Failed to fetch stock',
        };
      }
      setReceiptItems([...updatedItems]);
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === "quantity" ? Number(value) : value
      };
      setReceiptItems(updatedItems);
    }
  };

  const addItem = () => {
    setReceiptItems([...receiptItems, { productId: 0, productName: "", quantity: 1, unitPrice: 0, stockQty: undefined, stockLoading: false, stockError: undefined }]);
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
          <CardContent>
            <div className="space-y-4">
              {receiptItems.map((item, index) => {
                const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 0);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`product-${index}`}>Product</Label>
                      <Select
                        value={item.productId.toString()}
                        onValueChange={(value) => handleItemChange(index, "productId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Qty</Label>
                      <div className="min-h-[38px] flex items-center">
                        {item.stockLoading ? (
                          <span className="text-xs text-muted-foreground">Loading…</span>
                        ) : item.stockError ? (
                          <span className="text-xs text-red-500">{item.stockError}</span>
                        ) : item.productId > 0 ? (
                          <span className="text-xs text-foreground">{typeof item.stockQty === 'number' ? item.stockQty : '-'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <div className="min-h-[38px] flex items-center">
                        <span className="text-xs text-foreground">{typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Line Total</Label>
                      <div className="min-h-[38px] flex items-center">
                        <span className="text-xs text-foreground">{!isNaN(lineTotal) ? lineTotal.toFixed(2) : '-'}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={receiptItems.length === 1}
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
                        {/* Total price summary */}
                        <div className="mt-4 flex justify-end">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total:</p>
                            <p className="text-lg font-semibold">{
                              receiptItems.reduce((sum, it) => sum + ((it.unitPrice ?? 0) * (it.quantity ?? 0)), 0).toFixed(2)
                            }</p>
                          </div>
                        </div>
            </div>
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
