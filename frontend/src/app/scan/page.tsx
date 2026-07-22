import React from "react";

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Security Scans</h1>
          <p className="text-gray-600 mt-1">Initiate and monitor security scans on servers</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Scan</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Select a server...</option>
                <option>web-01</option>
                <option>db-01</option>
                <option>app-01</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scan Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="scan-type" className="mr-2" />
                  <span className="text-sm">Security Hardening Scan</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="scan-type" className="mr-2" />
                  <span className="text-sm">Threat Detection Scan</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="scan-type" className="mr-2" />
                  <span className="text-sm">Application Scan</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="scan-type" className="mr-2" />
                  <span className="text-sm">Full Comprehensive Scan</span>
                </label>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Start Scan
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Scan History</h2>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No scan history yet</p>
              <p className="text-sm mt-1">Run your first scan to see results here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
