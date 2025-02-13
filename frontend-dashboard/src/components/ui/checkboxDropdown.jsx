import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ColumnSelector({ columns, selectedColumns, handleColumnToggle }) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort columns alphabetically

  return (
    <div className="relative inline-block">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 border rounded-md shadow-sm bg-white hover:bg-gray-100"
      >
        Select Columns
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 max-h-60 overflow-y-auto border rounded-md bg-white shadow-lg z-50">
          <div className="p-2 bg-white"> {/* Ensure background color */}
            {columns.map((column) => (
              <label
                key={column}
                className="flex items-center px-2 py-1 cursor-pointer rounded-md hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={Array.from(selectedColumns).includes(column)}
                  onChange={() => handleColumnToggle(column)}
                  className="mr-2"
                />
                <span>{column}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
