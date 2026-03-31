import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";

const Reports = () => {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    reportsApi.list().then(res => {
      if (res.data?.success) {
        setReports(res.data.data);
      }
    }).catch(console.error);
  }, []);

  const handleExport = async (case_id: string) => {
    try {
      const response = await reportsApi.generateForensicReport(case_id);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DAFS-Report-${case_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export PDF", error);
      alert("Failed to export PDF format.");
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Reports</h2>
          <p className="text-[10px] text-muted-foreground font-mono">Generate and export investigation reports</p>
        </div>
      </div>

      <div className="space-y-2">
        {reports.length === 0 && (
          <div className="forensic-panel p-5 text-center text-xs text-muted-foreground font-mono">
            No active reports. Create an investigation to automatically generate a report.
          </div>
        )}
        {reports.map(c => (
          <div key={c.case_id} className="forensic-panel flex items-center justify-between p-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 border border-primary/20 flex items-center justify-center bg-primary/5">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-foreground">{c.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{c.case_id} · {c.created_by}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.status} />
              <button className="btn-tactical h-7 text-[9px] px-2.5 flex items-center gap-1"><Eye className="h-3 w-3" />Preview</button>
              <button
                onClick={() => handleExport(c.case_id)}
                className="btn-tactical h-7 text-[9px] px-2.5 flex items-center gap-1"
              >
                <Download className="h-3 w-3" />Export
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
