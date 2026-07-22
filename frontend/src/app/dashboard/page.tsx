import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user, token } = useAuth();
  
  const mockServers = [
    { id: "srv_001", hostname: "web-01", status: "online", healthScore: 85, securityScore: 90, cpu: 23, ram: 45 },
    { id: "srv_002", hostname: "db-01", status: "online", healthScore: 92, securityScore: 95, cpu: 12, ram: 38 },
    { id: "srv_003", hostname: "app-01", status: "warning", healthScore: 65, securityScore: 80, cpu: 78, ram: 89 },
    { id: "srv_004", hostname: "cache-01", status: "offline", healthScore: 0, securityScore: 0, cpu: 0, ram: 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your secure infrastructure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Servers</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{mockServers.length}</p>
          <p className="mt-2 text-sm text-green-600">2 online, 1 warning, 1 offline</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Average Health</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">77%</p>
          <p className="mt-2 text-sm text-blue-600">Good overall status</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Security Score</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">87%</p>
          <p className="mt-2 text-sm text-green-600">High security posture</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Remediations Today</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">3</p>
          <p className="mt-2 text-sm text-orange-600">2 pending, 1 completed</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Server Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resources</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockServers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">S</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{server.hostname}</div>
                        <div className="text-sm text-gray-500">ID: {server.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      server.status === 'online' ? 'bg-green-100 text-green-800' :
                      server.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>{server.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{server.healthScore}%</div>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${server.healthScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{server.securityScore}%</div>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: `${server.securityScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>CPU: {server.cpu}%</div>
                    <div>RAM: {server.ram}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href={`/servers/${server.id}`} className="text-blue-600 hover:text-blue-900 block mb-1">View Details</a>
                    <button className="text-green-600 hover:text-green-900">Remediate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}