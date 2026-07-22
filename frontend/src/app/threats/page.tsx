import React from "react";

export default function ThreatsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Threat Intelligence</h1>
          <p className="text-gray-600 mt-1">Monitor active and historical security threats</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Threats</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { id: "t1", type: "ssh_bruteforce", severity: "HIGH", ip: "198.51.100.23", count: 12, time: "2 minutes ago" },
              { id: "t2", type: "port_scan", severity: "MEDIUM", ip: "203.0.113.45", count: 45, time: "15 minutes ago" },
              { id: "t3", type: "crypto_miner", severity: "HIGH", ip: "192.0.2.67", count: 8, time: "1 hour ago" },
              { id: "t4", type: "malware_download", severity: "CRITICAL", ip: "198.51.100.99", count: 3, time: "3 hours ago" },
            ].map((threat) => (
              <div key={threat.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {threat.type.replace(/_/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Source IP: {threat.ip} | Attempts: {threat.count} | Detected: {threat.time}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      threat.severity === "CRITICAL" ? "bg-red-100 text-red-800" :
                      threat.severity === "HIGH" ? "bg-red-100 text-red-800" :
                      threat.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>{
                      threat.severity
                    }</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Block IP
                    </button>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Investigate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Threat Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Threats</span>
                <span className="text-2xl font-bold text-gray-900">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Critical</span>
                <span className="text-lg font-semibold text-red-600">1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">High</span>
                <span className="text-lg font-semibold text-red-600">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Medium</span>
                <span className="text-lg font-semibold text-yellow-600">1</span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
                  Block All Threats
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Source IPs</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  { ip: "198.51.100.23", count: 12, country: "Example Country" },
                  { ip: "203.0.113.45", count: 45, country: "Example Country 2" },
                  { ip: "192.0.2.67", count: 8, country: "Example Country 3" },
                ].map((item) => (
                  <div key={item.ip} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.ip}</div>
                      <div className="text-xs text-gray-500">{item.country}</div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.count} attempts
                    </div>
                    <button className="text-red-600 hover:text-red-800 text-sm">
                      Block
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
