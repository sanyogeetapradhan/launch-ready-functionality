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
import { Plus, CheckCircle, Eye, Truck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Delivery {
  id: number;
  deliveryNumber: string;
  warehouseId: number;
  customerName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/deliveries?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch deliveries");
      const data = await response.json();
      setDeliveries(data);
    } catch (error) {
      toast.error("Failed to load deliveries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validate this delivery? This will decrease stock levels.")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/deliveries/${id}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to validate delivery");
      }

      toast.success("Delivery validated successfully");
      fetchDeliveries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to validate delivery");
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
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground">Manage outgoing stock to customers</p>
        </div>
        <Button asChild>
          <Link href="/deliveries/new">
            <Plus className="mr-2 h-4 w-4" />
            New Delivery
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
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No deliveries found</h3>
              <p className="text-muted-foreground">Create your first delivery to track outgoing stock</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                    <TableCell>{delivery.customerName}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>{new Date(delivery.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {delivery.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/deliveries/${delivery.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {delivery.status !== "done" && delivery.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(delivery.id)}
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
