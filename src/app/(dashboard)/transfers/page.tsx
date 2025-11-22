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
import { Plus, CheckCircle, Eye, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Transfer {
  id: number;
  transferNumber: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/transfers?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch transfers");
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      toast.error("Failed to load transfers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validate this transfer? This will move stock between warehouses.")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/transfers/${id}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to validate transfer");
      }

      toast.success("Transfer validated successfully");
      fetchTransfers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to validate transfer");
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
          <h1 className="text-3xl font-bold tracking-tight">Internal Transfers</h1>
          <p className="text-muted-foreground">Move stock between warehouses and locations</p>
        </div>
        <Button asChild>
          <Link href="/transfers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
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
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No transfers found</h3>
              <p className="text-muted-foreground">Create your first transfer to move stock between locations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transferNumber}</TableCell>
                    <TableCell>
                      Warehouse {transfer.fromWarehouseId} → {transfer.toWarehouseId}
                    </TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transfer.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/transfers/${transfer.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {transfer.status !== "done" && transfer.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(transfer.id)}
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
