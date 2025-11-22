"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Search } from "lucide-react";
import { toast } from "sonner";

interface LedgerEntry {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  warehouseId: number;
  warehouseName: string;
  operationType: string;
  referenceNumber: string;
  quantityChange: number;
  quantityAfter: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes: string | null;
}

export default function HistoryPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLedger();
  }, [filterType]);

  const fetchLedger = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      let url = "/api/stock-ledger?limit=100";
      
      if (filterType !== "all") url += `&operationType=${filterType}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch stock history");
      const data = await response.json();
      setLedger(data);
    } catch (error) {
      toast.error("Failed to load stock history");
    } finally {
      setIsLoading(false);
    }
  };

  const getOperationBadge = (type: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      receipt: { variant: "default", label: "Receipt" },
      delivery: { variant: "secondary", label: "Delivery" },
      transfer_in: { variant: "outline", label: "Transfer In" },
      transfer_out: { variant: "outline", label: "Transfer Out" },
      adjustment: { variant: "secondary", label: "Adjustment" },
    };
    const { variant, label } = config[type] || { variant: "outline", label: type };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const filteredLedger = ledger.filter(
    (entry) =>
      entry.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.productSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Movement History</h1>
        <p className="text-muted-foreground">Complete audit trail of all inventory movements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product, SKU, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All operations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operations</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="delivery">Deliveries</SelectItem>
                <SelectItem value="transfer_in">Transfers In</SelectItem>
                <SelectItem value="transfer_out">Transfers Out</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No movements found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your filters"
                  : "Stock movements will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{getOperationBadge(entry.operationType)}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.referenceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.productName}</p>
                          <p className="text-xs text-muted-foreground">{entry.productSku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.warehouseName}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            entry.quantityChange > 0
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {entry.quantityChange > 0 ? "+" : ""}
                          {entry.quantityChange}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.quantityAfter}
                      </TableCell>
                      <TableCell className="text-sm">{entry.createdByName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
