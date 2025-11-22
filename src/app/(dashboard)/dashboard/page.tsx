"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, PackagePlus, Truck, ArrowLeftRight, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  totalStockValue: number;
  criticalStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
    unitOfMeasure: string;
    shortage: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Overview of your inventory operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active items in inventory</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{stats?.lowStockCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Items below reorder level</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${(stats?.totalStockValue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total inventory value</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
            <PackagePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pendingReceipts || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting validation</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pendingDeliveries || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready to ship</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pendingTransfers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Scheduled transfers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Critical Stock Alert */}
      {!isLoading && stats && stats.criticalStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-500 text-base md:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.criticalStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-orange-600">
                      {product.currentStock} {product.unitOfMeasure}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Need: {product.shortage} more
                    </p>
                  </div>
                </div>
              ))}
              <Link href="/products?filter=lowStock" className="block">
                <Button variant="outline" className="w-full">
                  View All Low Stock Items
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
            <Link href="/receipts" className="block">
              <Button variant="outline" className="w-full">
                <PackagePlus className="mr-2 h-4 w-4" />
                <span className="truncate">New Receipt</span>
              </Button>
            </Link>
            <Link href="/deliveries" className="block">
              <Button variant="outline" className="w-full">
                <Truck className="mr-2 h-4 w-4" />
                <span className="truncate">New Delivery</span>
              </Button>
            </Link>
            <Link href="/transfers" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                <span className="truncate">New Transfer</span>
              </Button>
            </Link>
            <Link href="/products" className="block">
              <Button variant="outline" className="w-full">
                <Package className="mr-2 h-4 w-4" />
                <span className="truncate">Manage Products</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}