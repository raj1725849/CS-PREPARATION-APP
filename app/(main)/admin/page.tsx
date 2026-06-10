"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { FileText, Eye, Info } from "lucide-react";

import { SubjectInfo } from "@/lib/types";

export default function AdminPage() {
  const [files, setFiles] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subjects")
      .then(res => res.json())
      .then(data => {
        setFiles(data.subjects || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen pb-12">
      <TopBar 
        title="Study Material" 
        subtitle="ICSI Executive Programme — Module 1 & 2"
        breadcrumbs={[{ label: "Home" }, { label: "Study Material", href: "/admin" }]} 
      />

      <div className="p-8 max-w-6xl mx-auto space-y-8 reveal stagger-1">
        
        <div className="flex justify-between items-center bg-[#0f2640] text-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-300" />
            <p className="text-sm font-medium">
              To add new study material, drop PDF into <code className="bg-white/20 px-1.5 py-0.5 rounded">/public/study-material/</code> and redeploy. Files appear here automatically.
            </p>
          </div>
          <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
            {files.length} SUBJECTS INDEXED
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-[#e2e8f0] border-t-[#e8590c] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#e2e8f0] hover:border-[#1a3a5c] hover:shadow-md transition-all p-6 flex flex-col group reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg transition-colors ${file.indexed ? 'bg-red-50 group-hover:bg-red-100' : 'bg-gray-100'}`}>
                    <FileText className={`w-6 h-6 ${file.indexed ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${file.indexed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {file.indexed ? 'Indexed' : 'Missing'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-[#0f2640] mb-2">{file.name}</h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-[#f8f9fa] text-[#64748b] border border-[#e2e8f0] px-2 py-0.5 rounded text-xs font-medium">
                    {file.module}
                  </span>
                </div>
                
                <p className="text-xs font-mono text-[#94a3b8] truncate mb-4">
                  {file.filename}
                </p>
                
                <div className="mt-auto border-t border-[#e2e8f0] pt-4 flex justify-between items-center">
                  <span className="text-xs text-[#64748b] font-medium">{formatSize(file.sizeKB * 1024)}</span>
                  <a 
                    href={`/study-material/${file.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-[#1a3a5c] hover:text-[#e8590c] transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
