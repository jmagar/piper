"use client";

export function MonitoringPlaceholder() {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-xl font-semibold mb-2">Monitoring</h2>
      <p className="text-muted-foreground">
        This is a placeholder for the Monitoring dashboard content.
        Actual charts and metrics will go here.
      </p>
      {/* You can add a mock UI similar to your image here */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="font-semibold">Total Requests</p>
          <p className="text-2xl">0</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="font-semibold">Error Rate</p>
          <p className="text-2xl">0.00%</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="font-semibold">Avg Response Time</p>
          <p className="text-2xl">0ms</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="font-semibold">Active Users</p>
          <p className="text-2xl">0</p>
        </div>
      </div>
    </div>
  );
}
