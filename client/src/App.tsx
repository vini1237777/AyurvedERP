import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CustomerMaster from "./pages/masters/Customers";
import ItemMaster from "./pages/masters/Items";
import BatchMaster from "./pages/masters/Batches";
import SaleEntry from "./pages/sales/SaleEntry";
import SaleList from "./pages/sales/SaleList";
import SaleReturn from "./pages/sales/SaleReturn";
import GSTReport from "./pages/reports/GSTReport";
import StockReport from "./pages/reports/StockReport";
import SaleRegister from "./pages/reports/SalesRegister";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/masters/customers"
          element={
            <AppLayout>
              <CustomerMaster />
            </AppLayout>
          }
        />
        <Route
          path="/masters/items"
          element={
            <AppLayout>
              <ItemMaster />
            </AppLayout>
          }
        />
        <Route
          path="/masters/batches"
          element={
            <AppLayout>
              <BatchMaster />
            </AppLayout>
          }
        />
        <Route path="/sales/new" element={<SaleEntry />} />
        <Route
          path="/sales"
          element={
            <AppLayout>
              <SaleList />
            </AppLayout>
          }
        />
        <Route
          path="/reports/sale-register"
          element={
            <AppLayout>
              <SaleRegister />
            </AppLayout>
          }
        />
        <Route
          path="/reports/gst"
          element={
            <AppLayout>
              <GSTReport />
            </AppLayout>
          }
        />
        <Route
          path="/reports/stock"
          element={
            <AppLayout>
              <StockReport />
            </AppLayout>
          }
        />
        <Route path="/sales/return" element={<SaleReturn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
