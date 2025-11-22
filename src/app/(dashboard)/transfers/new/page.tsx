"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewTransferPage() {
  const router = useRouter();
  const [transferNumber, setTransferNumber] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState<string | undefined>(undefined);
  const [toWarehouseId, setToWarehouseId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);
  const [items, setItems] = useState<Array<{
    sku: string;
    quantity: string;
    productId?: number | null;
    availableFrom?: number | null;
    availableTo?: number | null;
    totalQty?: number | null;
    error?: string | null;
  }>>([
    { sku: '', quantity: '1', productId: null, availableFrom: null, availableTo: null, totalQty: null, error: null }
  ]);
  const [suggestions, setSuggestions] = useState<Array<Array<any>>>([]);
  const [postTransferStocks, setPostTransferStocks] = useState<Array<any>>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;

    fetch('/api/warehouses?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (Array.isArray(data)) {
          setWarehouses(data.map((w: any) => ({ id: w.id, name: w.name })));
          if (data.length > 0) {
            setFromWarehouseId(String(data[0].id));
            setToWarehouseId(String(data.length > 1 ? data[1].id : data[0].id));
          }
        }
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/transfers/next-number')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (data && data.next) setTransferNumber(data.next);
      })
      .catch(() => {
        const fallback = `TRF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        setTransferNumber(fallback);
      });
  }, []);

  // keep suggestions array in sync with items length
  useEffect(() => {
    setSuggestions((s) => {
      const copy = [...s];
      while (copy.length < items.length) copy.push([]);
      while (copy.length > items.length) copy.pop();
      return copy;
    });
  }, [items.length]);

  // update availability when warehouses change
  useEffect(() => {
    const refresh = async () => {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.productId) continue;
        try {
          const token = localStorage.getItem('bearer_token');
          const stockRes = await fetch(`/api/products/${it.productId}/stock`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!stockRes.ok) continue;
          const stockData = await stockRes.json();
          const fromId = fromWarehouseId ? parseInt(fromWarehouseId) : null;
          const toId = toWarehouseId ? parseInt(toWarehouseId) : null;
          const fromRec = fromId ? (Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === fromId) : null) : null;
          const toRec = toId ? (Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === toId) : null) : null;
          const availableFrom = fromRec ? Number(fromRec.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
          const availableTo = toRec ? Number(toRec.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
          updateItem(i, { availableFrom, availableTo } as any);
        } catch (err) {
          // ignore
        }
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouseId, toWarehouseId]);

  const updateItem = (idx: number, patch: Partial<typeof items[0]>) =>
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => {
    setItems((s) => [...s, { sku: '', quantity: '1', productId: null, availableFrom: null, availableTo: null, totalQty: null, error: null }]);
    setSuggestions((s) => [...s, []]);
  };

  const removeItem = (idx: number) => {
    setItems((s) => s.filter((_, i) => i !== idx));
    setSuggestions((s) => s.filter((_, i) => i !== idx));
  };

  // Fetch product suggestions for a given item index
  const fetchSuggestions = async (query: string, idx: number) => {
    if (!query || query.trim().length === 0) {
      setSuggestions((s) => s.map((arr, i) => (i === idx ? [] : arr)));
      return;
    }
    try {
      const token = localStorage.getItem('bearer_token');
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions((s) => {
        const copy = [...s];
        copy[idx] = Array.isArray(data) ? data : [];
        return copy;
      });
      // If there's an exact SKU match in results, auto-select it
      if (Array.isArray(data)) {
        const exact = data.find((p: any) => String(p.sku).toLowerCase() === query.trim().toLowerCase());
        if (exact) setTimeout(() => onSelectSuggestion(idx, exact), 50);
      }
    } catch (err) {
      // ignore
    }
  };

  const onSelectSuggestion = async (idx: number, prod: any) => {
    updateItem(idx, { sku: prod.sku, productId: parseInt(prod.id) } as any);
    // fetch stock for this product to find quantities for selected warehouses
    try {
      const token = localStorage.getItem('bearer_token');
      const stockRes = await fetch(`/api/products/${prod.id}/stock`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!stockRes.ok) {
        updateItem(idx, { availableFrom: null, availableTo: null, totalQty: null } as any);
        return;
      }
      const stockData = await stockRes.json();
      // also fetch product details to get total/currentStock
      const prodRes = await fetch(`/api/products/${prod.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      let prodDetails: any = null;
      if (prodRes.ok) prodDetails = await prodRes.json();

      const fromId = fromWarehouseId ? parseInt(fromWarehouseId) : null;
      const toId = toWarehouseId ? parseInt(toWarehouseId) : null;
      const fromRec = fromId ? (Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === fromId) : null) : null;
      const toRec = toId ? (Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === toId) : null) : null;
      const availableFrom = fromRec ? Number(fromRec.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
      const availableTo = toRec ? Number(toRec.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
      updateItem(idx, { availableFrom, availableTo, totalQty: prodDetails?.currentStock ?? null } as any);
    } catch (err) {
      updateItem(idx, { availableFrom: null, availableTo: null, totalQty: null } as any);
    }
    setSuggestions((s) => s.map((arr, i) => (i === idx ? [] : arr)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        toast.error('You must be logged in to create a transfer');
        return;
      }

      if (!transferNumber || !fromWarehouseId || !toWarehouseId) {
        toast.error('Please fill transfer number and both warehouses');
        return;
      }

      if (fromWarehouseId === toWarehouseId) {
        toast.error('From and To warehouses must be different');
        return;
      }

      // Resolve SKUs to product IDs for items
      const resolvedItems: Array<{ productId: number; quantity: number }> = [];
      for (const it of items) {
        if (!it.sku || !it.quantity) {
          toast.error('Each item needs SKU and quantity');
          setIsSubmitting(false);
          return;
        }

        if (it.error) {
          toast.error(`Fix item errors before submitting: ${it.error}`);
          setIsSubmitting(false);
          return;
        }

        // If productId already resolved, use it — otherwise lookup
        let match: any = null;
        if (it.productId) {
          match = { id: it.productId, sku: it.sku };
        } else {
          const token = localStorage.getItem('bearer_token');
          const prodRes = await fetch(`/api/products?search=${encodeURIComponent(it.sku)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!prodRes.ok) {
            toast.error('Failed to lookup product SKU');
            setIsSubmitting(false);
            return;
          }
          const prodData = await prodRes.json();
          match = Array.isArray(prodData)
            ? prodData.find((p: any) => String(p.sku).toLowerCase() === it.sku.trim().toLowerCase())
            : null;

          if (!match) {
            toast.error(`Product with SKU "${it.sku}" not found`);
            setIsSubmitting(false);
            return;
          }
        }

        const qty = parseInt(it.quantity);
        if (isNaN(qty) || qty <= 0) {
          toast.error('Quantity must be a positive number');
          setIsSubmitting(false);
          return;
        }

        // Check client-side availability in fromWarehouse if present
        const availableFrom = it.availableFrom ?? null;
        if (availableFrom != null && qty > availableFrom) {
          toast.error(`Requested qty (${qty}) exceeds available in from warehouse (${availableFrom}) for SKU ${it.sku}`);
          setIsSubmitting(false);
          return;
        }

        resolvedItems.push({ productId: parseInt(match.id), quantity: qty });
      }

      const body = {
        transferNumber: transferNumber.trim(),
        fromWarehouseId: parseInt(fromWarehouseId),
        toWarehouseId: parseInt(toWarehouseId),
        notes: notes.trim() || null,
        items: resolvedItems,
      };

      const res = await fetch('/api/transfers', {
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

      const created = await res.json();
      toast.success('Transfer created');

      // Auto-validate immediately: perform the stock move
      const validateRes = await fetch(`/api/transfers/${created.id}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!validateRes.ok) {
        const err = await validateRes.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to validate transfer');
      }

      toast.success('Transfer validated and stock moved');

      // Fetch updated stock for each product and display
      const updatedStocks: any[] = [];
      for (const it of resolvedItems) {
        try {
          const stockRes = await fetch(`/api/products/${it.productId}/stock`, { headers: { Authorization: `Bearer ${token}` } });
          if (!stockRes.ok) continue;
          const stockData = await stockRes.json();
          const fromRecord = Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === parseInt(fromWarehouseId)) : null;
          const toRecord = Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === parseInt(toWarehouseId)) : null;
          updatedStocks.push({ productId: it.productId, from: fromRecord?.quantity ?? 0, to: toRecord?.quantity ?? 0 });
        } catch (err) {
          // ignore
        }
      }
      setPostTransferStocks(updatedStocks);

      // Optionally navigate to transfers list after a short delay
      setTimeout(() => router.push('/transfers'), 1500);
    } catch (err) {
      console.error('Create transfer error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Transfer</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Transfer Number</label>
          <Input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Warehouse</label>
            <select
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Warehouse</label>
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div>
          <h3 className="text-sm font-medium">Items <span className="text-destructive">*</span></h3>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start relative">
                <div className="flex-1">
                  <Input
                    placeholder="Product SKU or name"
                    value={it.sku}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(idx, { sku: v, productId: null, availableFrom: null, availableTo: null });
                      fetchSuggestions(v, idx);
                    }}
                  />
                  {suggestions[idx] && suggestions[idx].length > 0 && (
                    <div className="absolute z-10 bg-white border rounded-md mt-1 w-full shadow max-h-48 overflow-auto">
                      {suggestions[idx].map((p: any) => (
                        <div
                          key={p.id}
                          className="px-2 py-1 hover:bg-slate-100 cursor-pointer text-sm"
                          onClick={() => onSelectSuggestion(idx, p)}
                        >
                          <div className="font-medium">{p.sku} — {p.name}</div>
                          <div className="text-xs text-muted-foreground">Price: {p.sellingPrice ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24">
                  <Input
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(idx, { quantity: v });
                      const parsed = parseInt(v);
                      if (!isNaN(parsed) && it.availableFrom != null) {
                        if (parsed > it.availableFrom) {
                          updateItem(idx, { error: `Requested qty (${parsed}) exceeds available (${it.availableFrom})` });
                        } else {
                          updateItem(idx, { error: null });
                        }
                      } else {
                        updateItem(idx, { error: null });
                      }
                    }}
                    className="w-24"
                  />
                  {it.error && <div className="text-xs text-destructive mt-1">{it.error}</div>}
                </div>
                <div className="w-32">
                  <div className="text-sm">From: <span className="font-medium">{it.availableFrom != null ? String(it.availableFrom) : '—'}</span></div>
                </div>
                <div className="w-32">
                  <div className="text-sm">To: <span className="font-medium">{it.availableTo != null ? String(it.availableTo) : '—'}</span></div>
                </div>
                <div className="w-36">
                  <div className="text-sm">Total Stock: <span className="font-medium">{it.totalQty != null ? String(it.totalQty) : '—'}</span></div>
                </div>
                <Button variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button variant="outline" onClick={addItem}>Add Item</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || items.length === 0 || items.some(it => !!it.error)}>{isSubmitting ? 'Creating…' : 'Create Transfer'}</Button>
          <Button variant="outline" onClick={() => router.push('/transfers')}>Cancel</Button>
        </div>
        {postTransferStocks.length > 0 && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <h4 className="font-medium mb-2">Updated stock after transfer</h4>
            <div className="space-y-2">
              {postTransferStocks.map((s, i) => (
                <div key={i} className="flex gap-4 items-center text-sm">
                  <div>Product ID: <span className="font-medium">{s.productId}</span></div>
                  <div>From: <span className="font-semibold">{s.from}</span></div>
                  <div>To: <span className="font-semibold">{s.to}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
