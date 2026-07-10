import { jsPDF } from "jspdf";

export interface AnalyticsRecord {
  id: string;
  date: string;
  activeUsers: number;
  revenue: number;
  pageViews: number;
  signups: number;
}

export interface Summary {
  totalRevenue: number;
  averageActiveUsers: number;
  totalPageViews: number;
  totalSignups: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  orgName: string;
  plan: string;
}

export const exportPDFReport = (user: User, summary: Summary, records: AnalyticsRecord[]) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Colors
  const primaryColor = [79, 70, 229]; // Indigo hex #4f46e5
  const secondaryColor = [15, 23, 42]; // Dark slate #0f172a
  const successColor = [16, 185, 129]; // Emerald #10b981
  const lightGray = [248, 250, 252]; // Soft off-white #f8fafc
  const borderGray = [226, 232, 240]; // Slate-200 #e2e8f0
  const textDark = [51, 65, 85]; // slate-700
  const textLight = [148, 163, 184]; // slate-400

  let currentPageNum = 1;

  const drawHeaderAndFooter = (page: number) => {
    doc.setPage(page);

    // --- Header ---
    // Filled branding box (Top Left)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, 15, 12, 12, 2, 2, "F");
    
    // Logo Text "SM" inside the branding box
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("M", margin + 3.5, 23.5);

    // Brand Name & Subheading
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SaaSMetrics", margin + 15, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text("HIGH DENSITY METRICS PLATFORM", margin + 15, 25.5);

    // Right aligned Document Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("ORGANIZATION PERFORMANCE REPORT", pageWidth - margin, 21, { align: "right" });

    // Document timestamp
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 25.5, { align: "right" });

    // Header divider line
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 31, pageWidth - margin, 31);

    // --- Footer ---
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.text("● CRYPTOGRAPHICALLY ISOLATED", margin, pageHeight - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Tenant Reference: org-${user.organizationId.slice(0, 12)}`, margin + 50, pageHeight - 13);

    const footerText = `Page ${page}`;
    doc.text(footerText, pageWidth - margin, pageHeight - 13, { align: "right" });
  };

  // Initial Header/Footer setup for Page 1
  drawHeaderAndFooter(1);

  let y = 38;

  // --- Workspace Metadata Block ---
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, "FD");

  // Col 1: Workspace Detail
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text("ORGANIZATION WORKSPACE", margin + 5, y + 6);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(user.orgName, margin + 5, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Tenant ID: org-${user.organizationId}`, margin + 5, y + 20);
  doc.text(`Active Subscription Plan: ${user.plan} Subscription`, margin + 5, y + 25);

  // Col 2: Requester Profile Detail
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text("AUTHORIZED REQUESTER PROFILE", margin + contentWidth / 2 + 5, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(user.name, margin + contentWidth / 2 + 5, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Email Domain: ${user.email}`, margin + contentWidth / 2 + 5, y + 20);
  doc.text(`Assigned Permission Role: ${user.role}`, margin + contentWidth / 2 + 5, y + 25);

  y += 38;

  // --- KPI Highlights Block ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("KEY PERFORMANCE METRICS SUMMARY", margin, y);
  
  y += 4;

  const kpiBoxWidth = (contentWidth - 9) / 4; // 4 columns with spacing
  const kpis = [
    { label: "TOTAL REVENUE", val: `$${summary.totalRevenue.toLocaleString()}`, color: primaryColor },
    { label: "AVG ACTIVE USERS", val: summary.averageActiveUsers.toString(), color: secondaryColor },
    { label: "TOTAL PAGE VIEWS", val: summary.totalPageViews.toLocaleString(), color: secondaryColor },
    { label: "NEW SIGNUPS", val: `+${summary.totalSignups}`, color: successColor },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiBoxWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(kpiX, y, kpiBoxWidth, 24, 1.5, 1.5, "FD");

    // Decorative top thin accent line
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(kpiX, y, kpiBoxWidth, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(kpi.label, kpiX + 4, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(kpi.val, kpiX + 4, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    if (idx === 0) doc.text("100% verified stream", kpiX + 4, y + 21);
    else if (idx === 1) doc.text("Rolling daily visits", kpiX + 4, y + 21);
    else if (idx === 2) doc.text("Tenant analytics hits", kpiX + 4, y + 21);
    else if (idx === 3) doc.text("Organic member seats", kpiX + 4, y + 21);
  });

  y += 34;

  // --- Historical Metric Table ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("HISTORICAL METRIC TIMELINE LOGS", margin, y);

  y += 4;

  // Table columns definition
  const columns = [
    { header: "REPORTING DATE", width: 35, align: "left" },
    { header: "ACTIVE USERS", width: 32, align: "right" },
    { header: "PAGE VIEWS", width: 35, align: "right" },
    { header: "NEW SIGNUPS", width: 35, align: "right" },
    { header: "GENERATED REVENUE", width: 43, align: "right" },
  ];

  // Draw Table Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, y, contentWidth, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let colX = margin;
  columns.forEach((col) => {
    const textX = col.align === "left" ? colX + 3 : colX + col.width - 3;
    doc.text(col.header, textX, y + 5.5, { align: col.align as "left" | "right" });
    colX += col.width;
  });

  y += 8;

  // Render Table Records
  // Slice or sort the records to show in order (oldest to newest or vice versa - let's preserve Dashboard order)
  records.slice().reverse().forEach((rec, recIdx) => {
    // Page height boundaries check: add page if needed
    if (y + 10 > pageHeight - 25) {
      currentPageNum += 1;
      doc.addPage();
      drawHeaderAndFooter(currentPageNum);
      
      // Re-draw table header on new page
      y = 35;
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(margin, y, contentWidth, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let innerColX = margin;
      columns.forEach((col) => {
        const textX = col.align === "left" ? innerColX + 3 : innerColX + col.width - 3;
        doc.text(col.header, textX, y + 5.5, { align: col.align as "left" | "right" });
        innerColX += col.width;
      });

      y += 8;
    }

    // Zebra striping
    if (recIdx % 2 === 0) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y, contentWidth, 7.5, "F");

    // Horizontal row borders
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

    // Write text cell values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    let rowColX = margin;

    // Date
    doc.text(rec.date, rowColX + 3, y + 5, { align: "left" });
    rowColX += columns[0].width;

    // Active Users
    doc.setFont("courier", "normal");
    doc.text(rec.activeUsers.toLocaleString(), rowColX + columns[1].width - 3, y + 5, { align: "right" });
    rowColX += columns[1].width;

    // Page Views
    doc.text(rec.pageViews.toLocaleString(), rowColX + columns[2].width - 3, y + 5, { align: "right" });
    rowColX += columns[2].width;

    // Signups
    doc.setFont("helvetica", "bold");
    if (rec.signups > 0) {
      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
      doc.text(`+${rec.signups}`, rowColX + columns[3].width - 3, y + 5, { align: "right" });
    } else {
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text("0", rowColX + columns[3].width - 3, y + 5, { align: "right" });
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    rowColX += columns[3].width;

    // Revenue
    doc.setFont("courier", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`$${rec.revenue.toFixed(2)}`, rowColX + columns[4].width - 3, y + 5, { align: "right" });
    
    y += 7.5;
  });

  // Save the report with organization and date in file name
  const formattedDate = new Date().toISOString().split("T")[0];
  const filename = `${user.orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report-${formattedDate}.pdf`;
  doc.save(filename);
};
