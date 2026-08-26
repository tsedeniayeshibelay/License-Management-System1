/**
 * Invoice Generator Utility
 * Generates an official, printable and downloadable invoice with corporate styling.
 * Automatically opens the browser's "Save as PDF" / "Print" dialog and provides instant file download.
 */

export function generateInvoiceHTML(order, buyerInfo = {}) {
  const orderNum = order.orderNumber || `ORD-${order.id || Date.now()}`;
  const orderDate = order.orderDate 
    ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const buyerName = buyerInfo.fullName || buyerInfo.username || order.buyerName || 'Valued Enterprise Client';
  const buyerEmail = buyerInfo.email || order.buyerEmail || 'billing@clientcompany.com';
  const companyName = buyerInfo.companyName || buyerInfo.company?.name || order.companyName || 'Corporate Client';
  
  const quantity = order.quantity || 1;
  const totalAmount = Number(order.amount || 0).toFixed(2);
  const unitPrice = (Number(order.amount || 0) / quantity).toFixed(2);
  const productName = order.productName || 'Enterprise Software License';
  const status = (order.status || 'COMPLETED').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${orderNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    body {
      background-color: #f8fafc;
      color: #1e293b;
      padding: 40px 20px;
      font-size: 14px;
      line-height: 1.5;
    }

    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 24px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .btn-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-primary {
      background-color: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }

    .btn-secondary {
      background-color: #334155;
      color: #f1f5f9;
    }
    .btn-secondary:hover {
      background-color: #475569;
    }

    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 32px;
      margin-bottom: 32px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta h2 {
      font-size: 28px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .invoice-meta .inv-number {
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      color: #334155;
    }

    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background-color: #dcfce7;
      color: #15803d;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 36px;
    }

    .info-block h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .info-block p {
      color: #334155;
      font-size: 14px;
      margin-bottom: 3px;
    }

    .info-block .name {
      font-weight: 700;
      font-size: 16px;
      color: #0f172a;
    }

    .table-container {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }

    .table-container th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
    }

    .table-container td {
      padding: 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      font-size: 14px;
    }

    .text-right {
      text-align: right !important;
    }

    .text-center {
      text-align: center !important;
    }

    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 36px;
    }

    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }

    .totals-table td {
      padding: 8px 12px;
      font-size: 14px;
      color: #475569;
    }

    .totals-table tr.grand-total td {
      border-top: 2px solid #0f172a;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      padding-top: 14px;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 12px;
    }

    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 20px;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <strong>Official Invoice Preview</strong> &mdash; ${orderNum}
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">
        🖨️ Print / Save as PDF
      </button>
      <button onclick="downloadAsHtml()" class="btn btn-secondary">
        ⬇️ Download File
      </button>
      <button onclick="window.close()" class="btn btn-secondary">
        ✕ Close
      </button>
    </div>
  </div>

  <div class="invoice-card" id="invoiceContent">
    <!-- Header -->
    <div class="header-row">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: #2563eb; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          <!-- LockStrata Official Lock Logo -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            <circle cx="12" cy="16" r="1.5" fill="#ffffff"></circle>
          </svg>
        </div>
        <div>
          <div class="brand-title" style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;">
            LockStrata
          </div>
          <div class="brand-subtitle" style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-top: 3px;">
            Enterprise License Management
          </div>
        </div>
      </div>
      <div class="invoice-meta">
        <h2>INVOICE</h2>
        <div class="inv-number">${orderNum}</div>
        <div style="color: #64748b; font-size: 13px; margin-top: 2px;">Date: ${orderDate}</div>
        <span class="status-badge">${status === 'COMPLETED' ? 'PAID & VERIFIED' : status}</span>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-block">
        <h4>Billed From</h4>
        <p class="name">LockStrata Technologies Inc.</p>
        <p>100 Enterprise Boulevard, Suite 500</p>
        <p>San Francisco, CA 94105</p>
        <p>Email: billing@lockstrata.com</p>
      </div>

      <div class="info-block" style="text-align: right;">
        <h4>Billed To</h4>
        <p class="name">${companyName}</p>
        <p>Attention: ${buyerName}</p>
        <p>Email: ${buyerEmail}</p>
        <p>Account Type: Corporate Bulk Buyer</p>
      </div>
    </div>

    <!-- Items Table -->
    <table class="table-container">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-center">Seats / Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 15px;">${productName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Enterprise Software License Allocation & Activation Key Pool</div>
          </td>
          <td class="text-center" style="font-weight: 600;">${quantity} Seats</td>
          <td class="text-right">$${unitPrice}</td>
          <td class="text-right" style="font-weight: 700; color: #0f172a;">$${totalAmount}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals Area -->
    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td class="text-right" style="font-weight: 600;">$${totalAmount}</td>
        </tr>
        <tr>
          <td>Sales Tax / VAT (0%)</td>
          <td class="text-right" style="font-weight: 600;">$0.00</td>
        </tr>
        <tr class="grand-total">
          <td>Total Paid</td>
          <td class="text-right">$${totalAmount} USD</td>
        </tr>
      </table>
    </div>

    <!-- Payment Reference Details -->
    <div style="background: #f8fafc; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; border: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <span style="font-weight: 700; color: #334155;">Payment Details:</span> Paid via Digital Corporate Payment System &bull; Reference: <strong>${orderNum}</strong> &bull; Status: <strong>${status}</strong>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Thank you for choosing LockStrata for your enterprise software licensing.</div>
      <div>Questions? support@lockstrata.com</div>
    </div>
  </div>

  <script>
    function downloadAsHtml() {
      var content = document.documentElement.outerHTML;
      var blob = new Blob([content], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Invoice-' + '${orderNum}' + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

/**
 * Trigger immediate invoice viewing and printing dialog
 */
export function downloadInvoice(order, buyerInfo = {}) {
  const html = generateInvoiceHTML(order, buyerInfo);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger native print/save-as-PDF dialog once loaded
    printWindow.onload = () => {
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn("Auto-print was prevented by browser policy", e);
        }
      }, 400);
    };
  } else {
    // If popups are blocked, download the file directly
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.orderNumber || order.id || 'receipt'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
