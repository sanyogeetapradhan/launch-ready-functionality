"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Receipt {
  id: number;
  receiptNumber: string;
  warehouseId: number;
  supplierName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/receipts?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch receipts");
      const data = await response.json();
      setReceipts(data);
    } catch (error) {
      toast.error("Failed to load receipts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validate this receipt? This will update stock levels.")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/receipts/${id}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to validate receipt");
      }

      toast.success("Receipt validated successfully");
      fetchReceipts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to validate receipt");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      waiting: "outline",
      ready: "default",
      done: "default",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">Manage incoming stock from suppliers</p>
        </div>
        <Button asChild>
          <Link href="/receipts/new">
            <Plus className="mr-2 h-4 w-4" />
            New Receipt
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No receipts found</h3>
              <p className="text-muted-foreground">Create your first receipt to track incoming stock</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{receipt.supplierName}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell>{new Date(receipt.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {receipt.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/receipts/${receipt.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {receipt.status !== "done" && receipt.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(receipt.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
