import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";

// Eager — small, always needed
import Dashboard from "./pages/Dashboard";
import SaleEntry from "./pages/sales/SaleEntry";

// Lazy — heavy pages
const Customers = lazy(() => import("./pages/masters/Customers"));
const Items = lazy(() => import("./pages/masters/Items"));
const BatchMaster = lazy(() => import("./pages/masters/Batches"));
const SaleList = lazy(() => import("./pages/sales/SaleList"));
const SaleReturn = lazy(() => import("./pages/sales/SaleReturn"));
const GSTReport = lazy(() => import("./pages/reports/GSTReport"));
const StockReport = lazy(() => import("./pages/reports/StockReport"));
const SaleRegister = lazy(() => import("./pages/reports/SalesRegister"));
const ItemCategoryReport = lazy(
  () => import("./pages/reports/Itemcategoryreport"),
);
const CustomerCategoryReport = lazy(
  () => import("./pages/reports/Customercategoryreport"),
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Wrap>
              <Dashboard />
            </Wrap>
          }
        />
        <Route
          path="/masters/customers"
          element={
            <Wrap>
              <Customers />
            </Wrap>
          }
        />
        <Route
          path="/masters/items"
          element={
            <Wrap>
              <Items />
            </Wrap>
          }
        />
        <Route
          path="/masters/batches"
          element={
            <Wrap>
              <BatchMaster />
            </Wrap>
          }
        />
        <Route path="/sales/new" element={<SaleEntry />} />
        <Route
          path="/sales"
          element={
            <Wrap>
              <SaleList />
            </Wrap>
          }
        />
        <Route
          path="/sales/return"
          element={
            <Suspense fallback={<PageLoader />}>
              <SaleReturn />
            </Suspense>
          }
        />
        <Route
          path="/reports/sale-register"
          element={
            <Wrap>
              <SaleRegister />
            </Wrap>
          }
        />
        <Route
          path="/reports/gst"
          element={
            <Wrap>
              <GSTReport />
            </Wrap>
          }
        />
        <Route
          path="/reports/stock"
          element={
            <Wrap>
              <StockReport />
            </Wrap>
          }
        />
        <Route
          path="/reports/item-category"
          element={
            <Wrap>
              <ItemCategoryReport />
            </Wrap>
          }
        />
        <Route
          path="/reports/customer-category"
          element={
            <Wrap>
              <CustomerCategoryReport />
            </Wrap>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
