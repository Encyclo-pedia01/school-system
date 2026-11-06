export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-gray-500">Total Students</h3>
        <p className="text-3xl font-bold mt-2">0</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-gray-500">Total Staff</h3>
        <p className="text-3xl font-bold mt-2">0</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-gray-500">Active Insights</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
      </div>
    </div>
  );
}