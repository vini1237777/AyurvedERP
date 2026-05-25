import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider, RequireAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NoAccess from "./pages/NoAccess";

// Eager
import Dashboard from "./pages/Dashboard";
import SaleEntry from "./pages/sales/SaleEntry";
import SaleRegister from "./pages/reports/SalesRegister";
import GSTReport from "./pages/reports/GSTReport";
import GstR1Report from "./pages/reports/Gstr1report";
import GstR3Report from "./pages/reports/Gstr3report";
import StockReport from "./pages/reports/StockReport";
import LedgerReport from "./pages/reports/Ledgerreport";
import PurchaseEntry from "./pages/sales/PurchaseEntry";
import PurchaseList from "./pages/sales/PurchaseList";

// Lazy
const Customers = lazy(() => import("./pages/masters/Customers"));
const Items = lazy(() => import("./pages/masters/Items"));
const BatchMaster = lazy(() => import("./pages/masters/Batches"));
const SaleList = lazy(() => import("./pages/sales/SaleList"));
const SaleReturn = lazy(() => import("./pages/sales/SaleReturn"));

const ItemCategoryReport = lazy(
  () => import("./pages/reports/Itemcategoryreport"),
);
const CustomerCategoryReport = lazy(
  () => import("./pages/reports/Customercategoryreport"),
);
const CompanyProfile = lazy(() => import("./pages/settings/CompanyProfile"));
const TrialBalance = lazy(() => import("./pages/reports/TrialBalance"));
const HsnSummary = lazy(() => import("./pages/reports/HsnSummary"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </AppLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <Wrap>
                <Dashboard />
              </Wrap>
            }
          />
          <Route
            path="/no-access"
            element={
              <Wrap>
                <NoAccess />
              </Wrap>
            }
          />

        {/* Masters */}
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

        {/* Sales */}
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

        {/* Purchases */}
        <Route
          path="/purchases"
          element={
            <Wrap>
              <PurchaseList />
            </Wrap>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <PurchaseEntry />
            </Suspense>
          }
        />

        {/* Reports */}
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
          path="/reports/gst-r1"
          element={
            <Wrap>
              <GstR1Report />
            </Wrap>
          }
        />
        <Route
          path="/reports/gst-r3"
          element={
            <Wrap>
              <GstR3Report />
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
          path="/reports/ledger"
          element={
            <Wrap>
              <LedgerReport />
            </Wrap>
          }
        />
        <Route
          path="/reports/trial-balance"
          element={
            <Wrap>
              <TrialBalance />
            </Wrap>
          }
        />
        <Route
          path="/reports/hsn-summary"
          element={
            <Wrap>
              <HsnSummary />
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

        {/* Settings */}
        <Route
          path="/settings/profile"
          element={
            <Wrap>
              <CompanyProfile />
            </Wrap>
          }
        />

        <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
