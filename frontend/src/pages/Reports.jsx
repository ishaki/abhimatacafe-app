import { useState, useEffect } from 'react'
import { BarChart3, Calendar, Download, Printer, TrendingUp, DollarSign, ShoppingCart, Receipt } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import Button from '../components/Button'

const Reports = () => {
  const [reportType, setReportType] = useState('daily')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [customWeekStart, setCustomWeekStart] = useState('')
  const [customMonth, setCustomMonth] = useState(new Date().getMonth() + 1)
  const [customYear, setCustomYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchReport()
  }, [reportType])

  const fetchReport = async () => {
    setLoading(true)
    try {
      let url = `/reports/${reportType}`
      let params = new URLSearchParams()

      if (reportType === 'daily') {
        params.append('date', customDate)
      } else if (reportType === 'weekly') {
        if (customWeekStart) {
          params.append('week_start', customWeekStart)
        }
      } else if (reportType === 'monthly') {
        params.append('month', customMonth)
        params.append('year', customYear)
      }

      const response = await api.get(`${url}?${params.toString()}`)
      setReportData(response.data)
    } catch (error) {
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getReportTitle = () => {
    switch (reportType) {
      case 'daily':
        return `Daily Report - ${formatDate(customDate)}`
      case 'weekly':
        const weekStart = customWeekStart ? new Date(customWeekStart) : new Date()
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return `Weekly Report - ${formatDate(weekStart.toISOString())} to ${formatDate(weekEnd.toISOString())}`
      case 'monthly':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December']
        return `Monthly Report - ${monthNames[customMonth - 1]} ${customYear}`
      default:
        return 'Report'
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.success('Export functionality coming soon!')
  }

  const handlePrint = () => {
    window.print()
  }

  const getWeekStartDate = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  useEffect(() => {
    if (reportType === 'weekly' && !customWeekStart) {
      setCustomWeekStart(getWeekStartDate())
    }
  }, [reportType])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Reports & Analytics" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="mt-2 text-gray-600">Generate and analyze business reports</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleExport}
                variant="success"
                icon={Download}
              >
                Export
              </Button>
              <Button
                onClick={handlePrint}
                variant="info"
                icon={Printer}
              >
                Print
              </Button>
            </div>
          </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setReportType('daily')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              reportType === 'daily'
                ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            <h3 className="font-semibold">Daily Report</h3>
            <p className="text-sm text-gray-600">Today's performance</p>
          </button>

          <button
            onClick={() => setReportType('weekly')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              reportType === 'weekly'
                ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-6 w-6 mx-auto mb-2" />
            <h3 className="font-semibold">Weekly Report</h3>
            <p className="text-sm text-gray-600">7-day overview</p>
          </button>

          <button
            onClick={() => setReportType('monthly')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              reportType === 'monthly'
                ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-6 w-6 mx-auto mb-2" />
            <h3 className="font-semibold">Monthly Report</h3>
            <p className="text-sm text-gray-600">Monthly summary</p>
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Date Selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
              />
            </div>
          )}

          {reportType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Week Start Date</label>
              <input
                type="date"
                value={customWeekStart}
                onChange={(e) => setCustomWeekStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={customMonth}
                  onChange={(e) => setCustomMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={customYear}
                  onChange={(e) => setCustomYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              className="w-full bg-abhimata-orange text-white px-4 py-2 rounded-lg hover:bg-abhimata-orange-dark flex items-center justify-center"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{getReportTitle()}</h2>
            <p className="text-gray-600">Generated on {new Date().toLocaleString()}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.total_sales)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reportData.total_orders}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <Receipt className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportData.total_expenses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-abhimata-orange mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold ${
                    reportData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.net_profit)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {reportData.category_breakdown && Object.keys(reportData.category_breakdown).length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Category Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(reportData.category_breakdown).map(([category, data]) => (
                      <tr key={category}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-abhimata-orange">
                          {formatCurrency(data.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Performance Highlights</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Average order value: {formatCurrency(reportData.total_sales / Math.max(reportData.total_orders, 1))}</li>
                  <li>• Profit margin: {((reportData.net_profit / Math.max(reportData.total_sales, 1)) * 100).toFixed(1)}%</li>
                  <li>• Expense ratio: {((reportData.total_expenses / Math.max(reportData.total_sales, 1)) * 100).toFixed(1)}%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Period Information</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Report period: {reportType.charAt(0).toUpperCase() + reportType.slice(1)}</li>
                  <li>• Generated: {new Date().toLocaleString()}</li>
                  <li>• Data source: Abhimata Cafe Management System</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Report Data</h2>
          <p className="text-gray-500">Select a report type and generate your first report</p>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default Reports
