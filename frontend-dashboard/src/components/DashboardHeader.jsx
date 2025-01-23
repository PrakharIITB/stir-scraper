import React from 'react';
import { MountainIcon } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <MountainIcon className="h-6 w-6 mr-2" />
        <h1 className="text-xl font-semibold">Movie Campaign Insights</h1>
      </div>
    </header>
  );
}

