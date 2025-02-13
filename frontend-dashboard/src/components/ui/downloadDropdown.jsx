"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export default function DownloadDropdown({ downloadCSV }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        className="flex items-center px-4 py-2 mt-4 text-white text-sm font-medium border rounded-md shadow-sm bg-blue-500 hover:bg-blue-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Download className="mr-2 h-4 w-4" /> Download CSV
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 z-10 ring-black/5">
          <button
            className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
            onClick={() => {
              downloadCSV("currentPage");
              setIsOpen(false);
            }}
          >
            Download Current Page
          </button>
          <button
            className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
            onClick={() => {
              downloadCSV("allData");
              setIsOpen(false);
            }}
          >
            Download All Data
          </button>
        </div>
      )}
    </div>
  );
}
