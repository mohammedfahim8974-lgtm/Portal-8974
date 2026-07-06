import React from "react";
import {
  Plus,
  Trash2,
  Calculator,
  Receipt,
  Download,
  User,
  MapPin,
  Clock,
  DollarSign,
  Database,
  FileText,
  File as FileIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Printer,
  Eye,
  X,
  Cloud,
  UploadCloud,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AllSitesSummary } from "./AllSitesSummary";
import {
  cn,
  getLocalDateString,
  safeShowPicker,
  getSiteRate,
  getSiteSettings,
  isSameSite,
} from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { Worker, AttendanceRecord, SystemSettings } from "../types";
import { SitePrintPreview } from "./SitePrintPreview";
import {
  googleSignIn,
  logout,
  initAuth,
  createFolder,
  findInDrive,
  uploadFile,
} from "../lib/driveService";

interface Entry {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  siteName: string;
  hours: number;
  chargedHours: number; // Added
  otHours: number;
  dailyHours: { [day: number]: number | "A" };
}

export interface WorkerCalculation {
  workerId: string;
  workerName: string;
  workerRole: string;
  sites: {
    siteName: string;
    hours: number;
    chargedHours: number;
    otHours: number;
  }[]; // Added
  dailyHours: { [day: number]: number | "A" };
  totalHours: number;
  totalChargedHours: number; // Added
  totalOTHours: number;
  hourlyRate: number;
  subtotal: number;
  margin: number;
  vat: number;
  total: number;
  workerCost: number;
}

interface ConstructionCalculatorProps {
  projectSites?: string[];
  attendance: AttendanceRecord[];
  workers: Worker[];
  settings: SystemSettings;
  selectedMonth: Date;
}

// Pure helper function to calculate site reports on the fly without state updates
export const computeSiteReport = (
  siteName: string,
  localSelectedMonth: Date,
  attendance: AttendanceRecord[],
  workers: Worker[],
  settings: SystemSettings,
  daysInMonth: { day: number; name: string }[],
) => {
  const siteConfig = getSiteSettings(siteName, settings.siteSettings);
  const minCharge =
    siteConfig?.minChargeHours ||
    getSiteRate(siteName, settings.siteMinChargeHours) ||
    0;

  const siteEntries: Entry[] = [];
  const workerHours: { [workerId: string]: number } = {};
  const workerChargedHours: { [workerId: string]: number } = {};
  const workerOTHours: { [workerId: string]: number } = {};
  const workerDailyHours: { [workerId: string]: { [key: string]: any } } = {};

  const daysInPeriod: number[] = [];
  const daysCount = daysInMonth.length;
  for (let i = 1; i <= daysCount; i++) daysInPeriod.push(i);

  const monthIndex = localSelectedMonth.getMonth();
  const yearValue = localSelectedMonth.getFullYear();

  attendance.forEach((record) => {
    if (record.site && isSameSite(record.site, siteName)) {
      const parts = record.date.split("-");
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);

      const isSameMonth = m - 1 === monthIndex && y === yearValue;
      if (!isSameMonth) return;

      const dayNum = d;
      if (record.workerIds) {
        const h = Number(record.hours) || 0;
        const ot = Number(record.otHours) || 0;
        const standardHours = siteConfig?.workerStandardHours || 9;

        let normalHours = 0;
        let calcOt = 0;
        let hCharged = h;

        if (minCharge > 0 && h > 0 && h < minCharge) {
          normalHours = minCharge;
          calcOt = 0;
          hCharged = minCharge;
        } else {
          calcOt = ot > 0 ? ot : Math.max(0, h - standardHours);
          normalHours =
            ot > 0
              ? Math.min(Math.max(0, h - ot), standardHours)
              : Math.min(h, standardHours);
        }

        const dateObj = new Date(y, m - 1, d);
        const otMultiplier = dateObj.getDay() === 0 ? 1.5 : 1.0;
        const payableHours = normalHours + calcOt * otMultiplier;

        record.workerIds.forEach((workerId) => {
          workerHours[workerId] = (workerHours[workerId] || 0) + h;
          workerChargedHours[workerId] =
            (workerChargedHours[workerId] || 0) + hCharged;

          if (!workerDailyHours[workerId]) {
            workerDailyHours[workerId] = {} as any;
          }
          workerDailyHours[workerId]["__payable"] =
            (Number(workerDailyHours[workerId]["__payable"]) || 0) +
            payableHours;
            
          const workerObj = workers.find(w => w.id === workerId);
          let hourlyRate = 0;
          if (workerObj) {
            hourlyRate = (Number(workerObj.monthlySalary) || 0) / 270;
          }
          let dayWorkerCost = 0;
          if (dateObj.getDay() === 0) { // Sunday
            dayWorkerCost = h * 1.5 * hourlyRate;
          } else {
            // normal day
            const wNormal = Math.min(h, 9);
            const wOt = Math.max(0, h - 9);
            dayWorkerCost = (wNormal + wOt) * hourlyRate; // Since otRate = hourlyRate, it's just h * hourlyRate
          }
          workerDailyHours[workerId]["__workerCost"] = (Number(workerDailyHours[workerId]["__workerCost"]) || 0) + dayWorkerCost;
          const recordRate = Number(record.rate) || 0;
          workerDailyHours[workerId]["__revenue"] = (Number(workerDailyHours[workerId]["__revenue"]) || 0) + (payableHours * recordRate);

          workerOTHours[workerId] = (workerOTHours[workerId] || 0) + calcOt;
          workerDailyHours[workerId][dayNum] =
            (Number(workerDailyHours[workerId][dayNum]) || 0) + hCharged;
        });
      }
    }
  });

  workers.forEach((worker) => {
    if (worker.status !== "Active") return;

    const hours = workerHours[worker.id] || 0;
    const chargedHours = workerChargedHours[worker.id] || 0;
    const otHours = workerOTHours[worker.id] || 0;
    const isAssigned = worker.assignedSites?.some((site) =>
      isSameSite(site, siteName),
    );

    if (hours > 0 || otHours > 0) {
      const daily = workerDailyHours[worker.id];
      if (isAssigned) {
        daysInPeriod.forEach((day) => {
          if (daily[day] === undefined) {
            daily[day] = "A";
          }
        });
      }

      siteEntries.push({
        id: `${worker.id}-${siteName}`,
        workerId: worker.id,
        workerName: worker.name,
        workerRole: worker.role || "Worker",
        siteName: siteName,
        hours: hours,
        chargedHours: chargedHours,
        otHours: otHours,
        dailyHours: daily as any,
      });
    }
  });

  
  const marginPercentage = settings.marginPercentage ?? 0;
  const vatPercentage =
    siteConfig?.vatPercentage !== undefined
      ? siteConfig.vatPercentage
      : settings.vatPercentage !== undefined
        ? settings.vatPercentage
        : 5;

  const calculations = siteEntries.map((entry): WorkerCalculation => {
    const actualPayable = (entry.dailyHours as any)["__payable"] || entry.hours;
    const finalPayable = Math.max(actualPayable, entry.chargedHours);

    let subtotal = (entry.dailyHours as any)["__revenue"] || 0;
    if (finalPayable > actualPayable && actualPayable > 0) {
      subtotal += (finalPayable - actualPayable) * (subtotal / actualPayable);
    }
    const margin = subtotal * (marginPercentage / 100);
    const vat = (subtotal + margin) * (vatPercentage / 100);
    const total = subtotal + margin + vat;
    const workerCost = (entry.dailyHours as any)["__workerCost"] || 0;
    return {
      workerId: entry.workerId,
      workerName: entry.workerName,
      workerRole: entry.workerRole,
      sites: [
        {
          siteName: entry.siteName,
          hours: entry.hours,
          chargedHours: entry.chargedHours,
          otHours: entry.otHours,
        },
      ],
      dailyHours: entry.dailyHours,
      totalHours: entry.hours,
      totalChargedHours: finalPayable,
      totalOTHours: entry.otHours,
      hourlyRate: finalPayable > 0 ? (subtotal / finalPayable) : 0,
      subtotal,
      margin,
      vat,
      total,
      workerCost,
    };
  });

  const totals = {
    hours: calculations.reduce((sum, c) => sum + c.totalHours, 0),
    otHours: calculations.reduce((sum, c) => sum + c.totalOTHours, 0),
    chargedHours: calculations.reduce((sum, c) => sum + c.totalChargedHours, 0),
    subtotal: calculations.reduce((sum, c) => sum + c.subtotal, 0),
    margin: calculations.reduce((sum, c) => sum + c.margin, 0),
    vat: calculations.reduce((sum, c) => sum + c.vat, 0),
    amount: calculations.reduce((sum, c) => sum + c.total, 0),
    totalPayout: calculations.reduce((sum, c) => sum + c.workerCost, 0),
    byDay: daysInMonth.reduce(
      (acc, d) => {
        acc[d.day] = calculations.reduce(
          (sum, c) => sum + (Number(c.dailyHours[d.day]) || 0),
          0,
        );
        return acc;
      },
      {} as { [day: number]: number },
    ),
  };

  return { calculations, totals };
};

