import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Download,
  Calendar,
  ChevronDown,
  RefreshCw,
  FileText,
  CheckCircle,
  Banknote,
  Clock,
  BarChart2,
  ShoppingBag,
  Menu,
  Heart,
} from "lucide-react";
import {
  Card,
  Title,
  Text,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@tremor/react";
import toast from "react-hot-toast";
import Settings from "../components/Settings";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  differenceInDays,
  parseISO,
} from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Chart container component for consistent styling
const ChartContainer = ({ title, children, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center">
      {icon && <span className="mr-3 text-gray-400">{icon}</span>}
      <h3 className="text-lg font-medium text-gray-800">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const AffiliateDashboard = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [affiliateInfo, setAffiliateInfo] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateRange, setDateRange] = useState("thisMonth");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [sales, setSales] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [activeDataTab, setActiveDataTab] = useState("quotes");
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isCalculatingEarnings, setIsCalculatingEarnings] = useState(false);
  const [quotesData, setQuotesData] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [quoteStatusData, setQuoteStatusData] = useState([]);
  const [activeChartTab, setActiveChartTab] = useState("performance");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Donation tracking for Helping Shelters campaign
  const [donationStats, setDonationStats] = useState({
    totalDonations: 0,
    verifiedQuotes: 0,
    isHelpingSheltersInfluencer: false,
  });

  // Add debug logging to check user object structure
  useEffect(() => {
    console.log("User object:", user);
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();

      if (!credentials) {
        throw new Error("No credentials available");
      }

      const userEmail = user?.signInDetails?.loginId;
      console.log("User email:", userEmail); // Debug log

      if (!userEmail) {
        throw new Error("User email not found");
      }

      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new ScanCommand({
        TableName: "Affiliates",
      });

      const response = await dynamoClient.send(command);
      console.log("All affiliates:", response); // Debug log

      if (!response?.Items) {
        throw new Error("No items returned from DynamoDB");
      }

      const allAffiliates = response.Items.map((item) => unmarshall(item));
      console.log("All affiliates:", allAffiliates);

      const currentAffiliate = allAffiliates.find(
        (affiliate) => affiliate.email === userEmail
      );

      if (!currentAffiliate) {
        throw new Error(`No affiliate found for email: ${userEmail}`);
      }

      console.log("Found affiliate:", currentAffiliate); // Debug log
      setAffiliateInfo(currentAffiliate);

      // Fetch quotes data and sales data
      await fetchQuotesData(currentAffiliate.id);
      await fetchSalesData(currentAffiliate.id);
    } catch (err) {
      console.error("Error fetching affiliate:", err);
      setError(err.message);
      toast.error(err.message || "Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      fetchAffiliateData();
    }
  }, [user?.signInDetails?.loginId]);

  const fetchQuotesData = async (affiliateId) => {
    if (!affiliateId) {
      return;
    }

    try {
      console.log("Fetching quotes for affiliate:", affiliateId);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new ScanCommand({
        TableName: "Quotes",
        FilterExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: {
          ":affiliateId": { S: affiliateId },
        },
      });

      const response = await dynamoClient.send(command);
      console.log("Quotes response:", response);

      if (!response?.Items) {
        setQuotes([]);
        return;
      }

      const quotesData = response.Items.map((item) => unmarshall(item));
      console.log("Processed quotes data:", quotesData);
      setQuotes(quotesData);

      // Apply filters to quotes
      const filtered = filterItems(
        quotesData,
        dateRange,
        customStartDate,
        customEndDate
      );
      setFilteredQuotes(filtered);
    } catch (err) {
      console.error("Error fetching quotes:", err);
      toast.error("Failed to load quotes data");
    }
  };

  const fetchSalesData = async (affiliateId) => {
    if (!affiliateId) {
      return;
    }

    try {
      console.log("Fetching sales for affiliate:", affiliateId);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new ScanCommand({
        TableName: "Sales",
        FilterExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: {
          ":affiliateId": { S: affiliateId },
        },
      });

      const response = await dynamoClient.send(command);
      console.log("Sales response:", response);

      if (!response?.Items) {
        setSales([]);
        return;
      }

      const salesData = response.Items.map((item) => unmarshall(item));
      console.log("Processed sales data:", salesData);
      setSales(salesData);

      // Apply filters to sales
      const filtered = filterItems(
        salesData,
        dateRange,
        customStartDate,
        customEndDate
      );
      setFilteredSales(filtered);
    } catch (err) {
      console.error("Error fetching sales:", err);
      toast.error("Failed to load sales data");
    }
  };

  const getDateRange = (range) => {
    const now = new Date();
    switch (range) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "thisWeek":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "thisYear":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "last7Days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "last30Days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "last3Months":
        return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) };
      case "last6Months":
        return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
      case "lastYear":
        return { start: startOfDay(subYears(now, 1)), end: endOfDay(now) };
      case "custom":
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : null,
          end: customEndDate ? endOfDay(new Date(customEndDate)) : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const filterItems = (items, dateRangeType) => {
    if (!items.length) return [];

    const { start, end } = getDateRange(dateRangeType);
    if (!start || !end) return items;

    return items.filter((item) => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });
  };

  const filterQuotes = useCallback(() => {
    return filterItems(quotes, dateRange, customStartDate, customEndDate);
  }, [quotes, dateRange, customStartDate, customEndDate]);

  const filterSales = useCallback(() => {
    return filterItems(sales, dateRange, customStartDate, customEndDate);
  }, [sales, dateRange, customStartDate, customEndDate]);

  const prepareQuoteStatusData = useCallback(() => {
    if (!filteredQuotes.length) return [];

    const statusCounts = {};

    filteredQuotes.forEach((quote) => {
      const status = quote.status || "pending";
      if (!statusCounts[status]) {
        statusCounts[status] = { name: status, value: 0 };
      }
      statusCounts[status].value += 1;
    });

    const statusColors = {
      approved: "#10b981",
      pending: "#f59e0b",
      rejected: "#ef4444",
      "in review": "#3b82f6",
    };

    return Object.values(statusCounts).map((item) => ({
      ...item,
      color: statusColors[item.name] || "#6b7280",
    }));
  }, [filteredQuotes]);

  const prepareQuotesPerformanceData = useCallback(() => {
    if (!filteredQuotes.length) return [];

    const monthlyData = {};
    const last6Months = [];

    // Get the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = format(date, "MMM yyyy");
      last6Months.push(monthYear);
      monthlyData[monthYear] = {
        name: monthYear,
        quotes: 0,
        approved: 0,
      };
    }

    filteredQuotes.forEach((quote) => {
      const date = new Date(quote.createdAt);
      const monthYear = format(date, "MMM yyyy");

      if (monthlyData[monthYear]) {
        monthlyData[monthYear].quotes += 1;
        if (quote.status === "approved") {
          monthlyData[monthYear].approved += 1;
        }
      }
    });

    return last6Months.map((month) => monthlyData[month]);
  }, [filteredQuotes]);

  const prepareSalesTrendData = useCallback(() => {
    if (!filteredSales.length) return [];

    const monthlyData = {};
    const last6Months = [];

    // Get the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = format(date, "MMM yyyy");
      last6Months.push(monthYear);
      monthlyData[monthYear] = {
        name: monthYear,
        amount: 0,
        count: 0,
      };
    }

    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const monthYear = format(date, "MMM yyyy");

      if (monthlyData[monthYear]) {
        monthlyData[monthYear].amount += parseFloat(sale.amount || 0);
        monthlyData[monthYear].count += 1;
      }
    });

    return last6Months.map((month) => monthlyData[month]);
  }, [filteredSales]);

  useEffect(() => {
    const filteredQuotesData = filterQuotes();
    setFilteredQuotes(filteredQuotesData);

    const filteredSalesData = filterSales();
    setFilteredSales(filteredSalesData);

    // Calculate earnings when affiliate info or filtered data changes
    calculateTotalEarnings();
  }, [
    filterQuotes,
    filterSales,
    quotes,
    sales,
    dateRange,
    customStartDate,
    customEndDate,
    affiliateInfo,
  ]);

  useEffect(() => {
    if (quotes.length > 0) {
      setQuotesData(prepareQuotesPerformanceData());
      setQuoteStatusData(prepareQuoteStatusData());
    }
    if (sales.length > 0) {
      setSalesTrend(prepareSalesTrendData());
    }
  }, [
    quotes,
    sales,
    filteredQuotes,
    prepareQuotesPerformanceData,
    prepareQuoteStatusData,
    prepareSalesTrendData,
  ]);

  const calculateTotalEarnings = () => {
    if (!affiliateInfo) return;

    try {
      // 1. Calculate days since joining
      const joiningDate = parseISO(affiliateInfo.createdAt);
      const currentDate = new Date();
      const daysSinceJoining = differenceInDays(currentDate, joiningDate);
      const monthsActive = Math.floor(daysSinceJoining / 30); // Only count complete months

      // 2. Calculate monthly base pay component
      const monthlyBasePay = parseFloat(affiliateInfo.baseMonthlyPay || 0);
      let totalMonthlyPay = 0;

      if (daysSinceJoining >= 30) {
        // If they've completed at least one month, multiply by number of complete months
        totalMonthlyPay = monthlyBasePay * monthsActive;
      } else {
        // For less than a month, don't include monthly pay yet
        totalMonthlyPay = 0;
      }

      // 3. Calculate commission from approved quotes
      const baseCommissionRate = parseFloat(affiliateInfo.basePrice || 0);
      const approvedQuotesCount = quotes.filter(
        (q) => q.status === "approved"
      ).length;
      const totalCommission = baseCommissionRate * approvedQuotesCount;

      // 4. Sum total earnings
      const total = totalMonthlyPay + totalCommission;

      setTotalEarnings(total);

      // 5. Calculate donation stats for Helping Shelters campaign
      const isHelpingSheltersInfluencer = affiliateInfo.isInfluencer;
      const verifiedQuotes = quotes.filter(q => q.status === "approved").length;
      const totalDonations = isHelpingSheltersInfluencer ? verifiedQuotes * 4 : 0; // $4 per verified quote

      setDonationStats({
        totalDonations,
        verifiedQuotes,
        isHelpingSheltersInfluencer,
      });
    } catch (err) {
      console.error("Error calculating earnings:", err);
      toast.error("Failed to calculate earnings");
    }
  };

  const handleRecalculateEarnings = () => {
    setIsCalculatingEarnings(true);
    setTimeout(() => {
      calculateTotalEarnings();
      setIsCalculatingEarnings(false);
      toast.success("Earnings recalculated successfully");
    }, 800); // Small delay for visual feedback
  };

  const stats = {
    totalQuotes: filteredQuotes?.length || 0,
    approvedQuotes:
      filteredQuotes?.filter((q) => q.status === "approved").length || 0,
    pendingQuotes:
      filteredQuotes?.filter((q) => q.status === "pending").length || 0,
    totalSales: filteredSales?.length || 0,
    completedSales:
      filteredSales?.filter((s) => s.status === "completed").length || 0,
    totalSalesAmount:
      filteredSales?.reduce(
        (sum, sale) => sum + (parseFloat(sale.amount) || 0),
        0
      ) || 0,
    totalCommission:
      filteredQuotes
        ?.filter((q) => q.status === "approved")
        .reduce((sum, quote) => sum + (parseFloat(affiliateInfo?.basePrice) || 0), 0) || 0,
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      id: "dashboard",
      active: activeTab === "dashboard",
    },
    {
      name: "Analytics",
      icon: BarChart2,
      id: "analytics",
      active: activeTab === "analytics",
    },
    {
      name: "Settings",
      icon: SettingsIcon,
      id: "settings",
      active: activeTab === "settings",
    },
  ];

  useEffect(() => {
    // Fix chart legend alignment with CSS
    const style = document.createElement("style");
    style.innerHTML = `
      .recharts-legend-wrapper {
        display: flex !important;
        justify-content: center !important;
        bottom: 0 !important;
      }
      .recharts-legend-item {
        display: inline-flex !important;
        align-items: center !important;
        margin-right: 20px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`} id="mobile-sidebar">
        <div className="flex flex-col h-full">
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-800">Affiliate Portal</h2>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 
                  ${
                    item.active
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={signOut}
              className="flex items-center w-full px-4 py-3 text-sm text-red-600 rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:ml-64 transition-all duration-300">
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            data-sidebar-toggle
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Affiliate Portal</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="p-4 md:p-8 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600">
              <p>{error}</p>
              <button
                onClick={fetchAffiliateData}
                className="mt-4 px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <>
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {affiliateInfo?.name}
                      </h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Here's your performance overview
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                        <button
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="flex items-center px-4 py-2 text-sm bg-white border rounded-lg shadow-sm hover:bg-gray-50 w-full sm:w-auto"
                        >
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {dateRange === "custom" &&
                          customStartDate &&
                          customEndDate
                            ? `${format(
                                new Date(customStartDate),
                                "MMM dd, yyyy"
                              )} - ${format(
                                new Date(customEndDate),
                                "MMM dd, yyyy"
                              )}`
                            : dateRange
                                .replace(/([A-Z])/g, " $1")
                                .toLowerCase()}
                          <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                        </button>

                        {showDatePicker && (
                          <div className="absolute right-0 z-10 mt-2 w-72 bg-white rounded-lg shadow-lg">
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => {
                                  setDateRange("today");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Today
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("thisWeek");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                This Week
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("thisMonth");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                This Month
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last7Days");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 7 Days
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last30Days");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 30 Days
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last3Months");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 3 Months
                              </button>

                              {/* Custom Date Range */}
                              <div className="border-t mt-2 pt-2">
                                <div className="p-2">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Custom Range
                                  </p>
                                  <div className="space-y-2">
                                    <input
                                      type="date"
                                      value={customStartDate || ""}
                                      onChange={(e) =>
                                        setCustomStartDate(e.target.value)
                                      }
                                      className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                    <input
                                      type="date"
                                      value={customEndDate || ""}
                                      onChange={(e) =>
                                        setCustomEndDate(e.target.value)
                                      }
                                      className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                    <button
                                      onClick={() => {
                                        if (customStartDate && customEndDate) {
                                          setDateRange("custom");
                                          setShowDatePicker(false);
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                      Apply Custom Range
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          /* Export logic */
                        }}
                        className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </button>
                    </div>
                  </div>

                  {/* Total Earnings Card */}
                  <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="text-gray-500 flex items-center">
                          <Banknote className="w-5 h-5 mr-2 text-green-500" />
                          Total Earnings
                        </Text>
                        <Title className="text-3xl font-bold text-green-700 mt-2">
                          ${totalEarnings.toFixed(2)}
                        </Title>
                        <div className="mt-2 text-xs text-gray-500 flex flex-col space-y-1">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              Affiliate since{" "}
                              {format(
                                parseISO(
                                  affiliateInfo?.createdAt || new Date()
                                ),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>
                          {affiliateInfo?.baseMonthlyPay > 0 && (
                            <div>
                              <span className="font-medium">Monthly Base:</span>{" "}
                              ${affiliateInfo.baseMonthlyPay}/month
                              {differenceInDays(
                                new Date(),
                                parseISO(affiliateInfo.createdAt)
                              ) < 30 && (
                                <span className="ml-1 text-amber-600">
                                  (applies after first complete month)
                                </span>
                              )}
                            </div>
                          )}
                          {affiliateInfo?.basePrice > 0 && (
                            <div>
                              <span className="font-medium">Commission:</span> $
                              {affiliateInfo.basePrice}/quote
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleRecalculateEarnings}
                        disabled={isCalculatingEarnings}
                        className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        {isCalculatingEarnings ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
                            Calculating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Recalculate
                          </>
                        )}
                      </button>
                    </div>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="text-gray-500">Total Quotes</Text>
                          <Title className="text-2xl font-bold mt-2">
                            {stats.totalQuotes}
                          </Title>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="text-gray-500">Approved Quotes</Text>
                          <Title className="text-2xl font-bold mt-2">
                            {stats.approvedQuotes}
                          </Title>
                        </div>
                        <div className="p-3 bg-green-100 rounded-xl">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="text-gray-500">Total Sales</Text>
                          <Title className="text-2xl font-bold mt-2">
                            {stats.totalSales}
                          </Title>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <ShoppingBag className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="text-gray-500">Sales Value</Text>
                          <Title className="text-2xl font-bold mt-2">
                            ${stats.totalSalesAmount.toFixed(2)}
                          </Title>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-xl">
                          <BarChart2 className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                    </Card>

                    {/* Helping Shelters Donations Card - Only show for influencers */}
                    {donationStats.isHelpingSheltersInfluencer && (
                      <Card className="hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <Text className="text-gray-500">Helping Shelters</Text>
                            <Title className="text-2xl font-bold mt-2">
                              ${donationStats.totalDonations.toFixed(2)}
                            </Title>
                            <div className="text-xs text-gray-500 mt-1">
                              {donationStats.verifiedQuotes} verified quotes
                            </div>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-xl">
                            <Heart className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Tabs for Quotes and Sales */}
                  {affiliateInfo.shareLeads ? <Card>
                    <div className="border-b border-gray-200 mb-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setActiveDataTab("quotes")}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeDataTab === "quotes"
                              ? "border-b-2 border-indigo-500 text-indigo-600"
                              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Quotes
                        </button>
                        <button
                          onClick={() => setActiveDataTab("sales")}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeDataTab === "sales"
                              ? "border-b-2 border-indigo-500 text-indigo-600"
                              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Sales
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {activeDataTab === "quotes" && (
                        <>
                          <div className="text-sm text-gray-500 mb-4">
                            Showing {filteredQuotes.length} quotes{" "}
                            {dateRange !== "all" &&
                              `for ${dateRange
                                .replace(/([A-Z])/g, " $1")
                                .toLowerCase()}`}
                          </div>

                          {filteredQuotes.length > 0 ? (
                            <table className="min-w-[800px] divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pet Name
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pet Owner
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Commission
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200 h-96 overflow-y-auto">
                                {filteredQuotes.map((quote) => (
                                  <tr
                                    key={quote.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {format(
                                        new Date(quote.createdAt),
                                        "MMM dd, yyyy"
                                      )}
                                    </td>
                                     <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {quote.email}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {quote?.petName} ({quote?.petBreed})
                                      {quote?.petType && (
                                        <div className="text-gray-500 text-xs">
                                          {quote?.petType}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {quote.petOwnerFirstName}{" "}
                                      {quote.petOwnerLastName}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      ${affiliateInfo?.basePrice || 0}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${
                                          quote.status === "approved"
                                            ? "bg-green-100 text-green-800"
                                            : quote.status === "rejected"
                                            ? "bg-red-100 text-red-800"
                                            : quote.status === "in review"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {quote.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                No quotes found for this period
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {activeDataTab === "sales" && (
                        <>
                          <div className="text-sm text-gray-500 mb-4">
                            Showing {filteredSales.length} sales{" "}
                            {dateRange !== "all" &&
                              `for ${dateRange
                                .replace(/([A-Z])/g, " $1")
                                .toLowerCase()}`}
                          </div>

                          {filteredSales.length > 0 ? (
                            <table className="min-w-[800px] divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200 h-96 overflow-y-auto">
                                {filteredSales.map((sale) => (
                                  <tr
                                    key={sale.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {format(
                                        new Date(sale.createdAt),
                                        "MMM dd, yyyy"
                                      )}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {sale.productName}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      {sale.customerName || "N/A"}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                      ${parseFloat(sale.amount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${
                                          sale.status === "completed"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {sale.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                No sales found for this period
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>: ""}
                </>
              )}
              {/* Analytics Tab Content */}
              {activeTab === "analytics" && (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Analytics Dashboard
                      </h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Visualize your performance metrics
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <button
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="flex items-center px-4 py-2 text-sm bg-white border rounded-lg shadow-sm hover:bg-gray-50"
                        >
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {dateRange === "custom" &&
                          customStartDate &&
                          customEndDate
                            ? `${format(
                                new Date(customStartDate),
                                "MMM dd, yyyy"
                              )} - ${format(
                                new Date(customEndDate),
                                "MMM dd, yyyy"
                              )}`
                            : dateRange
                                .replace(/([A-Z])/g, " $1")
                                .toLowerCase()}
                          <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                        </button>

                        {showDatePicker && (
                          <div className="absolute right-0 z-10 mt-2 w-72 bg-white rounded-lg shadow-lg">
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => {
                                  setDateRange("today");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Today
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("thisWeek");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                This Week
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("thisMonth");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                This Month
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last7Days");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 7 Days
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last30Days");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 30 Days
                              </button>
                              <button
                                onClick={() => {
                                  setDateRange("last3Months");
                                  setShowDatePicker(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                              >
                                Last 3 Months
                              </button>

                              {/* Custom Date Range */}
                              <div className="border-t mt-2 pt-2">
                                <div className="p-2">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Custom Range
                                  </p>
                                  <div className="space-y-2">
                                    <input
                                      type="date"
                                      value={customStartDate || ""}
                                      onChange={(e) =>
                                        setCustomStartDate(e.target.value)
                                      }
                                      className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                    <input
                                      type="date"
                                      value={customEndDate || ""}
                                      onChange={(e) =>
                                        setCustomEndDate(e.target.value)
                                      }
                                      className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                    <button
                                      onClick={() => {
                                        if (customStartDate && customEndDate) {
                                          setDateRange("custom");
                                          setShowDatePicker(false);
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                      Apply Custom Range
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div>
                        <Text className="text-gray-500 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          Approval Rate
                        </Text>
                        <Title className="text-2xl font-bold mt-2">
                          {stats.totalQuotes > 0
                            ? `${(
                                (stats.approvedQuotes / stats.totalQuotes) *
                                100
                              ).toFixed(1)}%`
                            : "0%"}
                        </Title>
                        <div className="mt-2 text-xs text-gray-500">
                          {stats.approvedQuotes} out of {stats.totalQuotes}{" "}
                          quotes approved
                        </div>
                      </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div>
                        <Text className="text-gray-500 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-indigo-500" />
                          Avg Sale Value
                        </Text>
                        <Title className="text-2xl font-bold mt-2">
                          $
                          {stats.totalSales > 0
                            ? (
                                stats.totalSalesAmount / stats.totalSales
                              ).toFixed(2)
                            : "0.00"}
                        </Title>
                        <div className="mt-2 text-xs text-gray-500">
                          Based on {stats.totalSales} total sales
                        </div>
                      </div>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <div>
                        <Text className="text-gray-500 flex items-center">
                          <BarChart2 className="w-4 h-4 mr-2 text-purple-500" />
                          Quote to Sale Ratio
                        </Text>
                        <Title className="text-2xl font-bold mt-2">
                          {stats.approvedQuotes > 0
                            ? `${(
                                (stats.totalSales / stats.approvedQuotes) *
                                100
                              ).toFixed(1)}%`
                            : "0%"}
                        </Title>
                        <div className="mt-2 text-xs text-gray-500">
                          {stats.totalSales} sales from {stats.approvedQuotes}{" "}
                          approved quotes
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Chart Navigation Tabs */}
                  <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100">
                      <div className="flex">
                        <button
                          onClick={() => setActiveChartTab("performance")}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeChartTab === "performance"
                              ? "text-indigo-600 border-b-2 border-indigo-500"
                              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Performance
                        </button>
                        <button
                          onClick={() => setActiveChartTab("quotes")}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeChartTab === "quotes"
                              ? "text-indigo-600 border-b-2 border-indigo-500"
                              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Quotes Status
                        </button>
                        <button
                          onClick={() => setActiveChartTab("sales")}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeChartTab === "sales"
                              ? "text-indigo-600 border-b-2 border-indigo-500"
                              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Sales Trends
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Charts with improved layout */}
                      {activeChartTab === "performance" && (
                        <div className="h-96">
                          {quotesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={quotesData}
                                margin={{
                                  top: 20,
                                  right: 30,
                                  left: 0,
                                  bottom: 30,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                  opacity={0.2}
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fill: "#6b7280", fontSize: 12 }}
                                  height={50}
                                  tickMargin={10}
                                />
                                <YAxis
                                  tick={{ fill: "#6b7280", fontSize: 12 }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    padding: "12px",
                                    border: "none",
                                    boxShadow:
                                      "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  height={36}
                                  wrapperStyle={{
                                    paddingTop: 15,
                                    paddingBottom: 5,
                                    lineHeight: "40px",
                                  }}
                                  iconSize={12}
                                  iconType="square"
                                />
                                <Bar
                                  name="Total Quotes"
                                  dataKey="quotes"
                                  fill="#4f46e5"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                  name="Approved Quotes"
                                  dataKey="approved"
                                  fill="#10b981"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                              <FileText className="w-16 h-16 text-gray-300 mb-4" />
                              <p className="text-gray-500">
                                No quote performance data available
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quotes Status Pie Chart */}
                      {activeChartTab === "quotes" && (
                        <div className="h-96">
                          {quoteStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart
                                margin={{
                                  top: 0,
                                  right: 0,
                                  left: 0,
                                  bottom: 30,
                                }}
                              >
                                <Pie
                                  data={quoteStatusData}
                                  cx="50%"
                                  cy="45%"
                                  innerRadius={80}
                                  outerRadius={140}
                                  fill="#8884d8"
                                  paddingAngle={2}
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ name, percent }) =>
                                    `${name} (${(percent * 100).toFixed(0)}%)`
                                  }
                                  labelLine={{
                                    stroke: "#e5e7eb",
                                    strokeWidth: 1,
                                  }}
                                >
                                  {quoteStatusData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value, name) => [
                                    `${value} quotes`,
                                    name,
                                  ]}
                                  contentStyle={{
                                    backgroundColor: "white",
                                    padding: "12px",
                                    border: "none",
                                    boxShadow:
                                      "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  iconType="circle"
                                  iconSize={12}
                                  layout="horizontal"
                                  wrapperStyle={{
                                    paddingTop: 20,
                                    paddingBottom: 5,
                                    lineHeight: "40px",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                              <FileText className="w-16 h-16 text-gray-300 mb-4" />
                              <p className="text-gray-500">
                                No quote status data available
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sales Trend Chart */}
                      {activeChartTab === "sales" && (
                        <div className="h-96">
                          {salesTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={salesTrend}
                                margin={{
                                  top: 20,
                                  right: 30,
                                  left: 0,
                                  bottom: 30,
                                }}
                              >
                                <defs>
                                  <linearGradient
                                    id="colorSales"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0.8}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  opacity={0.1}
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fill: "#6b7280", fontSize: 12 }}
                                  height={50}
                                  tickMargin={10}
                                />
                                <YAxis
                                  tickFormatter={(value) =>
                                    `$${value.toFixed(0)}`
                                  }
                                  tick={{ fill: "#6b7280", fontSize: 12 }}
                                  width={60}
                                />
                                <Tooltip
                                  formatter={(value) => [
                                    `$${value.toFixed(2)}`,
                                    "Sales Amount",
                                  ]}
                                  contentStyle={{
                                    backgroundColor: "white",
                                    padding: "12px",
                                    border: "none",
                                    boxShadow:
                                      "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  height={36}
                                  wrapperStyle={{
                                    paddingTop: 15,
                                    paddingBottom: 5,
                                    lineHeight: "40px",
                                  }}
                                  iconSize={12}
                                  iconType="line"
                                />
                                <Area
                                  type="monotone"
                                  dataKey="amount"
                                  name="Sales Amount"
                                  stroke="#3b82f6"
                                  strokeWidth={2}
                                  fillOpacity={0.8}
                                  fill="url(#colorSales)"
                                  activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                              <p className="text-gray-500">
                                No sales trend data available
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {activeTab === "settings" && (
                <Settings affiliateInfo={affiliateInfo} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
