import React, { useEffect, useMemo, useState } from "react";
import { ProviderData } from "db-vanity-model/src/provider";
import {
  fetchAllEntities,
  mapValueForAnnotation,
  mapValueForNumberAnnotation,
} from "db-vanity-model/src/query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, Filter, FilterX, Loader2, RefreshCw } from "lucide-react";
import { ProviderFilters } from "./ProviderFilters";
import { ProviderCard } from "./ProviderCard";
import { getProviderScore } from "./provider-utils";
import InfiniteScroll from "react-infinite-scroll-component";
import { escapeForJS } from "@/utils";
import ExperimentalAlert from "@/components/ExperimentalAlert";
import { useFilterState } from "./useFilterState";
import { FilterCriteria, sortOptions } from "./provider-types";
import { FilterHistory } from "./FilterHistory";
import ProviderAnalytics from "@/providers/ProviderAnalytics.tsx";
import { makeClient } from "@/order/helpers.ts";

const buildQuery = (appliedFilters: FilterCriteria) => {
  let qbuild = `$owner = "${import.meta.env.VITE_ARKIV_OWNER_ADDRESS}"`;
  if (appliedFilters.providerNameSearch) {
    qbuild += ` && name = "${escapeForJS(appliedFilters.providerNameSearch)}"`;
  }
  if (appliedFilters.minWork !== null) {
    qbuild += ` && totalWork >= "${mapValueForAnnotation(appliedFilters.minWork * 1e9, "totalWork")}"`;
  }
  if (appliedFilters.maxWork !== null) {
    qbuild += ` && totalWork <= "${mapValueForAnnotation(appliedFilters.maxWork * 1e9, "totalWork")}"`;
  }
  if (appliedFilters.minWork24h !== null) {
    qbuild += ` && totalWork24h >= "${mapValueForAnnotation(appliedFilters.minWork24h * 1e9, "totalWork24h")}"`;
  }
  if (appliedFilters.maxWork24h !== null) {
    qbuild += ` && totalWork24h <= "${mapValueForAnnotation(appliedFilters.maxWork24h * 1e9, "totalWork24h")}"`;
  }
  if (appliedFilters.minSpeed !== null) {
    qbuild += ` && speed >= "${mapValueForAnnotation(appliedFilters.minSpeed * 1e6, "speed")}"`;
  }
  if (appliedFilters.maxSpeed !== null) {
    qbuild += ` && speed <= "${mapValueForAnnotation(appliedFilters.maxSpeed * 1e6, "speed")}"`;
  }
  if (appliedFilters.minSpeed24h !== null) {
    qbuild += ` && speed24h >= "${mapValueForAnnotation(appliedFilters.minSpeed24h * 1e6, "speed24h")}"`;
  }
  if (appliedFilters.maxSpeed24h !== null) {
    qbuild += ` && speed24h <= "${mapValueForAnnotation(appliedFilters.maxSpeed24h * 1e6, "speed24h")}"`;
  }
  if (appliedFilters.minEfficiency !== null) {
    qbuild += ` && efficiency >= "${mapValueForAnnotation(appliedFilters.minEfficiency * 1e12, "efficiency")}"`;
  }
  if (appliedFilters.maxEfficiency !== null) {
    qbuild += ` && efficiency <= "${mapValueForAnnotation(appliedFilters.maxEfficiency * 1e12, "efficiency")}"`;
  }
  if (appliedFilters.minEfficiency24h !== null) {
    qbuild += ` && efficiency24h >= "${mapValueForAnnotation(appliedFilters.minEfficiency24h * 1e12, "efficiency24h")}"`;
  }
  if (appliedFilters.maxEfficiency24h !== null) {
    qbuild += ` && efficiency24h <= "${mapValueForAnnotation(appliedFilters.maxEfficiency24h * 1e12, "efficiency24h")}"`;
  }
  if (appliedFilters.minTotalCost !== null) {
    qbuild += ` && totalCost >= "${mapValueForAnnotation(appliedFilters.minTotalCost, "totalCost")}"`;
  }
  if (appliedFilters.maxTotalCost !== null) {
    qbuild += ` && totalCost <= "${mapValueForAnnotation(appliedFilters.maxTotalCost, "totalCost")}"`;
  }
  if (appliedFilters.minTotalCost24h !== null) {
    qbuild += ` && totalCost24h >= "${mapValueForAnnotation(appliedFilters.minTotalCost24h, "totalCost24h")}"`;
  }
  if (appliedFilters.maxTotalCost24h !== null) {
    qbuild += ` && totalCost24h <= "${mapValueForAnnotation(appliedFilters.maxTotalCost24h, "totalCost24h")}"`;
  }
  if (appliedFilters.minWorkHours !== null) {
    qbuild += ` && totalWorkHours >= "${mapValueForAnnotation(appliedFilters.minWorkHours, "totalWorkHours")}"`;
  }
  if (appliedFilters.maxWorkHours !== null) {
    qbuild += ` && totalWorkHours <= "${mapValueForAnnotation(appliedFilters.maxWorkHours, "totalWorkHours")}"`;
  }
  if (appliedFilters.minWorkHours24h !== null) {
    qbuild += ` && totalWorkHours24h >= "${mapValueForAnnotation(appliedFilters.minWorkHours24h, "totalWorkHours24h")}"`;
  }
  if (appliedFilters.maxWorkHours24h !== null) {
    qbuild += ` && totalWorkHours24h <= "${mapValueForAnnotation(appliedFilters.maxWorkHours24h, "totalWorkHours24h")}"`;
  }
  if (appliedFilters.minNumberOfJobs !== null) {
    qbuild += ` && numberOfJobs >= ${mapValueForNumberAnnotation(appliedFilters.minNumberOfJobs, "numberOfJobs")}`;
  }
  if (appliedFilters.maxNumberOfJobs !== null) {
    qbuild += ` && numberOfJobs <= ${mapValueForNumberAnnotation(appliedFilters.maxNumberOfJobs, "numberOfJobs")}`;
  }
  if (appliedFilters.minNumberOfJobs24h !== null) {
    qbuild += ` && numberOfJobs24h >= ${mapValueForNumberAnnotation(appliedFilters.minNumberOfJobs24h, "numberOfJobs24h")}`;
  }
  if (appliedFilters.maxNumberOfJobs24h !== null) {
    qbuild += ` && numberOfJobs24h <= ${mapValueForNumberAnnotation(appliedFilters.maxNumberOfJobs24h, "numberOfJobs24h")}`;
  }
  if (appliedFilters.minLongestJob !== null) {
    qbuild += ` && longestJob >= "${mapValueForAnnotation(appliedFilters.minLongestJob, "longestJob")}"`;
  }
  if (appliedFilters.maxLongestJob !== null) {
    qbuild += ` && longestJob <= "${mapValueForAnnotation(appliedFilters.maxLongestJob, "longestJob")}"`;
  }
  if (appliedFilters.minLongestJob24h !== null) {
    qbuild += ` && longestJob24h >= "${mapValueForAnnotation(appliedFilters.minLongestJob24h, "longestJob24h")}"`;
  }
  if (appliedFilters.maxLongestJob24h !== null) {
    qbuild += ` && longestJob24h <= "${mapValueForAnnotation(appliedFilters.maxLongestJob24h, "longestJob24h")}"`;
  }
  return qbuild;
};

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const {
    stagedFilters,
    appliedFilters,
    filterHistory,
    favoriteFilters,
    changeStagedFilterField,
    applyFilters,
    setAndApplyStagedFilters,
    resetFilters,
    applyHistoricalFilter,
    deleteHistoricalFilter,
    promoteToFavorite,
    deleteFavoriteFilter,
    updateFavoriteName,
  } = useFilterState();

  const fetchMoreData = () => {
    setDisplayLimit((prev) => prev + 50);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchData = async () => {
    const filters = appliedFilters;
    const qbuild = buildQuery(filters);
    setLoading(true);
    try {
      const entities = await fetchAllEntities(
        makeClient(),
        10,
        import.meta.env.VITE_ARKIV_OWNER_ADDRESS,
        qbuild,
      );
      const data = new ProviderData({ grouped: "all", byProviderId: entities });
      setProviderData(data);
    } catch (error) {
      console.error("Error fetching provider data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCurlQuery = () => {
    const qbuild = buildQuery(appliedFilters);
    let completeQuery = `curl ${
      import.meta.env.VITE_ARKIV_RPC
    } -X POST -H "Content-Type: application/json" --data '{"method":"golembase_queryEntities","params":["%%QUERY%%"], "id": 1, "jsonrpc":"2.0"}' | jq '.result[] | .value' | wc -l`;
    completeQuery = completeQuery.replace("%%QUERY%%", escapeForJS(qbuild));
    window.navigator.clipboard.writeText(completeQuery);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const { displayedProviders, totalMatches } = useMemo(() => {
    if (!providerData) {
      return { displayedProviders: [], totalMatches: 0 };
    }

    const providers = Object.values(providerData.byProviderId);
    const sorted = providers.sort((a, b) => {
      const { sortBy, sortOrder } = appliedFilters;
      let aVal, bVal;

      // Handle special calculated cases first
      if (sortBy === "score") {
        aVal = getProviderScore(a);
        bVal = getProviderScore(b);
      } else if (sortBy === "providerName") {
        // Handle string comparison
        aVal = a.providerName.toLowerCase();
        bVal = b.providerName.toLowerCase();
      } else {
        // Handle direct property lookup for all other numeric cases
        aVal = a[sortBy] ?? 0;
        bVal = b[sortBy] ?? 0;
      }

      // The actual comparison logic
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return {
      totalMatches: sorted.length,
      displayedProviders: sorted.slice(0, displayLimit),
    };
  }, [providerData, appliedFilters, displayLimit]);

  const applyFiltersAndResetList = () => {
    applyFilters();
    window.scrollTo({ top: 0, behavior: "instant" });
    setDisplayLimit(50);
  };

  const applyHistoricalFilterAndResetList = (filter: FilterCriteria) => {
    applyHistoricalFilter(filter);
    window.scrollTo({ top: 0, behavior: "instant" });
    setDisplayLimit(50);
  };

  const resetFiltersAndResetList = () => {
    resetFilters();
    window.scrollTo({ top: 0, behavior: "instant" });
    setDisplayLimit(50);
  };

  const changeSortOrder = (
    sortBy: FilterCriteria["sortBy"],
    sortOrder: "asc" | "desc",
  ) => {
    setAndApplyStagedFilters({ sortBy, sortOrder });
    window.scrollTo({ top: 0, behavior: "instant" });
    setDisplayLimit(50);
  };

  return (
    <div className="container mx-auto max-w-7xl pt-4 sm:pt-6 lg:pt-8">
      <ExperimentalAlert />
      <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-8">
        <aside className="hidden lg:col-span-1 lg:block">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Filters</CardTitle>
                <FilterHistory
                  favoriteFilters={favoriteFilters}
                  filterHistory={filterHistory}
                  applyHistoricalFilter={applyHistoricalFilterAndResetList}
                  deleteHistoricalFilter={deleteHistoricalFilter}
                  promoteToFavorite={promoteToFavorite}
                  deleteFavoriteFilter={deleteFavoriteFilter}
                  updateFavoriteName={updateFavoriteName}
                />
              </CardHeader>
              <CardContent>
                <ProviderFilters
                  filter={stagedFilters}
                  changeFilterField={changeStagedFilterField}
                  applyFilters={applyFiltersAndResetList}
                  resetFilters={resetFiltersAndResetList}
                />
              </CardContent>
            </Card>
            <Button onClick={copyCurlQuery}>Copy curl query</Button>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Providers
              </h1>
              <p className="text-muted-foreground">
                {loading
                  ? "Searching for providers..."
                  : `${totalMatches} provider${totalMatches !== 1 ? "s" : ""} match your search criteria.`}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Sort By Dropdown */}
              <div className="flex-grow sm:flex-grow-0">
                <Label htmlFor="sort-by" className="text-sm font-medium">
                  Sort By
                </Label>
                <Select
                  value={stagedFilters.sortBy}
                  onValueChange={(value) =>
                    changeSortOrder(
                      value as FilterCriteria["sortBy"],
                      stagedFilters.sortOrder,
                    )
                  }
                >
                  <SelectTrigger
                    id="sort-by"
                    className="mt-1 w-full sm:w-[180px]"
                  >
                    <SelectValue placeholder="Select sorting" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Dropdown */}
              <div>
                <Label htmlFor="sort-order" className="text-sm font-medium">
                  Order
                </Label>
                <Select
                  value={stagedFilters.sortOrder}
                  onValueChange={(value) =>
                    changeSortOrder(
                      stagedFilters.sortBy,
                      value as "asc" | "desc",
                    )
                  }
                >
                  <SelectTrigger id="sort-order" className="mt-1 sm:w-[150px]">
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <Filter className="mr-2 size-4" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <ProviderFilters
                      filter={stagedFilters}
                      changeFilterField={changeStagedFilterField}
                      applyFilters={applyFiltersAndResetList}
                      resetFilters={resetFiltersAndResetList}
                    />
                  </SheetContent>
                </Sheet>
                <div className="lg:hidden">
                  <FilterHistory
                    favoriteFilters={favoriteFilters}
                    filterHistory={filterHistory}
                    applyHistoricalFilter={applyHistoricalFilterAndResetList}
                    deleteHistoricalFilter={deleteHistoricalFilter}
                    promoteToFavorite={promoteToFavorite}
                    deleteFavoriteFilter={deleteFavoriteFilter}
                    updateFavoriteName={updateFavoriteName}
                  />
                </div>
                <Button onClick={() => fetchData()} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : displayedProviders.length > 0 ? (
            <>
              <div className="mb-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-24 text-center">
                <ProviderAnalytics providerData={providerData} />
              </div>
              <InfiniteScroll
                dataLength={displayedProviders.length}
                next={fetchMoreData}
                hasMore={displayedProviders.length < totalMatches}
                loader={
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="mr-2 size-8 animate-spin" />
                    <span>Loading more providers...</span>
                  </div>
                }
                endMessage={
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    <b>You have seen all {totalMatches} providers.</b>
                  </p>
                }
                className="space-y-4"
              >
                {displayedProviders.map((provider, index) => (
                  <ProviderCard
                    key={provider.providerId}
                    provider={provider}
                    rank={index + 1}
                  />
                ))}
              </InfiniteScroll>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-24 text-center">
              <h3 className="text-xl font-semibold">No Providers Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your filters or click &quot;Reset Filters&quot;.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={resetFiltersAndResetList}
              >
                <FilterX className="mr-2 size-4" /> Reset Filters
              </Button>
            </div>
          )}
        </main>
      </div>
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full shadow-lg"
          variant="outline"
          size="icon"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default AnalyticsPage;