// Helper to generate jsPDF and return Blob
const generatePdfBlob = (
  siteName: string,
  localSelectedMonth: Date,
  calculations: WorkerCalculation[],
  totals: any,
  daysInMonth: { day: number; name: string }[],
  settings: SystemSettings,
  siteComment: string = "",
): Blob => {
  const doc = new jsPDF("l", "mm", "a3"); // Landscape A3 for more space
  const marginPercentage = settings.marginPercentage ?? 0;
  const siteConfig = getSiteSettings(siteName, settings.siteSettings);
  const vatPercentage =
    siteConfig?.vatPercentage !== undefined
      ? siteConfig.vatPercentage
      : settings.vatPercentage !== undefined
        ? settings.vatPercentage
        : 5;

  doc.setFontSize(20);
  doc.text("Site Payment Report", 14, 22);
  doc.setFontSize(12);
  doc.text(`Site: ${siteName}`, 14, 32);
  doc.text(
    `Period: ${localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
    14,
    38,
  );

  const dayHeaders = daysInMonth.map((d) => d.day.toString());
  const tableColumn = [
    "Name",
    "Trade",
    "Rate",
    ...dayHeaders,
    "Worked",
    "Charged",
    "Subtotal",
    ...(marginPercentage > 0 ? [`Margin ${marginPercentage}%`] : []),
    `VAT ${vatPercentage}%`,
    "Payable",
  ];

  const tableRows = calculations.map((calc, index) => [
    (index + 1).toString(),
    calc.workerName,
    calc.workerRole,
    calc.hourlyRate.toFixed(2),
    ...daysInMonth.map((d) => calc.dailyHours[d.day] || ""),
    calc.totalHours,
    calc.totalChargedHours.toFixed(2),
    calc.subtotal.toFixed(2),
    ...(marginPercentage > 0 ? [calc.margin.toFixed(2)] : []),
    calc.vat.toFixed(2),
    calc.total.toFixed(2),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [20, 20, 20] },
    foot: [
        [
          "Total",
          "",
          "",
          "",
        ...daysInMonth.map((d) => totals.byDay[d.day]),
        totals.hours,
        totals.chargedHours.toFixed(2),
        totals.subtotal.toFixed(2),
        ...(marginPercentage > 0 ? [totals.margin.toFixed(2)] : []),
        totals.vat.toFixed(2),
        totals.amount.toFixed(2),
      ],
    ],
    footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });
    if (siteComment) {
      
    const finalYBeforeTotals = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Payout: ${totals.totalPayout.toFixed(2)} AED`, 14, finalYBeforeTotals + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Net Profit: ${(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED`, 14, finalYBeforeTotals + 16);
    doc.setTextColor(100);
    const finalY = finalYBeforeTotals + 20; // adjust for comments

      doc.setFontSize(10);
      doc.text("Remarks / Comments:", 14, finalY + 10);
      doc.setFontSize(9);
      doc.setTextColor(100);
      const splitComment = doc.splitTextToSize(siteComment, doc.internal.pageSize.width - 28);
      doc.text(splitComment, 14, finalY + 15);
    }

  return doc.output("blob");
};

// Helper to generate docx and return Blob
const generateWordBlob = async (
  siteName: string,
  localSelectedMonth: Date,
  calculations: WorkerCalculation[],
  totals: any,
  daysInMonth: { day: number; name: string }[],
  settings: SystemSettings,
  siteComment: string = "",
): Promise<Blob> => {
  const marginPercentage = settings.marginPercentage ?? 0;
  const siteConfig = getSiteSettings(siteName, settings.siteSettings);
  const vatPercentage =
    siteConfig?.vatPercentage !== undefined
      ? siteConfig.vatPercentage
      : settings.vatPercentage !== undefined
        ? settings.vatPercentage
        : 5;
  const dayHeaders = daysInMonth.map((d) => d.day.toString());
  const headers = [
      "S.No",
      "Name",
    "Trade",
    "Rate",
    ...dayHeaders,
    "Worked",
    "Charged",
    "Subtotal",
    ...(marginPercentage > 0 ? [`Margin ${marginPercentage}%`] : []),
    `VAT ${vatPercentage}%`,
    "Payable",
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Site Payment Report",
                bold: true,
                size: 32,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Site: ${siteName}`, bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Period: ${localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${new Date().toLocaleDateString()}` }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Made by Mohammed Fahim Khan",
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: headers.map(
                  (text) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text, bold: true, size: 14 }),
                          ],
                        }),
                      ],
                      shading: { fill: "EEEEEE" },
                    }),
                ),
              }),
              ...calculations.map(
                (calc, index) =>
                  new TableRow({
                    children: [
                      (index + 1).toString(),
                      calc.workerName,
                      calc.workerRole,
                      calc.hourlyRate.toFixed(2),
                      ...daysInMonth.map(
                        (d) => calc.dailyHours[d.day]?.toString() || "",
                      ),
                      calc.totalHours.toString(),
                      calc.totalChargedHours.toFixed(2),
                      calc.subtotal.toFixed(2),
                      ...(marginPercentage > 0 ? [calc.margin.toFixed(2)] : []),
                      calc.vat.toFixed(2),
                      calc.total.toFixed(2),
                    ].map(
                      (text) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text, size: 12 })],
                            }),
                          ],
                        }),
                    ),
                  }),
              ),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "TOTAL", bold: true })],
                      }),
                    ],
                    shading: { fill: "F5F5F5" },
                    columnSpan: 4,
                  }),
                  ...daysInMonth.map(
                    (d) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: totals.byDay[d.day].toString(),
                          }),
                        ],
                        shading: { fill: "F5F5F5" },
                      }),
                  ),
                  new TableCell({
                    children: [
                      new Paragraph({ text: totals.hours.toString() }),
                    ],
                    shading: { fill: "F5F5F5" },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: totals.chargedHours.toFixed(2) }),
                    ],
                    shading: { fill: "F5F5F5" },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: totals.subtotal.toFixed(2) }),
                    ],
                    shading: { fill: "F5F5F5" },
                  }),
                  ...(marginPercentage > 0
                    ? [
                        new TableCell({
                          children: [
                            new Paragraph({ text: totals.margin.toFixed(2) }),
                          ],
                          shading: { fill: "F5F5F5" },
                        }),
                      ]
                    : []),
                  new TableCell({
                    children: [new Paragraph({ text: totals.vat.toFixed(2) })],
                    shading: { fill: "F5F5F5" },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: totals.amount.toFixed(2) }),
                    ],
                    shading: { fill: "F5F5F5" },
                  }),
                ],
              }),
            ],
          }),
          
          new Paragraph({ text: "" }), // Spacer
          new Paragraph({
            text: `Total Payout: ${totals.totalPayout.toFixed(2)} AED`,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            text: `Net Profit: ${(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED`,
            alignment: AlignmentType.RIGHT,
          }),
          ...(siteComment ? [

            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({
              children: [
                new TextRun({ text: "Remarks / Comments:", bold: true, size: 20 }),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: siteComment, size: 18 }),
              ]
            })
          ] : []),
        
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
};

export const ConstructionCalculator: React.FC<ConstructionCalculatorProps> = ({
  projectSites = [],
  attendance,
  workers,
  settings,
  selectedMonth,
}) => {
  const [localSelectedMonth, setLocalSelectedMonth] =
    React.useState<Date>(selectedMonth);
  const monthInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalSelectedMonth(selectedMonth);
  }, [selectedMonth]);

  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [absentWorkers, setAbsentWorkers] = React.useState<
    { workerId: string; workerName: string; days: number[] }[]
  >([]);
  const [selectedSite, setSelectedSite] = React.useState("ALL_SITES");
  const [hourlyRate, setHourlyRate] = React.useState<string>("");
  const [showResults, setShowResults] = React.useState(false);
  const [calculationPeriod, setCalculationPeriod] = React.useState<
    "monthly" | "weekly"
  >("monthly");
  const [startDay, setStartDay] = React.useState<number>(1);
  const [endDay, setEndDay] = React.useState<number>(settings.totalWorkingDays);
  const [siteComments, setSiteComments] = React.useState<{ [siteName: string]: string }>({});

  React.useEffect(() => {
    setEndDay((prev) => Math.min(prev, settings.totalWorkingDays));
  }, [settings.totalWorkingDays]);

  React.useEffect(() => {
    if (selectedSite) {
      const rate = getSiteRate(selectedSite, settings.siteRates);
      setHourlyRate(rate > 0 ? String(rate) : "");
    } else {
      setHourlyRate("");
    }
  }, [selectedSite, settings.siteRates]);
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);

  // Google Drive state
  const [driveUser, setDriveUser] = React.useState<any | null>(null);
  const [driveToken, setDriveToken] = React.useState<string | null>(null);
  const [isDriveBackingUp, setIsDriveBackingUp] = React.useState(false);
  const [backupProgress, setBackupProgress] = React.useState<{
    current: number;
    total: number;
    message: string;
    status: "idle" | "auth" | "creating" | "uploading" | "completed" | "error";
    parentFolderId?: string;
  }>({
    current: 0,
    total: 0,
    message: "",
    status: "idle",
  });

  React.useEffect(() => {
    // Check if user is already authenticated and subscribe
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        if (token) setDriveToken(token);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleBackUpAllToGoogleDrive = async () => {
    let currentToken = driveToken;
    let currentUser = driveUser;

    setIsDriveBackingUp(true);
    setBackupProgress({
      current: 0,
      total: projectSites.length,
      message: "Authenticating with Google Drive...",
      status: "auth",
    });

    try {
      if (!currentToken || !currentUser) {
        const result = await googleSignIn();
        if (result) {
          currentToken = result.accessToken;
          currentUser = result.user;
          setDriveUser(result.user);
          setDriveToken(result.accessToken);
        } else {
          throw new Error("Google Drive authorization canceled or failed.");
        }
      }

      if (!currentToken) {
        throw new Error("Access token is missing after authorization.");
      }

      // 2. Identify / create parent folder on Google Drive
      const monthLabel = localSelectedMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      const parentFolderName = `Labour Calculations - ${monthLabel}`;

      setBackupProgress((prev) => ({
        ...prev,
        message: `Finding or creating folder "${parentFolderName}" on Drive...`,
        status: "creating",
      }));

      let parentFolderId = await findInDrive(
        currentToken,
        parentFolderName,
        "application/vnd.google-apps.folder",
      );
      if (!parentFolderId) {
        parentFolderId = await createFolder(currentToken, parentFolderName);
      }

      // 3. Process each site with calculations
      let successCount = 0;
      const sitesToProcess = projectSites;

      setBackupProgress((prev) => ({
        ...prev,
        total: sitesToProcess.length,
        status: "uploading",
      }));

      for (let i = 0; i < sitesToProcess.length; i++) {
        const siteName = sitesToProcess[i];

        setBackupProgress((prev) => ({
          ...prev,
          current: i + 1,
          message: `Generating & syncing site files for "${siteName}"...`,
        }));

        // Compute report calculation logic for the site
        const { calculations: siteCalcs, totals: siteTotals } =
          computeSiteReport(
            siteName,
            localSelectedMonth,
            attendance,
            workers,
            settings,
            daysInMonth,
          );

        if (siteCalcs.length === 0) {
          // Skip empty site calculation report to keep Google Drive folder clean
          continue;
        }

        // Generate PDF blob
        const pdfBlob = generatePdfBlob(
          siteName,
          localSelectedMonth,
          siteCalcs,
          siteTotals,
          daysInMonth,
          settings,
          siteComments[siteName],
        );

        // Generate DOCX blob
        const docxBlob = await generateWordBlob(
          siteName,
          localSelectedMonth,
          siteCalcs,
          siteTotals,
          daysInMonth,
          settings,
          siteComments[siteName],
        );

        // Find or create a folder with the site name inside the parent folder
        const siteFolderName = `Site - ${siteName}`;
        let siteFolderId = await findInDrive(
          currentToken,
          siteFolderName,
          "application/vnd.google-apps.folder",
          parentFolderId,
        );
        if (!siteFolderId) {
          siteFolderId = await createFolder(
            currentToken,
            siteFolderName,
            parentFolderId,
          );
        }

        // Upload both PDF and DOCX reports into this site folder
        const localDate = getLocalDateString();
        const pdfName = `Site_Report_${siteName}_${localDate}.pdf`;
        const docxName = `Site_Report_${siteName}_${localDate}.docx`;

        // Upload PDF
        await uploadFile(
          currentToken,
          pdfName,
          "application/pdf",
          pdfBlob,
          siteFolderId,
        );

        // Upload DOCX
        await uploadFile(
          currentToken,
          docxName,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          docxBlob,
          siteFolderId,
        );

        successCount++;
      }

      setBackupProgress((prev) => ({
        ...prev,
        message: `Successfully uploaded reports for ${successCount} sites into Google Drive!`,
        status: "completed",
        parentFolderId: parentFolderId || undefined,
      }));
    } catch (err: any) {
      console.error("Drive Backup Error:", err);
      setBackupProgress((prev) => ({
        ...prev,
        message: err.message || "Drive Backup failed. Please try again.",
        status: "error",
      }));
    }
  };

  const daysInMonth = React.useMemo(() => {
    const year = localSelectedMonth.getFullYear();
    const month = localSelectedMonth.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 1; i <= daysCount; i++) {
      const d = new Date(year, month, i);
      result.push({
        day: i,
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }
    return result;
  }, [localSelectedMonth]);

  const handleSyncFromSite = () => {
    if (!selectedSite) return;

    const siteConfig = getSiteSettings(selectedSite, settings.siteSettings);
    const minCharge =
      siteConfig?.minChargeHours ||
      getSiteRate(selectedSite, settings.siteMinChargeHours) ||
      0;

    const siteEntries: Entry[] = [];
    const siteAbsences: {
      [workerId: string]: {
        workerId: string;
        workerName: string;
        days: number[];
      };
    } = {};

    const workerHours: { [workerId: string]: number } = {};
    const workerChargedHours: { [workerId: string]: number } = {};
    const workerOTHours: { [workerId: string]: number } = {};
    const workerDailyHours: {
      [workerId: string]: { [day: number]: number | "A" };
    } = {};

    const daysInPeriod: number[] = [];
    if (calculationPeriod === "monthly") {
      const daysCount = daysInMonth.length;
      for (let i = 1; i <= daysCount; i++) daysInPeriod.push(i);
    } else {
      for (let i = startDay; i <= endDay; i++) daysInPeriod.push(i);
    }

    const monthIndex = localSelectedMonth.getMonth();
    const yearValue = localSelectedMonth.getFullYear();

    attendance.forEach((record) => {
      if (record.site && isSameSite(record.site, selectedSite)) {
        // Use fast string split for date
        const parts = record.date.split("-");
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const d = parseInt(parts[2]);

        const isSameMonth = m - 1 === monthIndex && y === yearValue;

        if (!isSameMonth) return;

        const dayNum = d;
        const isInRange =
          calculationPeriod === "monthly" ||
          (dayNum >= startDay && dayNum <= endDay);

        if (isInRange && record.workerIds) {
          const h = Number(record.hours) || 0;
          const ot = Number(record.otHours) || 0;
          const standardHours = siteConfig?.workerStandardHours || 9;

          let normalHours = 0;
          let calcOt = 0;
          let hCharged = h;

          if (minCharge > 0 && h > 0 && h < minCharge) {
            normalHours = minCharge;
            calcOt = 0;
            hCharged = minCharge;
          } else {
            calcOt = ot > 0 ? ot : Math.max(0, h - standardHours);
            normalHours =
              ot > 0
                ? Math.min(Math.max(0, h - ot), standardHours)
                : Math.min(h, standardHours);
          }

          // Apply Sunday multiplier directly to the equivalent hours
          const dateObj = new Date(y, m - 1, d);
          const otMultiplier = dateObj.getDay() === 0 ? 1.5 : 1.0;

          const payableHours = normalHours + calcOt * otMultiplier;

          record.workerIds.forEach((workerId) => {
            // we store payableHours in workerHours so that subtotal is strictly (payableHours * rate)
            // Wait, if it's bounded by minCharge below, minCharge is against actual hours worked.
            workerHours[workerId] = (workerHours[workerId] || 0) + h;
            workerChargedHours[workerId] =
              (workerChargedHours[workerId] || 0) + hCharged;

            // Keep a separate accumulator for exactly the payable amount
            if (!workerDailyHours[workerId]) {
              workerDailyHours[workerId] = {};
            }
            // Add a new hidden field `payable` to track this
            workerDailyHours[workerId]["__payable"] =
            (Number(workerDailyHours[workerId]["__payable"]) || 0) +
            payableHours;
            
          const workerObj = workers.find(w => w.id === workerId);
          let hourlyRate = 0;
          if (workerObj) {
            hourlyRate = (Number(workerObj.monthlySalary) || 0) / 270;
          }
          let dayWorkerCost = 0;
          if (dateObj.getDay() === 0) { // Sunday
            dayWorkerCost = h * 1.5 * hourlyRate;
          } else {
            // normal day
            const wNormal = Math.min(h, 9);
            const wOt = Math.max(0, h - 9);
            dayWorkerCost = (wNormal + wOt) * hourlyRate; // Since otRate = hourlyRate, it's just h * hourlyRate
          }
          workerDailyHours[workerId]["__workerCost"] = (Number(workerDailyHours[workerId]["__workerCost"]) || 0) + dayWorkerCost;
          const recordRate = Number(record.rate) || 0;
          workerDailyHours[workerId]["__revenue"] = (Number(workerDailyHours[workerId]["__revenue"]) || 0) + (payableHours * recordRate);

          workerOTHours[workerId] = (workerOTHours[workerId] || 0) + calcOt;
            workerDailyHours[workerId][dayNum] =
              (Number(workerDailyHours[workerId][dayNum]) || 0) + hCharged;
          });
        }
      }
    });

    // Process all workers
    workers.forEach((worker) => {
      if (worker.status !== "Active") return;

      const hours = workerHours[worker.id] || 0;
      const chargedHours = workerChargedHours[worker.id] || 0;
      const otHours = workerOTHours[worker.id] || 0;
      const isAssigned = worker.assignedSites?.some((site) =>
        isSameSite(site, selectedSite),
      );

      if (hours > 0 || otHours > 0) {
        const daily = workerDailyHours[worker.id];
        if (isAssigned) {
          daysInPeriod.forEach((day) => {
            const dateStr = `${yearValue}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isBeforeJoin = worker.joiningDate && worker.joiningDate > dateStr;
            const isOnVacation = worker.vacationStartDate && worker.vacationStartDate <= dateStr && (!worker.vacationReturnDate || worker.vacationReturnDate > dateStr);

            if (daily[day] === undefined && !isBeforeJoin && !isOnVacation) {
              daily[day] = "A";
            }
          });
        }

        siteEntries.push({
          id: `${worker.id}-${selectedSite}`,
          workerId: worker.id,
          workerName: worker.name,
          workerRole: worker.role || "Worker",
          siteName: selectedSite,
          hours: hours,
          chargedHours: chargedHours,
          otHours: otHours,
          dailyHours: daily,
        });
      } else if (isAssigned) {
        const absentDaysForWorker = daysInPeriod.filter((day) => {
           const dateStr = `${yearValue}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
           const isBeforeJoin = worker.joiningDate && worker.joiningDate > dateStr;
           const isOnVacation = worker.vacationStartDate && worker.vacationStartDate <= dateStr && (!worker.vacationReturnDate || worker.vacationReturnDate > dateStr);
           return !isBeforeJoin && !isOnVacation;
        });

        if (absentDaysForWorker.length > 0) {
            siteAbsences[worker.id] = {
              workerId: worker.id,
              workerName: worker.name,
              days: absentDaysForWorker,
            };
        }
      }
    });

    setEntries(siteEntries);
    setAbsentWorkers(Object.values(siteAbsences));
    setShowResults(true);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const calculations = React.useMemo(() => {
    const rate = parseFloat(hourlyRate) || 0;
    const marginPercentage = settings.marginPercentage ?? 0;
    const siteConfig = getSiteSettings(selectedSite, settings.siteSettings);
    const vatPercentage =
      siteConfig?.vatPercentage !== undefined
        ? siteConfig.vatPercentage
        : settings.vatPercentage !== undefined
          ? settings.vatPercentage
          : 5;

    return entries.map((entry): WorkerCalculation => {
      const actualPayable =
        Number(entry.dailyHours["__payable"]) || entry.hours;
      const finalPayable = Math.max(actualPayable, entry.chargedHours); // if minCharge pushed it up

      let subtotal = (entry.dailyHours as any)["__revenue"] || 0;
      if (finalPayable > actualPayable && actualPayable > 0) {
        subtotal += (finalPayable - actualPayable) * (subtotal / actualPayable);
      }
      const margin = subtotal * (marginPercentage / 100);
      const vat = (subtotal + margin) * (vatPercentage / 100);
      const total = subtotal + margin + vat;
    const workerCost = (entry.dailyHours as any)["__workerCost"] || 0;
    return {
        workerId: entry.workerId,
        workerName: entry.workerName,
        workerRole: entry.workerRole,
        sites: [
          {
            siteName: entry.siteName,
            hours: entry.hours,
            chargedHours: entry.chargedHours,
            otHours: entry.otHours,
          },
        ],
        dailyHours: entry.dailyHours,
        totalHours: entry.hours,
        totalChargedHours: finalPayable,
        totalOTHours: entry.otHours,
        hourlyRate: finalPayable > 0 ? (subtotal / finalPayable) : 0,
        subtotal,
        margin,
        vat,
      total,
      workerCost,
    };
    });
  }, [
    entries,
    hourlyRate,
    settings.marginPercentage,
    settings.vatPercentage,
    settings.siteSettings,
    selectedSite,
  ]);

  const totals = React.useMemo(() => {
    return {
      hours: calculations.reduce((sum, c) => sum + c.totalHours, 0),
      otHours: calculations.reduce((sum, c) => sum + c.totalOTHours, 0),
      chargedHours: calculations.reduce(
        (sum, c) => sum + c.totalChargedHours,
        0,
      ),
      subtotal: calculations.reduce((sum, c) => sum + c.subtotal, 0),
      margin: calculations.reduce((sum, c) => sum + c.margin, 0),
      vat: calculations.reduce((sum, c) => sum + c.vat, 0),
      amount: calculations.reduce((sum, c) => sum + c.total, 0),
    totalPayout: calculations.reduce((sum, c) => sum + c.workerCost, 0),
      byDay: daysInMonth.reduce(
        (acc, d) => {
          acc[d.day] = calculations.reduce(
            (sum, c) => sum + (Number(c.dailyHours[d.day]) || 0),
            0,
          );
          return acc;
        },
        {} as { [day: number]: number },
      ),
    };
  }, [calculations, daysInMonth]);

  const handleDownloadReport = () => {
    if (calculations.length === 0) return;
    const marginPercentage = settings.marginPercentage ?? 0;
    const siteConfig = getSiteSettings(selectedSite, settings.siteSettings);
    const vatPercentage =
      siteConfig?.vatPercentage !== undefined
        ? siteConfig.vatPercentage
        : settings.vatPercentage !== undefined
          ? settings.vatPercentage
          : 5;

    const dayHeaders = daysInMonth.map((d) => d.day.toString());
    const headers = [
      "S.No",
      "Name",
      "Trade",
      "Rate",
      ...dayHeaders,
      "Worked",
      "Charged",
      "Subtotal",
      ...(marginPercentage > 0 ? [`Margin ${marginPercentage}%`] : []),
      `VAT ${vatPercentage}%`,
      "Payable",
    ];

    const rows = calculations.map((calc, index) => [
      (index + 1).toString(),
      calc.workerName,
      calc.workerRole,
      calc.hourlyRate,
      ...daysInMonth.map((d) => calc.dailyHours[d.day] || ""),
      calc.totalHours,
      calc.totalChargedHours.toFixed(2),
      calc.subtotal.toFixed(2),
      ...(marginPercentage > 0 ? [calc.margin.toFixed(2)] : []),
      calc.vat.toFixed(2),
      calc.total.toFixed(2),
    ]);

    const csvContent = [
      [`Site Report: ${selectedSite}`],
      [
        `Period: ${localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
      ],
      [],
      headers,
      ...rows,
      [],
      [
        "Total",
        "",
        "",
        "",
        ...daysInMonth.map((d) => totals.byDay[d.day]),
        totals.hours,
        totals.chargedHours.toFixed(2),
        totals.subtotal.toFixed(2),
        ...(marginPercentage > 0 ? [totals.margin.toFixed(2)] : []),
        totals.vat.toFixed(2),
        totals.amount.toFixed(2),
      ],
      [],
      ["Total Payout", totals.totalPayout.toFixed(2)],
      ["Net Profit", (totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)],
      
            new Paragraph({ text: "" }), // Spacer
            new Paragraph({
              text: `Total Payout: ${totals.totalPayout.toFixed(2)} AED`,
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({
              text: `Net Profit: ${(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED`,
              alignment: AlignmentType.RIGHT,
            }),
            ...(siteComments[selectedSite] ? [
[], ["Remarks / Comments", `"${siteComments[selectedSite].replace(/"/g, '""')}"`]] : [])
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Site_Report_${selectedSite}_${getLocalDateString()}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    if (calculations.length === 0) return;

    const doc = new jsPDF("l", "mm", "a3"); // Landscape A3 for more space
    const date = new Date().toLocaleDateString();
    const marginPercentage = settings.marginPercentage ?? 0;

    const siteConfig = getSiteSettings(selectedSite, settings.siteSettings);
    const vatPercentage =
      siteConfig?.vatPercentage !== undefined
        ? siteConfig.vatPercentage
        : settings.vatPercentage !== undefined
          ? settings.vatPercentage
          : 5;

    doc.setFontSize(20);
    doc.text("Site Payment Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Site: ${selectedSite}`, 14, 32);
    doc.text(
      `Period: ${localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
      14,
      38,
    );

    const dayHeaders = daysInMonth.map((d) => d.day.toString());
    const tableColumn = [
      "Name",
      "Trade",
      "Rate",
      ...dayHeaders,
      "Worked",
      "Charged",
      "Subtotal",
      ...(marginPercentage > 0 ? [`Margin ${marginPercentage}%`] : []),
      `VAT ${vatPercentage}%`,
      "Payable",
    ];

    const tableRows = calculations.map((calc, index) => [
    (index + 1).toString(),
    calc.workerName,
      calc.workerRole,
      calc.hourlyRate.toFixed(2),
      ...daysInMonth.map((d) => calc.dailyHours[d.day] || ""),
      calc.totalHours,
      calc.totalChargedHours.toFixed(2),
      calc.subtotal.toFixed(2),
      ...(marginPercentage > 0 ? [calc.margin.toFixed(2)] : []),
      calc.vat.toFixed(2),
      calc.total.toFixed(2),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [20, 20, 20] },
      foot: [
        [
          "Total",
          "",
          "",
          "",
          ...daysInMonth.map((d) => totals.byDay[d.day]),
          totals.hours,
          totals.chargedHours.toFixed(2),
          totals.subtotal.toFixed(2),
          ...(marginPercentage > 0 ? [totals.margin.toFixed(2)] : []),
          totals.vat.toFixed(2),
          totals.amount.toFixed(2),
        ],
      ],
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });
    const comment = siteComments[selectedSite];
    if (comment) {
      
    const finalYBeforeTotals = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Payout: ${totals.totalPayout.toFixed(2)} AED`, 14, finalYBeforeTotals + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Net Profit: ${(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED`, 14, finalYBeforeTotals + 16);
    doc.setTextColor(100);
    const finalY = finalYBeforeTotals + 20; // adjust for comments

      doc.setFontSize(10);
      doc.text("Remarks / Comments:", 14, finalY + 10);
      doc.setFontSize(9);
      doc.setTextColor(100);
      const splitComment = doc.splitTextToSize(comment, doc.internal.pageSize.width - 28);
      doc.text(splitComment, 14, finalY + 15);
    }
    doc.save(`Site_Report_${selectedSite}_${getLocalDateString()}.pdf`);
    setShowDownloadMenu(false);
  };

  const handleDownloadWord = async () => {
    if (calculations.length === 0) return;
    const marginPercentage = settings.marginPercentage ?? 0;
    const siteConfig = getSiteSettings(selectedSite, settings.siteSettings);
    const vatPercentage =
      siteConfig?.vatPercentage !== undefined
        ? siteConfig.vatPercentage
        : settings.vatPercentage !== undefined
          ? settings.vatPercentage
          : 5;

    const dayHeaders = daysInMonth.map((d) => d.day.toString());
    const headers = [
      "S.No",
      "Name",
      "Trade",
      "Rate",
      ...dayHeaders,
      "Worked",
      "Charged",
      "Subtotal",
      ...(marginPercentage > 0 ? [`Margin ${marginPercentage}%`] : []),
      `VAT ${vatPercentage}%`,
      "Payable",
    ];

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation: PageOrientation.LANDSCAPE,
              },
            },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Site Payment Report",
                  bold: true,
                  size: 32,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Site: ${selectedSite}`, bold: true }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Period: ${localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Made by Mohammed Fahim Khan",
                  italics: true,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: headers.map(
                    (text) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text, bold: true, size: 14 }),
                            ],
                          }),
                        ],
                        shading: { fill: "EEEEEE" },
                      }),
                  ),
                }),
                ...calculations.map(
                (calc, index) =>
                  new TableRow({
                    children: [
                      (index + 1).toString(),
                      calc.workerName,
                        calc.workerRole,
                        calc.hourlyRate.toFixed(2),
                        ...daysInMonth.map(
                          (d) => calc.dailyHours[d.day]?.toString() || "",
                        ),
                        calc.totalHours.toString(),
                        calc.totalChargedHours.toFixed(2),
                        calc.subtotal.toFixed(2),
                        ...(marginPercentage > 0
                          ? [calc.margin.toFixed(2)]
                          : []),
                        calc.vat.toFixed(2),
                        calc.total.toFixed(2),
                      ].map(
                        (text) =>
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [new TextRun({ text, size: 12 })],
                              }),
                            ],
                          }),
                      ),
                    }),
                ),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                              children: [
                                new TextRun({ text: "TOTAL", bold: true }),
                              ],
                            }),
                          ],
                          shading: { fill: "F5F5F5" },
                          columnSpan: 4,
                    }),
                    ...daysInMonth.map(
                      (d) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              text: totals.byDay[d.day].toString(),
                            }),
                          ],
                          shading: { fill: "F5F5F5" },
                        }),
                    ),
                    new TableCell({
                      children: [
                        new Paragraph({ text: totals.hours.toString() }),
                      ],
                      shading: { fill: "F5F5F5" },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({ text: totals.chargedHours.toFixed(2) }),
                      ],
                      shading: { fill: "F5F5F5" },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({ text: totals.subtotal.toFixed(2) }),
                      ],
                      shading: { fill: "F5F5F5" },
                    }),
                    ...(marginPercentage > 0
                      ? [
                          new TableCell({
                            children: [
                              new Paragraph({ text: totals.margin.toFixed(2) }),
                            ],
                            shading: { fill: "F5F5F5" },
                          }),
                        ]
                      : []),
                    new TableCell({
                      children: [
                        new Paragraph({ text: totals.vat.toFixed(2) }),
                      ],
                      shading: { fill: "F5F5F5" },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({ text: totals.amount.toFixed(2) }),
                      ],
                      shading: { fill: "F5F5F5" },
                    }),
                  ],
                }),
              ],
            }),
            
            new Paragraph({ text: "" }), // Spacer
            new Paragraph({
              text: `Total Payout: ${totals.totalPayout.toFixed(2)} AED`,
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({
              text: `Net Profit: ${(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED`,
              alignment: AlignmentType.RIGHT,
            }),
            ...(siteComments[selectedSite] ? [

              new Paragraph({ spacing: { before: 400 } }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Remarks / Comments:", bold: true, size: 20 }),
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: siteComments[selectedSite], size: 18 }),
                ]
              })
            ] : []),
          
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Site_Report_${selectedSite}_${getLocalDateString()}.docx`);
    setShowDownloadMenu(false);
  };

  return (
    <>
      <div className={cn("space-y-8", showPrintPreview && "print:hidden")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Site-Wide Payment Calculator
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Automatically calculate payments for all workers at a specific
              site
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEntries([]);
                setHourlyRate("");
                setShowResults(false);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Site Selection & Rate */}
          <div className="lg:col-span-1 space-y-6">
            <div className="relative bg-white dark:bg-[#141414] rounded-2xl p-6 border border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 dark:bg-emerald-500/5 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
                <MapPin
                  size={18}
                  className="text-zinc-400 group-hover:animate-bounce"
                />
                Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Calculation Date / Month
                  </label>
                  <div className="bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-xl px-2 py-1.5 flex items-center justify-between shadow-sm gap-1 relative">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalSelectedMonth(
                          new Date(
                            localSelectedMonth.getFullYear(),
                            localSelectedMonth.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg transition-colors overflow-hidden select-none relative">
                      <Calendar
                        className="text-emerald-500 shrink-0"
                        size={16}
                      />
                      <span className="text-zinc-900 dark:text-white font-black text-sm uppercase tracking-widest text-center">
                        {localSelectedMonth.toLocaleString("default", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <input
                        type="month"
                        value={`${localSelectedMonth.getFullYear()}-${String(localSelectedMonth.getMonth() + 1).padStart(2, "0")}`}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [y, m] = e.target.value.split("-");
                            setLocalSelectedMonth(
                              new Date(parseInt(y), parseInt(m) - 1, 1),
                            );
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalSelectedMonth(
                          new Date(
                            localSelectedMonth.getFullYear(),
                            localSelectedMonth.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Project Site
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={16}
                    />
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a site</option>
                      <option value="ALL_SITES">🌍 All Sites Summary</option>
                      {projectSites.map((site, index) => (
                        <option key={`${site}-${index}`} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Calculation Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCalculationPeriod("monthly")}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                        calculationPeriod === "monthly"
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                          : "bg-transparent text-zinc-500 border-line dark:border-white/10 hover:bg-[#F5F5F7] dark:hover:bg-white/5",
                      )}
                    >
                      Full Month
                    </button>
                    <button
                      onClick={() => setCalculationPeriod("weekly")}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                        calculationPeriod === "weekly"
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                          : "bg-transparent text-zinc-500 border-line dark:border-white/10 hover:bg-[#F5F5F7] dark:hover:bg-white/5",
                      )}
                    >
                      Weekly Range
                    </button>
                  </div>
                </div>

                {calculationPeriod === "weekly" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Start Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={settings.totalWorkingDays}
                        value={startDay || ""}
                        onChange={(e) =>
                          setStartDay(
                            Math.min(
                              settings.totalWorkingDays,
                              Math.max(1, parseInt(e.target.value) || 1),
                            ),
                          )
                        }
                        className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-lg text-sm outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        End Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={settings.totalWorkingDays}
                        value={endDay || ""}
                        onChange={(e) =>
                          setEndDay(
                            Math.min(
                              settings.totalWorkingDays,
                              Math.max(
                                1,
                                parseInt(e.target.value) ||
                                  settings.totalWorkingDays,
                              ),
                            ),
                          )
                        }
                        className="w-full px-3 py-2 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-lg text-sm outline-none dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSyncFromSite}
                  className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold shadow-lg shadow-zinc-900/10 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Database size={18} />
                  Load Site Data
                </button>
              </div>
            </div>

            <div className="relative bg-white dark:bg-[#141414] rounded-2xl p-6 border border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/3 dark:bg-blue-500/5 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
                <DollarSign
                  size={18}
                  className="text-zinc-400 group-hover:rotate-12 transition-transform"
                />
                Payment Rate
              </h3>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Hourly Rate (AED)
                </label>
                <div className="relative">
                  <Calculator
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    size={16}
                  />
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Google Drive Integration Card */}
            <div className="relative bg-white dark:bg-[#141414] rounded-2xl p-6 border border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/3 dark:bg-teal-500/5 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2 relative z-10 font-sans">
                <Cloud
                  size={18}
                  className="text-[#00c0a5] group-hover:scale-110 transition-transform animate-pulse"
                />
                Google Drive Backup
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 z-10 relative">
                Create doc folders on Google Drive automatically containing PDF
                and Word (.docx) calculation sheets for each site in order.
              </p>
              <div className="space-y-4 relative z-10">
                {driveUser ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-zinc-900/40 p-3 rounded-xl border border-line dark:border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {driveUser.displayName
                            ? driveUser.displayName[0].toUpperCase()
                            : "U"}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                            {driveUser.displayName || "Authorized User"}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            {driveUser.email || ""}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={logout}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        Disconnect
                      </button>
                    </div>

                    <button
                      onClick={handleBackUpAllToGoogleDrive}
                      disabled={projectSites.length === 0}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-teal-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      <UploadCloud size={14} />
                      Backup All Sites
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleBackUpAllToGoogleDrive}
                    className="w-full py-3 bg-teal-50/50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Cloud size={14} className="text-teal-500" />
                    Connect Google Drive
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Entries List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/3 dark:bg-purple-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between relative z-10">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Workers at {selectedSite || "Site"}
                </h3>
                <span className="px-2.5 py-1 bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {entries.length} Workers Found
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F7]/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5">
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-white/5 sticky left-0 bg-white dark:bg-[#141414] z-10 w-10"
                      >
                        S.No
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-white/5 sticky left-10 bg-white dark:bg-[#141414] z-10"
                      >
                        Name
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-white/5"
                      >
                        Trade
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-white/5"
                      >
                        Rate
                      </th>
                      {daysInMonth.map((d) => (
                        <th
                          key={d.day}
                          className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center border-r border-zinc-100 dark:border-white/5 min-w-[32px]"
                        >
                          {d.day}
                        </th>
                      ))}
                      <th
                        colSpan={3}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center"
                      >
                        TOTAL
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right"
                      >
                        Action
                      </th>
                    </tr>
                    <tr className="bg-[#F5F5F7]/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5">
                      {daysInMonth.map((d) => (
                        <th
                          key={`name-${d.day}`}
                          className={cn(
                            "px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-center border-r border-zinc-100 dark:border-white/5",
                            d.name === "Sun"
                              ? "text-emerald-500"
                              : "text-zinc-400",
                          )}
                        >
                          {d.name}
                        </th>
                      ))}
                      <th className="px-2 py-1 text-[8px] font-bold text-zinc-400 uppercase tracking-wider text-center border-r border-zinc-100 dark:border-white/5">
                        Worked Hrs
                      </th>
                      <th className="px-2 py-1 text-[8px] font-bold text-zinc-400 uppercase tracking-wider text-center border-r border-zinc-100 dark:border-white/5 font-bold text-emerald-600 dark:text-emerald-400">
                        Charged Hrs
                      </th>
                      <th className="px-2 py-1 text-[8px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    <AnimatePresence initial={false}>
                      {entries.length === 0 && (
                        <motion.tr
                          key="empty-state"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td
                            colSpan={daysInMonth.length + 7}
                            className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 italic text-sm"
                          >
                            {absentWorkers.length > 0
                              ? "No present workers found for this site in the selected period."
                              : 'Select a site and click "Load Site Data" to automatically pull data from attendance.'}
                          </td>
                        </motion.tr>
                      )}
                      {calculations.map((calc, index) => (
                        <motion.tr
                          key={`${calc.workerId}-${selectedSite}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-[#F5F5F7]/50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white border-r border-zinc-100 dark:border-white/5 sticky left-0 bg-white dark:bg-[#141414] z-10 text-center">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white border-r border-zinc-100 dark:border-white/5 sticky left-10 bg-white dark:bg-[#141414] z-10">
                            {calc.workerName}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 border-r border-zinc-100 dark:border-white/5">
                            {calc.workerRole}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-zinc-900 dark:text-white border-r border-zinc-100 dark:border-white/5">
                            {calc.hourlyRate.toFixed(1)}
                          </td>
                          {daysInMonth.map((d) => {
                            const val = calc.dailyHours[d.day];
                            return (
                              <td
                                key={`daily-hours-${calc.workerId}-${d.day}`}
                                className={cn(
                                  "px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5",
                                  val === "A"
                                    ? "text-red-500 font-bold"
                                    : val && d.name === "Sun"
                                      ? "text-emerald-500 font-bold"
                                      : "text-zinc-600 dark:text-zinc-400",
                                  d.name === "Sun" &&
                                    "bg-emerald-500/5 dark:bg-emerald-500/10",
                                )}
                              >
                                {val || ""}
                              </td>
                            );
                          })}
                          <td className="px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5 bg-[#F5F5F7]/50 dark:bg-zinc-800/50">
                            {calc.totalHours}
                          </td>
                          <td className="px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5 bg-[#F5F5F7]/50 dark:bg-zinc-800/50 font-bold">
                            {calc.totalChargedHours}
                          </td>
                          <td className="px-2 py-3 text-xs font-mono text-center bg-[#F5F5F7]/50 dark:bg-zinc-800/50 font-bold text-emerald-600 dark:text-emerald-400">
                            {calc.total.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() =>
                                handleRemoveEntry(
                                  `${calc.workerId}-${selectedSite}`,
                                )
                              }
                              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                      {entries.length > 0 && (
                        <tr
                          key="total-row"
                          className="bg-[#F5F5F7]/80 dark:bg-zinc-800/80 font-bold"
                        >
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-sm text-zinc-900 dark:text-white border-r border-zinc-100 dark:border-white/5 sticky left-0 bg-[#F5F5F7] dark:bg-zinc-800 z-10"
                          >
                            Total
                          </td>
                          {daysInMonth.map((d) => (
                            <td
                              key={`total-day-${d.day}`}
                              className="px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5"
                            >
                              {totals.byDay[d.day] || ""}
                            </td>
                          ))}
                          <td className="px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5">
                            {totals.hours.toFixed(1)}
                          </td>
                          <td className="px-2 py-3 text-xs font-mono text-center border-r border-zinc-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400 font-bold">
                            {totals.chargedHours.toFixed(1)}
                          </td>
                          <td className="px-2 py-3 text-xs font-mono text-center text-emerald-600 dark:text-emerald-400">
                            {totals.amount.toFixed(1)}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
            {(calculations.length > 0 || absentWorkers.length > 0) && (
              <div className="space-y-6">
                {/* Site Comments Box */}
                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm p-4 md:p-6 transition-all duration-300">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Site Remarks / Comments</h3>
                  <textarea
                    value={siteComments[selectedSite] || ""}
                    onChange={(e) => setSiteComments({ ...siteComments, [selectedSite]: e.target.value })}
                    placeholder="Enter notes or remarks for this site..."
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-none rounded-xl p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[100px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Site Summary
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowResults(!showResults)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                    >
                      <Calculator size={16} />
                      {showResults ? "Hide Breakdown" : "Show Worker Breakdown"}
                    </button>
                  </div>
                </div>

                {/* Single Summary Card */}
                <div className="bg-[#F5F5F7] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl p-8 shadow-xl relative overflow-hidden border border-line dark:border-white/10">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Calculator
                      size={120}
                      className="text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">
                          {selectedSite}
                        </h4>
                        <p className="text-xs opacity-70 font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          {calculationPeriod === "monthly"
                            ? "Full Month Summary"
                            : `Weekly Range (Day ${startDay} - ${endDay})`}
                        </p>
                      </div>
                      <Receipt
                        size={32}
                        className="text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-6 mb-8 border-b border-dashed border-zinc-200 dark:border-zinc-750 pb-6">
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Total Workers
                        </p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                          {calculations.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Worker Hours
                        </p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                          {calculations
                            .reduce((sum, c) => sum + c.totalHours, 0)
                            .toFixed(1)}
                          h
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Charged Hours
                        </p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {totals.chargedHours.toFixed(1)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          OT Hours
                        </p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                          {calculations
                            .reduce((sum, c) => sum + c.totalOTHours, 0)
                            .toFixed(1)}
                          h
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Hourly Rate
                        </p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                          {parseFloat(hourlyRate || "0").toFixed(2)}
                        </p>
                      </div>
                      {settings.marginPercentage ? (
                        <div>
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                            Margin ({settings.marginPercentage}%)
                          </p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-white">
                            {calculations
                              .reduce((sum, c) => sum + c.margin, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          VAT (
                          {(() => {
                            const siteConfig = getSiteSettings(
                              selectedSite,
                              settings.siteSettings,
                            );
                            return siteConfig?.vatPercentage !== undefined
                              ? siteConfig.vatPercentage
                              : settings.vatPercentage !== undefined
                                ? settings.vatPercentage
                                : 5;
                          })()}
                          %)
                        </p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                          {calculations
                            .reduce((sum, c) => sum + c.vat, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Total Payout
                        </p>
                        <p className="text-2xl font-black text-rose-500">
                          {calculations
                            .reduce((sum, c) => sum + (c.workerCost || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Net Profit
                        </p>
                        <p className="text-2xl font-black text-emerald-500">
                          {calculations
                            .reduce((sum, c) => sum + c.subtotal + c.margin - (c.workerCost || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>

                    </div>

                    <div className="pt-8 border-t border-line dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Total Payable Amount
                        </p>
                        <p className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
                          {calculations
                            .reduce((sum, c) => sum + c.total, 0)
                            .toFixed(2)}{" "}
                          <span className="text-xl">AED</span>
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative">
                        <button
                          onClick={() => setShowPrintPreview(true)}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
                        >
                          <Printer size={14} />
                          Print / View
                        </button>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowDownloadMenu(!showDownloadMenu)
                            }
                            className="w-full sm:w-auto px-6 py-3 bg-[#E5E5E5] dark:bg-zinc-900/15 hover:bg-zinc-200 dark:hover:bg-zinc-800/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-zinc-900 dark:text-white"
                          >
                            Download Options
                            <ChevronDown
                              size={14}
                              className={cn(
                                "transition-transform",
                                showDownloadMenu && "rotate-180",
                              )}
                            />
                          </button>

                          <AnimatePresence>
                            {showDownloadMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl border border-line dark:border-white/10 shadow-2xl overflow-hidden z-50"
                              >
                                <div className="p-2 space-y-1">
                                  <button
                                    onClick={() => {
                                      setShowPrintPreview(true);
                                      setShowDownloadMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-xl transition-colors border-b border-zinc-100 dark:border-white/5"
                                  >
                                    <Printer
                                      size={16}
                                      className="text-zinc-500 dark:text-zinc-400"
                                    />
                                    Print / View Report
                                  </button>
                                  <button
                                    onClick={handleDownloadPDF}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-xl transition-colors"
                                  >
                                    <FileText
                                      size={16}
                                      className="text-red-500"
                                    />
                                    PDF Document
                                  </button>
                                  <button
                                    onClick={handleDownloadWord}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-xl transition-colors"
                                  >
                                    <FileIcon
                                      size={16}
                                      className="text-blue-500"
                                    />
                                    Word Document
                                  </button>
                                  <button
                                    onClick={handleDownloadReport}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-xl transition-colors"
                                  >
                                    <Database
                                      size={16}
                                      className="text-emerald-500"
                                    />
                                    CSV Spreadsheet
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                      {calculations.map((calc) => (
                        <div
                          key={`${calc.workerId}-${selectedSite}`}
                          className="bg-[#F5F5F7] dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm overflow-hidden flex flex-col"
                        >
                          <div className="p-6 bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xl font-bold text-zinc-900 dark:text-white">
                                {calc.workerName}
                              </h4>
                              <Receipt size={20} />
                            </div>
                            <p className="text-xs opacity-70 font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                              Payment Summary
                            </p>
                          </div>

                          <div className="p-6 flex-1 space-y-6">
                            <div>
                              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                Site Breakdown
                              </p>
                              <div className="space-y-2">
                                {calc.sites.map((site) => (
                                  <div
                                    key={`${calc.workerId}-${site.siteName}`}
                                    className="flex flex-col gap-1 py-2 border-b border-zinc-100 dark:border-white/5 last:border-0"
                                  >
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-zinc-600 dark:text-zinc-400">
                                        {site.siteName}
                                      </span>
                                      <div className="flex gap-3">
                                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                          {site.hours}h
                                        </span>
                                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                          +{site.otHours}h OT
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">
                                  Normal Hours
                                </span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                  {calc.totalHours}h
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-amber-600 dark:text-amber-400">
                                  OT Hours
                                </span>
                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                  {calc.totalOTHours}h
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">
                                  Hourly Rate
                                </span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                  {calc.hourlyRate.toFixed(2)} AED
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                  {calc.subtotal.toFixed(2)} AED
                                </span>
                              </div>
                              {settings.marginPercentage ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-500">
                                    Margin ({settings.marginPercentage}%)
                                  </span>
                                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                    +{calc.margin.toFixed(2)} AED
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">
                                  VAT (
                                  {(() => {
                                    const siteConfig = getSiteSettings(
                                      selectedSite,
                                      settings.siteSettings,
                                    );
                                    return siteConfig?.vatPercentage !== undefined
                                      ? siteConfig.vatPercentage
                                      : settings.vatPercentage !== undefined
                                        ? settings.vatPercentage
                                        : 5;
                                  })()}
                                  %)
                                </span>
                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                  +{calc.vat.toFixed(2)} AED
                                </span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-100 dark:border-white/5">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-bold text-zinc-900 dark:text-white">
                                  Final Total
                                </span>
                                <span className="text-xl font-black text-zinc-900 dark:text-white">
                                  {calc.total.toFixed(2)} AED
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Absent Workers Section */}
                {absentWorkers.length > 0 && (
                  <div className="bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm overflow-hidden mt-8">
                    <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-red-50/50 dark:bg-red-500/5">
                      <div className="flex items-center gap-2">
                        <User className="text-red-500" size={18} />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          Absent Workers at {selectedSite}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {absentWorkers.length} Absent
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {absentWorkers.map((absent) => (
                          <div
                            key={`absent-${absent.workerId}`}
                            className="flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-[#0a0a0a] rounded-xl border border-zinc-100 dark:border-white/5"
                          >
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {absent.workerName}
                            </span>
                            <div className="flex gap-1">
                              {absent.days.map((day) => (
                                <span
                                  key={`${absent.workerId}-day-${day}`}
                                  className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-md"
                                >
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SitePrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        calculations={calculations}
        selectedSite={selectedSite}
        localSelectedMonth={localSelectedMonth}
        daysInMonth={daysInMonth}
        totals={totals}
        settings={settings}
      />

      {/* Google Drive Progress Modal */}
      <AnimatePresence>
        {isDriveBackingUp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-white shadow-2xl relative overflow-hidden group font-sans"
            >
              {/* Glow effect */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 blur-[80px] -mr-16 -mt-16 rounded-full pointer-events-none" />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#F5F5F7] flex items-center gap-2">
                  <Cloud size={18} className="text-teal-400 animate-pulse" />
                  Drive Cloud Backup
                </h3>
                {(backupProgress.status === "completed" ||
                  backupProgress.status === "error") && (
                  <button
                    onClick={() => setIsDriveBackingUp(false)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-200">
                    {backupProgress.message}
                  </p>
                  {backupProgress.status === "uploading" && (
                    <p className="text-xs text-zinc-500">
                      Syncing: {backupProgress.current} / {backupProgress.total}{" "}
                      sites completed
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-[#00c0a5] h-full transition-all duration-300 rounded-full shadow-lg shadow-teal-500/30"
                    style={{
                      width: `${
                        backupProgress.total > 0
                          ? (backupProgress.current / backupProgress.total) *
                            100
                          : backupProgress.status === "completed"
                            ? 100
                            : 10
                      }%`,
                    }}
                  />
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                  {backupProgress.status === "auth" && (
                    <div className="flex flex-col items-center gap-2.5">
                      <Loader2
                        className="animate-spin text-teal-400"
                        size={32}
                      />
                      <span className="text-xs font-semibold text-zinc-500">
                        Awaiting Google Authentication popup...
                      </span>
                    </div>
                  )}
                  {backupProgress.status === "creating" && (
                    <div className="flex flex-col items-center gap-2.5">
                      <Loader2
                        className="animate-spin text-yellow-500"
                        size={32}
                      />
                      <span className="text-xs font-semibold text-zinc-500">
                        Creating directories structure...
                      </span>
                    </div>
                  )}
                  {backupProgress.status === "uploading" && (
                    <div className="flex flex-col items-center gap-2.5">
                      <Loader2
                        className="animate-spin text-teal-400"
                        size={32}
                      />
                      <span className="text-xs font-semibold text-zinc-500">
                        Saving PDFs and Word calculations...
                      </span>
                    </div>
                  )}
                  {backupProgress.status === "completed" && (
                    <div className="flex flex-col items-center text-center gap-4">
                      <CheckCircle2
                        className="text-emerald-500 shrink-0"
                        size={48}
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white block">
                          Export Completed!
                        </span>
                        <span className="text-xs text-zinc-400 block max-w-xs leading-relaxed">
                          Calculations are nested in structured folders on your
                          personal Google Drive index.
                        </span>
                      </div>
                      {backupProgress.parentFolderId && (
                        <a
                          href={`https://drive.google.com/drive/u/0/folders/${backupProgress.parentFolderId}`}
                          target="_blank"
                          rel="noreferrer"
                          referrerPolicy="no-referrer"
                          className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#00c0a5] hover:bg-teal-600 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-teal-500/10 cursor-pointer"
                        >
                          <UploadCloud size={14} />
                          View on Google Drive
                        </a>
                      )}
                    </div>
                  )}
                  {backupProgress.status === "error" &&
                    (() => {
                      const enableUrlMatch = backupProgress.message.match(
                        /(https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"'\n}]+)/i,
                      );
                      const isApiDisabled =
                        backupProgress.message
                          .toLowerCase()
                          .includes("drive.googleapis.com") ||
                        backupProgress.message.includes("Google Drive API") ||
                        backupProgress.message.includes("403") ||
                        backupProgress.message.includes(
                          "accessNotConfigured",
                        ) ||
                        backupProgress.message.includes("SERVICE_DISABLED");

                      if (isApiDisabled) {
                        const enableUrl = enableUrlMatch
                          ? enableUrlMatch[1]
                          : "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=785521067275";
                        return (
                          <div className="flex flex-col items-center gap-4 text-center">
                            <span className="text-amber-500 text-xs font-black tracking-wider uppercase block">
                              ⚠ Google Drive API Disabled
                            </span>
                            <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
                              The Google Drive API is not enabled in your Google
                              Cloud Project. Please click the button below to
                              enable it in your Google Developer Console, then
                              retry.
                            </p>
                            <a
                              href={enableUrl}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="mt-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-black font-semibold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
                            >
                              Enable Google Drive API
                            </a>
                            <button
                              onClick={handleBackUpAllToGoogleDrive}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all border border-white/5 cursor-pointer"
                            >
                              Retry Backup after enabling
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col items-center gap-3 text-center">
                          <span className="text-red-500 text-xs font-black tracking-wider uppercase block">
                            ✖ Backup Interrupted
                          </span>
                          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                            {backupProgress.message}
                          </p>
                          <button
                            onClick={handleBackUpAllToGoogleDrive}
                            className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all border border-white/5 cursor-pointer"
                          >
                            Retry Backup
                          </button>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
