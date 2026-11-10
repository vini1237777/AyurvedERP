const COMPANY = {
  name: "AUSHADHI WELLNESS PVT LTD",
  address: "",
  mobile: "0000000000",
  gstin: "27AAAAA0000A1Z5",
  pan: "AAAAA0000A",
  state: "Maharashtra",
  stateCode: "27",
};

const data = JSON.parse(
  localStorage.getItem("erp_purchase_print") || "null",
);

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function renderCompanyBlock() {
  return `
    <div style="border:1px solid #000;padding:8px;margin-bottom:6px;text-align:center;">
      <div style="font-weight:bold;font-size:14px;letter-spacing:1px">${COMPANY.name}</div>
      <div style="font-size:10px;margin-top:2px">${COMPANY.address}</div>
      <div style="font-size:10px">Mob: ${COMPANY.mobile} &nbsp;|&nbsp; GSTIN: ${COMPANY.gstin} &nbsp;|&nbsp; PAN: ${COMPANY.pan}</div>
    </div>`;
}

function renderSupplierMeta(d) {
  return `
    <div class="meta-grid">
      <div>
        <div class="meta-label">SUPPLIER</div>
        <div class="meta-value">${d.supplier?.name || ""}</div>
        <div style="font-size:10px;margin-top:2px">${d.supplier?.address || ""}</div>
        <div style="font-size:10px"><b>State:</b> ${d.supplier?.state || ""} (${d.supplier?.stateCode || ""}) &nbsp; <b>Mob:</b> ${d.supplier?.mobile || "-"}</div>
        <div style="font-size:10px"><b>GSTIN:</b> ${d.supplier?.gstin || "-"}</div>
      </div>
      <div>
        <div class="meta-label">${d.mode === "grn" ? "GRN" : "PURCHASE"} DETAILS</div>
        <div style="font-size:11px;margin-top:2px"><b>No:</b> ${d.purchaseNo || ""}</div>
        <div style="font-size:11px"><b>Date:</b> ${fmtDate(d.purchaseDate)}</div>
        ${d.taxType ? `<div style="font-size:11px"><b>Tax Type:</b> ${d.taxType === "CGST_SGST" ? "CGST + SGST" : "IGST"}</div>` : ""}
      </div>
    </div>`;
}

function renderVoucher(d) {
  const rows = (d.rows || [])
    .map(
      (r, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${r.itemName || ""}</td>
          <td class="center">${r.hsn || ""}</td>
          <td class="center">${r.batchNo || "-"}</td>
          <td class="right">${r.qty || 0}</td>
          <td class="center">${r.per || ""}</td>
          <td class="right">${fmt(r.rate)}</td>
          <td class="right">${r.disc || 0}%</td>
          <td class="center">${r.gst || 0}%</td>
          <td class="right">${fmt(r.netValue)}</td>
        </tr>`,
    )
    .join("");

  document.getElementById("page").innerHTML = `
    <div class="doc-title">PURCHASE VOUCHER</div>
    ${renderCompanyBlock()}
    ${renderSupplierMeta(d)}
    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:30%">Item</th>
          <th style="width:8%">HSN</th>
          <th style="width:10%">Batch</th>
          <th style="width:6%">Qty</th>
          <th style="width:6%">Unit</th>
          <th style="width:9%">Rate</th>
          <th style="width:6%">Disc</th>
          <th style="width:6%">GST</th>
          <th style="width:15%">Net</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="10" class="center" style="padding:20px;color:#888">No items</td></tr>`}</tbody>
    </table>
    <div class="totals-row">
      <table class="totals-table">
        <tr><td>Total Discount</td><td class="right">₹${fmt(d.totalDiscount)}</td></tr>
        <tr><td>Total Taxable</td><td class="right">₹${fmt(d.totalTaxable)}</td></tr>
        ${
          d.taxType === "CGST_SGST"
            ? `<tr><td>CGST</td><td class="right">₹${fmt(d.cgstAmt)}</td></tr>
               <tr><td>SGST</td><td class="right">₹${fmt(d.sgstAmt)}</td></tr>`
            : `<tr><td>IGST</td><td class="right">₹${fmt(d.igstAmt)}</td></tr>`
        }
        <tr class="grand-row"><td>Grand Total</td><td class="right">₹${fmt(d.grandTotal)}</td></tr>
      </table>
    </div>
    ${
      d.notes
        ? `<div class="notes-box"><div class="notes-label">NOTES</div>${escapeHtml(d.notes)}</div>`
        : ""
    }
    <div class="signatory">
      For <b>${COMPANY.name}</b>
      <div class="line">Authorised Signatory</div>
    </div>`;
}

function renderGRN(d) {
  const rows = (d.rows || [])
    .map(
      (r, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${r.itemName || ""}</td>
          <td class="center">${r.hsn || ""}</td>
          <td class="center">${r.batchNo || "-"}</td>
          <td class="center">${r.mfgDate || "-"}</td>
          <td class="center">${r.expiryDate || "-"}</td>
          <td class="right">${r.qty || 0}</td>
          <td class="right">${r.freeQty || 0}</td>
          <td class="center">${r.per || ""}</td>
        </tr>`,
    )
    .join("");

  document.getElementById("page").innerHTML = `
    <div class="doc-title">GOODS RECEIVED NOTE</div>
    ${renderCompanyBlock()}
    ${renderSupplierMeta(d)}
    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:34%">Item Name</th>
          <th style="width:8%">HSN</th>
          <th style="width:12%">Batch</th>
          <th style="width:10%">Mfg Date</th>
          <th style="width:10%">Expiry</th>
          <th style="width:8%">Qty</th>
          <th style="width:8%">Free Qty</th>
          <th style="width:6%">Unit</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="9" class="center" style="padding:20px;color:#888">No items</td></tr>`}</tbody>
    </table>
    ${
      d.notes
        ? `<div class="notes-box"><div class="notes-label">NOTES</div>${escapeHtml(d.notes)}</div>`
        : ""
    }
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px;font-size:11px;">
      <div>
        <div style="border-top:1px solid #000;padding-top:4px;font-weight:bold">Received By</div>
        <div style="font-size:9px;color:#555;margin-top:3px">(Stock Keeper / Pharmacist)</div>
      </div>
      <div class="signatory" style="margin:0">
        For <b>${COMPANY.name}</b>
        <div class="line">Authorised Signatory</div>
      </div>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

if (!data) {
  document.getElementById("page").innerHTML =
    `<div style="padding:40px;text-align:center;color:#888">No print data found. Open this from the Purchase list.</div>`;
} else {
  document.getElementById("screen-title").textContent =
    data.mode === "grn" ? "Goods Received Note" : "Purchase Voucher";
  document.title = data.mode === "grn" ? "GRN" : "Purchase Voucher";
  if (data.mode === "grn") renderGRN(data);
  else renderVoucher(data);
}
