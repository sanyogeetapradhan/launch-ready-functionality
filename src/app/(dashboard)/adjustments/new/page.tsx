"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [adjustmentNumber, setAdjustmentNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [productSku, setProductSku] = useState<string>("");
  const [countedQuantity, setCountedQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;

    fetch('/api/warehouses?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (Array.isArray(data)) {
          setWarehouses(data.map((w: any) => ({ id: w.id, name: w.name })));
          if (data.length > 0) setWarehouseId(String(data[0].id));
        }
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/adjustments/next-number')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (data && data.next) setAdjustmentNumber(data.next);
      })
      .catch(() => {
        const fallback = `ADJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        setAdjustmentNumber(fallback);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        toast.error('You must be logged in to create an adjustment');
        return;
      }

      if (!adjustmentNumber || !warehouseId || !productSku || !countedQuantity) {
        toast.error('Please fill required fields');
        return;
      }

      // Resolve SKU -> productId
      const prodRes = await fetch(`/api/products?search=${encodeURIComponent(productSku)}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!prodRes.ok) {
        toast.error('Failed to lookup product SKU');
        return;
      }

      const prodData = await prodRes.json();
      const match = Array.isArray(prodData)
        ? prodData.find((p: any) => String(p.sku).toLowerCase() === productSku.trim().toLowerCase())
        : null;

      if (!match) {
        toast.error(`Product with SKU "${productSku}" not found`);
        return;
      }

      const body = {
        adjustmentNumber: adjustmentNumber.trim(),
        warehouseId: parseInt(warehouseId),
        productId: parseInt(match.id),
        countedQuantity: parseInt(countedQuantity),
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Create failed: ${res.status}`);
      }

      toast.success('Adjustment created');
      router.push('/adjustments');
    } catch (err) {
      console.error('Create adjustment error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Adjustment</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Adjustment Number</label>
          <Input value={adjustmentNumber} onChange={(e) => setAdjustmentNumber(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Warehouse</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product SKU</label>
          <Input value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="Enter product SKU" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Counted Quantity</label>
          <Input value={countedQuantity} onChange={(e) => setCountedQuantity(e.target.value)} placeholder="e.g. 10" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Adjustment'}</Button>
          <Button variant="outline" onClick={() => router.push('/adjustments')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
