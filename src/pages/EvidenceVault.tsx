import { useState, useEffect, useRef } from "react";
import { evidenceApi, casesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/common/CopyButton";
import { Upload, Download, Anchor, FileText, FileImage, FileType, Archive, FileJson, FileSpreadsheet } from "lucide-react";

const typeIcons: Record<string, any> = { 
  PDF: FileText, 
  JPG: FileImage, JPEG: FileImage, PNG: FileImage, WEBP: FileImage, GIF: FileImage,
  JSON: FileJson, 
  CSV: FileSpreadsheet, XLS: FileSpreadsheet, XLSX: FileSpreadsheet,
  TXT: FileType 
};

const EvidenceVault = () => {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Fetch cases to populate dropdown
    casesApi.list().then(res => {
      if (res.data?.success && res.data.data.length > 0) {
        setCases(res.data.data);
        setSelectedCase(res.data.data[0].case_id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCase) {
      fetchEvidence();
    }
  }, [selectedCase]);

  const fetchEvidence = async () => {
    try {
      const res = await evidenceApi.list(selectedCase);
      if (res.data?.success) {
        setEvidence(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching evidence", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCase) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await evidenceApi.upload(selectedCase, formData);
      await fetchEvidence(); // refresh list
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload evidence.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Evidence Vault</h2>
            <p className="text-[10px] text-muted-foreground font-mono">Manage and anchor evidence on-chain</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            className="text-[10px] bg-background border border-border p-1 rounded font-mono"
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
          >
            {cases.length === 0 && <option value="">No Cases Available</option>}
            {cases.map(c => (
              <option key={c.case_id} value={c.case_id}>{c.case_id} - {c.title}</option>
            ))}
          </select>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf, .jpg, .jpeg, .png, .csv, .xls, .xlsx, .json"
            onChange={handleFileUpload} 
          />
          <button
            disabled={!selectedCase || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="btn-tactical h-8 text-[10px] px-3 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {isUploading ? "Uploading..." : "Upload Evidence"}
          </button>
        </div>
      </div>

      <div className="forensic-panel">
        <div className="p-2.5 border-b border-border">
          <h3 className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">
            Evidence Files {selectedCase ? `— ${selectedCase}` : ""}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">File</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Type</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">SHA-256</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Uploaded By</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Timestamp</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Anchor Tx</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidence.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center font-mono text-xs py-10 opacity-50">
                  No evidence files found. Upload evidence to begin.
                </TableCell>
              </TableRow>
            )}
            {evidence.map(ev => {
              const fileExt = ev.file_name.split('.').pop()?.toUpperCase() || 'FILE';
              const Icon = typeIcons[fileExt] || FileText;
              return (
                <TableRow key={ev.evidence_id} className="border-border hover:bg-muted/20 transition-colors">
                  <TableCell className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-mono">{ev.file_name}</span>
                  </TableCell>
                  <TableCell><span className="risk-badge risk-none">{ev.file_type}</span></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground">{ev.sha256_hash.slice(0, 16)}…</span>
                      <CopyButton text={ev.sha256_hash} size="xs" />
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground font-mono">{ev.uploaded_by}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-mono">{new Date(ev.uploaded_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="text-[10px] text-muted-foreground font-mono">—</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(ev.file_path, ev.file_name)}>
                        <Download className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EvidenceVault;
