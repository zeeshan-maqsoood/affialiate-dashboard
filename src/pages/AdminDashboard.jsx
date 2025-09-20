import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  Users,
  TrendingUp,
  Settings,
  UserPlus,
  DollarSign,
  BarChart3,
  Bell,
  Layout,
  Star,
  Calendar,
  ChevronDown,
  FileText,
  Search,
  Filter,
  Check,
  X as XIcon,
  Trash2,
  Download,
  ShoppingCart,
  Menu,
  Heart,
  AlertTriangle,
  ArrowUpDown,
  ChartNoAxesColumn
} from "lucide-react";
import { Dialog, Tab } from "@headlessui/react";
import AnalyticsChart from "../components/AnalyticsChart";
// Replace Tremor imports with Recharts
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Toaster, toast } from "react-hot-toast";
import AddAffiliate from "./AddAffiliate";
import AffiliatesList from "../components/AffiliatesList";
import AffiliateDetailsModal from "../components/AffiliateDetailsModal";
import AdminsList from "../components/AdminsList";
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import ChangePassword from "./ChangePassword";
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
} from "date-fns";

// Simple Card component to replace Tremor Card
const Card = ({ children, className = "", ...props }) => {
  return (
    <div className={`bg-white rounded-xl shadow p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

// Simple Title component to replace Tremor Title
const Title = ({ children, className = "", ...props }) => {
  return (
    <h3 className={`font-medium text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  );
};

// Simple Text component to replace Tremor Text
const Text = ({ children, className = "", ...props }) => {
  return (
    <p className={`text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

// Update the color helper function
const getChartColors = (type) => {
  switch (type) {
    case "performance":
      return ["#4f46e5", "#7c3aed", "#9333ea"];
    case "affiliate-comparison":
      return ["#f43f5e", "#4f46e5", "#f59e0b", "#10b981", "#3b82f6"];
    default:
      return [
        "#4f46e5",
        "#7c3aed",
        "#3b82f6",
        "#06b6d4",
        "#14b8a6",
        "#10b981",
        "#f43f5e",
      ];
  }
};

// Helper function to get color for affiliate bar
const getAffiliateColor = (index) => {
  const colors = getChartColors("affiliate-comparison");
  return colors[index % colors.length];
};

// Helper function to get color for quote status
const getStatusColor = (status) => {
  const statusColors = {
    Pending: "#f59e0b",
    Approved: "#10b981",
    Rejected: "#ef4444",
    Completed: "#3b82f6",
    "In Review": "#6366f1",
    Cancelled: "#6b7280",
  };
  return statusColors[status] || null;
};

// Helper function to truncate URLs
const truncateUrl = (url, maxLength = 50) => {
  if (!url || url.length <= maxLength) return url;

  const protocol = url.match(/^https?:\/\//);
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];
  const path = url.replace(/^https?:\/\//, "").replace(domain, "");

  if (path.length <= 20) {
    return url;
  }

  const truncatedPath = path.length > 20 ? "..." + path.slice(-17) : path;
  return (protocol ? protocol[0] : "") + domain + truncatedPath;
};

// Helper function to convert quotes data to CSV format
const convertQuotesToCSV = (quotes, affiliates) => {
  // Define CSV headers
  const headers = [
    "Date",
    "Affiliate Name",
    "Affiliate Email",
    "Customer First Name",
    "Customer Last Name",
    "Customer Email",
    "Customer Phone",
    "Customer Address",
    "Pet Name",
    "Pet Breed",
    "Pet Age",
    "Pet Type",
    "Quote Value",
    "Commission",
    "Status",
    "Created At",
    "Updated At",
  ];

  // Convert quotes data to CSV rows
  const rows = quotes.map((quote) => {
    const affiliate = affiliates.find((a) => a.id === quote.affiliateId);
    return [
      format(new Date(quote.createdAt), "MMM dd, yyyy"),
      affiliate?.name || "Unknown",
      affiliate?.email || "",
      quote.petOwnerFirstName || "",
      quote.petOwnerLastName || "",
      quote.email || "",
      quote.phone || "",
      quote.address || "",
      quote.petName || "",
      quote.petBreed || "",
      quote.petAge || "",
      quote.petType || "",
      quote.quoteValue || 0,
      parseFloat(affiliate?.basePrice) || 0,
      quote.status || "pending",
      quote.createdAt || "",
      quote.updatedAt || "",
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};

// Helper function to convert spam quotes data to CSV format
const convertSpamQuotesToCSV = (spamQuotes, affiliates) => {
  // Define CSV headers
  const headers = [
    "Date",
    "Affiliate Name",
    "Affiliate Email",
    "Customer First Name",
    "Customer Last Name",
    "Customer Email",
    "Customer Phone",
    "Customer Address",
    "Pet Name",
    "Pet Breed",
    "Pet Age",
    "Pet Type",
    "Quote Value",
    "Status",
    "Spam Reason",
    "Flagged At",
    "Created At",
    "Updated At",
  ];

  // Convert spam quotes data to CSV rows
  const rows = spamQuotes.map((quote) => {
    const affiliate = affiliates.find((a) => a.id === quote.affiliateId);
    return [
      format(new Date(quote.createdAt || quote.flaggedAt), "MMM dd, yyyy"),
      affiliate?.name || "Unknown",
      affiliate?.email || "",
      quote.petOwnerFirstName || "",
      quote.petOwnerLastName || "",
      quote.email || "",
      quote.phone || "",
      quote.address || "",
      quote.petName || "",
      quote.petBreed || "",
      quote.petAge || "",
      quote.petType || "",
      quote.quoteValue || 0,
      quote.status || "flagged",
      quote.reason || "",
      quote.flaggedAt || "",
      quote.createdAt || "",
      quote.updatedAt || "",
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};

// Helper function to download CSV file
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Helper function to convert checkout events data to CSV format
const convertCheckoutEventsToCSV = (events) => {
  // Define CSV headers
  const headers = [
    "Date",
    "Affiliate Name",
    "Affiliate ID",
    "User Email",
    "Pet Name",
    "Pet Species",
    "Pet Age",
    "Pet Breed",
    "Plan Type",
    "Monthly Payment",
    "Deductible",
    "Reimbursement",
    "Plan Limit",
    "Event Category",
    "Event Action",
    "Event Label",
    "Page URL",
    "Checkout URL",
    "Quote ID",
    "User Zip",
    "UTM Source",
    "UTM Campaign",
    "UTM Content",
    "Timestamp",
  ];

  // Convert events data to CSV rows
  const rows = events.map((event) => {
    return [
      format(new Date(event.timestamp), "MMM dd, yyyy"),
      event.affiliateName || "",
      event.affiliateId || "",
      event.userEmail || "",
      event.petName || "",
      event.petSpecies || "",
      event.petAge || "",
      event.petBreed || "",
      event.planType || "",
      event.monthlyPayment || event.value || "",
      event.deductible || "",
      event.reimbursement || "",
      event.planLimit || "",
      event.eventCategory || "",
      event.eventAction || "",
      event.eventLabel || "",
      event.pageUrl || "",
      event.checkoutUrl || "",
      event.quoteId || "",
      event.userZip || "",
      event.utm_source || "",
      event.utm_campaign || "",
      event.utm_content || "",
      event.timestamp || "",
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};

// Helper function to convert dog tags data to CSV format
const convertDogTagsToCSV = (dogTags, affiliates) => {
  // Define CSV headers
  const headers = [
    "Date Created",
    "Tag ID",
    "Affiliate Name",
    "Affiliate Email",
    "Pet Name",
    "Pet Type",
    "Owner Name",
    "Owner Email",
    "Owner Phone",
    "Owner Address",
    "Pet Color",
    "Tag Type",
    "Tag Position Info",
    "Donation",
    "Timestamp",
  ];

  // Convert dog tags data to CSV rows
  const rows = dogTags.map((tag) => {
    const affiliate = affiliates.find((a) => a.id === tag.affiliateId);
    const tagDetails = tag.tag_details || {};
    const tagInfo = tagDetails.tag_info || {};

    // Format tag position info
    const tagPositionInfo = Object.entries(tagInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");

    return [
      format(new Date(parseInt(tag.timestamp)), "MMM dd, yyyy"),
      tag.affiliateId,
      affiliate?.name || "Unknown",
      affiliate?.email || "",
      tagDetails.pet_name || "",
      tagDetails.pet_type || "",
      tagDetails.owner_name || "",
      tagDetails.email || tag.email || "",
      tagDetails.phone_number || "",
      tagDetails.address || "",
      tagDetails.color || "",
      tagDetails.type || "",
      tagPositionInfo || "",
      tagDetails.donation ? "Yes" : "No",
      format(new Date(parseInt(tag.timestamp)), "MMM dd, yyyy HH:mm:ss"),
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAddAffiliate, setShowAddAffiliate] = useState(false);
  const [affiliates, setAffiliates] = useState([]);
  const [sales, setSales] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showAffiliateDetails, setShowAffiliateDetails] = useState(false);
  const affiliatesListRef = useRef(null);
  const [dateRange, setDateRange] = useState("thisMonth");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [filteredSales, setFilteredSales] = useState([]);
  const [dataType, setDataType] = useState("sales");
  const [chartView, setChartView] = useState("monthly");

  // New state variables for quote management
  const [quotesSearchTerm, setQuotesSearchTerm] = useState("");
  const [quotesStatusFilter, setQuotesStatusFilter] = useState("all");
  const [quotesSortBy, setQuotesSortBy] = useState("createdAt");
  const [quotesSortOrder, setQuotesSortOrder] = useState("desc");
  const [showQuotesFilters, setShowQuotesFilters] = useState(false);
  const [showQuotesSort, setShowQuotesSort] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [showBulkQuoteActions, setShowBulkQuoteActions] = useState(false);

  // New state variables for spam quotes management
  const [spamQuotes, setSpamQuotes] = useState([]);
  const [spamQuotesSearchTerm, setSpamQuotesSearchTerm] = useState("");
  const [spamQuotesReasonFilter, setSpamQuotesReasonFilter] = useState("all");
  const [showSpamQuotesFilters, setShowSpamQuotesFilters] = useState(false);
  const [showSpamQuotesExportOptions, setShowSpamQuotesExportOptions] =
    useState(false);
  const [filteredSpamQuotes, setFilteredSpamQuotes] = useState([]);
  const [spamQuotesLoading, setSpamQuotesLoading] = useState(false);
  const [selectedSpamQuotes, setSelectedSpamQuotes] = useState([]);
  const [showBulkSpamQuoteActions, setShowBulkSpamQuoteActions] = useState(false);

  // New state variables for dog tags management
  const [dogTags, setDogTags] = useState([]);
  const [dogTagsSearchTerm, setDogTagsSearchTerm] = useState("");
  const [dogTagsStatusFilter, setDogTagsStatusFilter] = useState("all");
  const [dogTagsOrderedFilter, setDogTagsOrderedFilter] = useState("all");
  const [showDogTagsFilters, setShowDogTagsFilters] = useState(false);
  const [showDogTagsOrderedFilter, setShowDogTagsOrderedFilter] = useState(false);
  const [showDogTagsExportOptions, setShowDogTagsExportOptions] =
    useState(false);
  const [filteredDogTags, setFilteredDogTags] = useState([]);
  const [dogTagsLoading, setDogTagsLoading] = useState(false);
  const [selectedDogTags, setSelectedDogTags] = useState([]);
  const [showBulkDogTagActions, setShowBulkDogTagActions] = useState(false);

  // New state variables for trash management
  const [deletedQuotes, setDeletedQuotes] = useState([]);
  const [deletedDogTags, setDeletedDogTags] = useState([]);
  const [trashSearchTerm, setTrashSearchTerm] = useState("");
  const [trashFilter, setTrashFilter] = useState("all");
  const [showTrashFilters, setShowTrashFilters] = useState(false);
  const [selectedTrashItems, setSelectedTrashItems] = useState([]);
  const [showBulkTrashActions, setShowBulkTrashActions] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);

  // New state variables for checkout events
  const [checkoutEvents, setCheckoutEvents] = useState([]);
  const [checkoutEventsSearchTerm, setCheckoutEventsSearchTerm] = useState("");
  const [checkoutEventsAffiliateFilter, setCheckoutEventsAffiliateFilter] =
    useState("all");
  const [showCheckoutEventsFilters, setShowCheckoutEventsFilters] =
    useState(false);
  const [showCheckoutEventsExportOptions, setShowCheckoutEventsExportOptions] =
    useState(false);
  const [filteredCheckoutEvents, setFilteredCheckoutEvents] = useState([]);
  const [checkoutEventsLoading, setCheckoutEventsLoading] = useState(false);
  const [selectedCheckoutEvents, setSelectedCheckoutEvents] = useState([]);
  const [showBulkCheckoutEventActions, setShowBulkCheckoutEventActions] =
    useState(false);
  const [checkoutEventsDateRange, setCheckoutEventsDateRange] =
    useState("last30Days");

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New state variables
  const [salesTrend, setSalesTrend] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState([]);
  const [salesByTimeData, setSalesByTimeData] = useState([]);
  const [quotesStatusDistribution, setQuotesStatusDistribution] = useState([]);

  // Donation tracking for Helping Shelters campaign
  const [donationStats, setDonationStats] = useState({
    totalDonations: 0,
    totalVerifiedQuotes: 0,
    helpingSheltersInfluencers: 0,
  });
const [analyticsFrameLoading, setAnalyticsFrameLoading] = useState(true);
const [analyticsFrameError, setAnalyticsFrameError] = useState(false);

useEffect(() => {
  if (activeTab === "analytics-conversion") {
    // jab tab khule, dobara loading dikhao
    setAnalyticsFrameLoading(true);
    setAnalyticsFrameError(false);
  }
}, [activeTab]);

  useEffect(() => {
    // Fix for tooltip z-index issues and color rendering
    const style = document.createElement("style");
    style.innerHTML = `
      .tremor-BarChart-bar:hover { z-index: 10; }
      [role="tooltip"] { z-index: 100 !important; }
      .tremor-BarChart-tooltip { z-index: 100 !important; }
      .tremor-DonutChart-tooltip { z-index: 100 !important; }
      
      /* Remove the !important fill override to fix black colors */
      .tremor-BarChart-bar.tr-fill-current { fill: currentColor; }
      .tremor-DonutChart-slice.tr-fill-current { fill: currentColor; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
        return { start: startOfDay(subYears(now, 1)), end: endOfYear(now) };
      case "custom":
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : null,
          end: customEndDate ? endOfDay(new Date(customEndDate)) : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const filterSales = useCallback(() => {
    if (!sales.length) return [];

    const { start, end } = getDateRange(dateRange);
    if (!start || !end) return sales;

    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, dateRange, customStartDate, customEndDate]);

  const prepareChartData = useCallback(() => {
    if (dataType === "sales" && !filteredSales.length) return [];
    if (dataType === "quotes" && !quotes.length) return [];

    const source = dataType === "sales" ? filteredSales : quotes;

    if (chartView === "monthly") {
      const monthlyData = source.reduce((acc, item) => {
        const month = new Date(item.createdAt).toLocaleString("default", {
          month: "short",
        });
        const year = new Date(item.createdAt).getFullYear();
        const key = `${month} ${year}`;

        if (!acc[key]) {
          acc[key] = {
            period: key,
            amount: 0,
            count: 0,
          };
        }

        acc[key].amount +=
          dataType === "sales" ? item.amount || 0 : item.quoteValue || 0;
        acc[key].count += 1;

        return acc;
      }, {});

      return Object.values(monthlyData).sort((a, b) => {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const [aMonth, aYear] = a.period.split(" ");
        const [bMonth, bYear] = b.period.split(" ");

        if (aYear !== bYear) return aYear - bYear;
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
    } else {
      const weekdayLabels = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const weekdayData = source.reduce((acc, item) => {
        const dayOfWeek = new Date(item.createdAt).getDay();
        const key = weekdayLabels[dayOfWeek];

        if (!acc[key]) {
          acc[key] = {
            period: key,
            amount: 0,
            count: 0,
          };
        }

        acc[key].amount +=
          dataType === "sales" ? item.amount || 0 : item.quoteValue || 0;
        acc[key].count += 1;

        return acc;
      }, {});

      weekdayLabels.forEach((day) => {
        if (!weekdayData[day]) {
          weekdayData[day] = {
            period: day,
            amount: 0,
            count: 0,
          };
        }
      });

      return weekdayLabels.map((day) => weekdayData[day]);
    }
  }, [dataType, chartView, filteredSales, quotes]);

  // Prepare data for top affiliates chart
  const prepareAffiliateComparisonData = useCallback(() => {
    if (!affiliates.length || !filteredSales.length) return [];

    // Calculate total sales per affiliate
    const affiliateSales = affiliates.map((affiliate) => {
      const totalSales = filteredSales
        .filter((sale) => sale.affiliateId === affiliate.id)
        .reduce((sum, sale) => sum + (sale.amount || 0), 0);

      return {
        name: affiliate.name,
        value: totalSales,
      };
    });

    // Sort by sales amount and limit to top performers
    return affiliateSales.sort((a, b) => b.value - a.value).slice(0, 5); // Limit to top 5
  }, [affiliates, filteredSales]);

  // Prepare sales trend data (for line/area chart)
  const prepareSalesTrend = useCallback(() => {
    if (!sales.length) return [];

    // Group by month and calculate cumulative total
    const monthlySales = {};
    let cumulativeTotal = 0;

    // Sort sales by date
    const sortedSales = [...sales].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    sortedSales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const key = `${month} ${year}`;

      if (!monthlySales[key]) {
        monthlySales[key] = {
          name: key,
          monthlyTotal: 0,
          newSales: 0,
        };
      }

      monthlySales[key].monthlyTotal += sale.amount || 0;
      monthlySales[key].newSales += 1;
    });

    // Convert to array and calculate cumulative
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const result = Object.entries(monthlySales)
      .map(([key, data]) => {
        const [month, year] = key.split(" ");
        return {
          ...data,
          monthYear: key,
          monthIndex: monthNames.indexOf(month),
          year: parseInt(year),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });

    // Calculate cumulative total
    result.forEach((item) => {
      cumulativeTotal += item.monthlyTotal;
      item.cumulativeTotal = cumulativeTotal;
    });

    // Only return last 12 months for better visualization
    return result.slice(-12);
  }, [sales]);

  // Prepare radar chart data (affiliates performance across metrics)
  const prepareConversionMetrics = useCallback(() => {
    if (!affiliates.length || !filteredSales.length || !quotes.length) {
      return [];
    }

    // Get top 5 affiliates
    const topAffiliates = [...affiliates]
      .map((affiliate) => {
        const affiliateSales = filteredSales.filter(
          (sale) => sale.affiliateId === affiliate.id
        );
        const totalSales = affiliateSales.reduce(
          (sum, sale) => sum + (sale.amount || 0),
          0
        );
        return { ...affiliate, totalSales };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // Calculate metrics for each affiliate
    return topAffiliates.map((affiliate) => {
      const affiliateSales = filteredSales.filter(
        (sale) => sale.affiliateId === affiliate.id
      );
      const affiliateQuotes = quotes.filter(
        (quote) => quote.affiliateId === affiliate.id
      );

      const salesCount = affiliateSales.length;
      const salesVolume = affiliateSales.reduce(
        (sum, sale) => sum + (sale.amount || 0),
        0
      );
      const quotesCount = affiliateQuotes.length;

      // Calculate conversion rate (normalize to 100 scale for radar chart)
      const conversionRate =
        quotesCount > 0 ? Math.min(100, (salesCount / quotesCount) * 100) : 0;

      // Calculate average sale value (normalize to 100 scale)
      const avgSaleValue =
        salesCount > 0 ? Math.min(100, salesVolume / salesCount / 100) : 0;

      // Activity score (normalize quotes to 100 scale)
      const activityScore = Math.min(100, quotesCount * 5);

      return {
        affiliate: affiliate.name,
        "Sales Volume": salesVolume > 10000 ? 100 : salesVolume / 100,
        "Conversion Rate": conversionRate,
        "Avg Sale Value": avgSaleValue,
        Activity: activityScore,
        Retention: Math.floor(Math.random() * 60) + 40, // Mock data for demo
      };
    });
  }, [affiliates, filteredSales, quotes]);

  // Prepare sales by time data (for heat map visualization)
  const prepareSalesByTime = useCallback(() => {
    if (!sales.length) return [];

    // Create a heat map-like structure using a combination of day and hour
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const timeSlots = ["Morning", "Afternoon", "Evening", "Night"];

    // Initialize the data structure
    const timeData = [];

    days.forEach((day) => {
      timeSlots.forEach((slot) => {
        timeData.push({
          name: day,
          timeSlot: slot,
          value: 0,
          count: 0,
        });
      });
    });

    // Populate with sales data
    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const day = days[date.getDay()];
      const hour = date.getHours();

      // Determine time slot
      let timeSlot;
      if (hour >= 5 && hour < 12) timeSlot = "Morning";
      else if (hour >= 12 && hour < 17) timeSlot = "Afternoon";
      else if (hour >= 17 && hour < 21) timeSlot = "Evening";
      else timeSlot = "Night";

      // Find the corresponding entry
      const entry = timeData.find(
        (item) => item.name === day && item.timeSlot === timeSlot
      );
      if (entry) {
        entry.value += sale.amount || 0;
        entry.count += 1;
      }
    });

    // For visualization purposes, transform into a format suitable for radar chart
    const radarData = timeSlots.map((slot) => {
      const result = { timeSlot: slot };
      days.forEach((day) => {
        const entry = timeData.find(
          (item) => item.name === day && item.timeSlot === slot
        );
        result[day] = entry?.count || 0;
      });
      return result;
    });

    return radarData;
  }, [filteredSales]);

  const prepareQuotesStatusDistribution = useCallback(() => {
    if (!quotes.length) return [];

    // Group quotes by status
    const statusCounts = {};

    quotes.forEach((quote) => {
      const status = quote.status || "Pending"; // Default to "Pending" if status is not defined

      if (!statusCounts[status]) {
        statusCounts[status] = {
          name: status,
          value: 0,
          count: 0,
        };
      }

      statusCounts[status].value += quote.quoteValue || 0;
      statusCounts[status].count += 1;
    });

    // If no data available, provide sample data
    if (Object.keys(statusCounts).length === 0) {
      return [
        { name: "Pending", value: 35000, count: 35 },
        { name: "In Review", value: 20000, count: 20 },
        { name: "Approved", value: 30000, count: 18 },
        { name: "Rejected", value: 8000, count: 12 },
        { name: "Completed", value: 25000, count: 15 },
      ];
    }

    return Object.values(statusCounts);
  }, [quotes]);

  // Calculate donation stats for Helping Shelters campaign
  const calculateDonationStats = useCallback(() => {
    if (!affiliates.length || !quotes.length) return;
    const helpingSheltersInfluencers = affiliates.filter(
      (affiliate) => affiliate.isInfluencer
    );
    const verifiedQuotes = quotes.filter(
      (quote) => quote.status === "approved"
    );

    // Calculate donations: $4 per verified quote for Helping Shelters influencers
    let totalDonations = 0;
    let totalVerifiedQuotes = 0;

    helpingSheltersInfluencers.forEach((affiliate) => {
      const affiliateVerifiedQuotes = verifiedQuotes.filter(
        (quote) => quote.affiliateId === affiliate.id
      );
      const affiliateDonations = affiliateVerifiedQuotes.length * 4; // $4 per verified quote
      totalDonations += affiliateDonations;
      totalVerifiedQuotes += affiliateVerifiedQuotes.length;
    });

    setDonationStats({
      totalDonations,
      totalVerifiedQuotes,
      helpingSheltersInfluencers: helpingSheltersInfluencers.length,
    });
  }, [affiliates, quotes]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const filtered = filterSales();
    setFilteredSales(filtered);
  }, [filterSales, sales]);

  useEffect(() => {
    if (dataType === "quotes" && quotes.length === 0) {
      fetchQuotes();
    }
  }, [dataType]);

  useEffect(() => {
    if (activeTab === "spam-quotes" && spamQuotes.length === 0) {
      fetchSpamQuotes();
    }
    if (activeTab === "dogtags" && dogTags.length === 0) {
      fetchDogTags();
    }
    if (activeTab === "checkout-events" && affiliates.length > 0) {
      // Fetch events for the selected affiliate filter (including "all")
      fetchCheckoutEvents(checkoutEventsAffiliateFilter);
    }
    if (
      activeTab === "trash" &&
      deletedQuotes.length === 0 &&
      deletedDogTags.length === 0
    ) {
      // Refresh trash data if needed
      fetchDashboardData();
      fetchDogTags();
    }
  }, [
    activeTab,
    deletedQuotes.length,
    deletedDogTags.length,
    affiliates.length,
    checkoutEventsAffiliateFilter,
    spamQuotes.length,
  ]);

  useEffect(() => {
    if (sales.length > 0) {
      setSalesTrend(prepareSalesTrend());
      setSalesByTimeData(prepareSalesByTime());
    }
  }, [sales, prepareSalesTrend, prepareSalesByTime]);

  useEffect(() => {
    if (
      affiliates.length > 0 &&
      filteredSales.length > 0 &&
      quotes.length > 0
    ) {
      setConversionMetrics(prepareConversionMetrics());
    }
  }, [affiliates, filteredSales, quotes, prepareConversionMetrics]);

  useEffect(() => {
    if (quotes.length > 0) {
      setQuotesStatusDistribution(prepareQuotesStatusDistribution());
    }
  }, [quotes, prepareQuotesStatusDistribution]);

  // Calculate donation stats when affiliates or quotes change
  useEffect(() => {
    calculateDonationStats();
  }, [calculateDonationStats]);

  // Refresh checkout events when date range changes
  useEffect(() => {
    if (activeTab === "checkout-events" && affiliates.length > 0) {
      fetchCheckoutEvents(checkoutEventsAffiliateFilter);
    }
  }, [
    checkoutEventsDateRange,
    activeTab,
    affiliates.length,
    checkoutEventsAffiliateFilter,
  ]);

  // Filter quotes based on search term and status
  useEffect(() => {
    let filtered = quotes;

    // Apply search filter
    if (quotesSearchTerm) {
      const search = quotesSearchTerm.toLowerCase();
      filtered = filtered.filter((quote) => {
        const affiliate = affiliates.find((a) => a.id === quote.affiliateId);
        return (
          quote.email?.toLowerCase().includes(search) ||
          quote.petName?.toLowerCase().includes(search) ||
          quote.petBreed?.toLowerCase().includes(search) ||
          quote.petType?.toLowerCase().includes(search) ||
          quote.petOwnerFirstName?.toLowerCase().includes(search) ||
          quote.petOwnerLastName?.toLowerCase().includes(search) ||
          quote.phone?.includes(search) ||
          affiliate?.name?.toLowerCase().includes(search) ||
          affiliate?.email?.toLowerCase().includes(search)
        );
      });
    }

    // Apply status filter
    if (quotesStatusFilter !== "all") {
      filtered = filtered.filter(
        (quote) => quote.status === quotesStatusFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (quotesSortBy) {
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "updatedAt":
          aValue = new Date(a.updatedAt || a.createdAt);
          bValue = new Date(b.updatedAt || b.createdAt);
          break;
        case "petName":
          aValue = a.petName?.toLowerCase() || "";
          bValue = b.petName?.toLowerCase() || "";
          break;
        case "affiliate": {
          const affiliateA = affiliates.find((aff) => aff.id === a.affiliateId);
          const affiliateB = affiliates.find((aff) => aff.id === b.affiliateId);
          aValue = affiliateA?.name?.toLowerCase() || "";
          bValue = affiliateB?.name?.toLowerCase() || "";
          break;
        }
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "quoteValue":
          aValue = parseFloat(a.quoteValue) || 0;
          bValue = parseFloat(b.quoteValue) || 0;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (quotesSortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredQuotes(filtered);
  }, [
    quotes,
    quotesSearchTerm,
    quotesStatusFilter,
    quotesSortBy,
    quotesSortOrder,
    affiliates,
  ]);

  // Filter spam quotes based on search term and status
  useEffect(() => {
    let filtered = spamQuotes;

    // Apply search filter
    if (spamQuotesSearchTerm) {
      const search = spamQuotesSearchTerm.toLowerCase();
      filtered = filtered.filter((quote) => {
        const affiliate = affiliates.find((a) => a.id === quote.affiliateId);
        return (
          quote.email?.toLowerCase().includes(search) ||
          quote.petName?.toLowerCase().includes(search) ||
          quote.petBreed?.toLowerCase().includes(search) ||
          quote.petType?.toLowerCase().includes(search) ||
          quote.petOwnerFirstName?.toLowerCase().includes(search) ||
          quote.petOwnerLastName?.toLowerCase().includes(search) ||
          quote.phone?.includes(search) ||
          quote.reason?.toLowerCase().includes(search) ||
          affiliate?.name?.toLowerCase().includes(search) ||
          affiliate?.email?.toLowerCase().includes(search)
        );
      });
    }

    // Apply reason filter
    if (spamQuotesReasonFilter !== "all") {
      filtered = filtered.filter(
        (quote) => quote.reason === spamQuotesReasonFilter
      );
    }

    setFilteredSpamQuotes(filtered);
  }, [spamQuotes, spamQuotesSearchTerm, spamQuotesReasonFilter, affiliates]);

  // Filter dog tags based on search term and status
  useEffect(() => {
    let filtered = dogTags;

    // Apply search filter
    if (dogTagsSearchTerm) {
      const search = dogTagsSearchTerm.toLowerCase();
      filtered = filtered.filter((tag) => {
        const tagDetails = tag.tag_details || {};
        const affiliate = affiliates.find((a) => a.id === tag.affiliateId);
        return (
          tagDetails.email?.toLowerCase().includes(search) ||
          tag.email?.toLowerCase().includes(search) ||
          tagDetails.pet_name?.toLowerCase().includes(search) ||
          tagDetails.pet_type?.toLowerCase().includes(search) ||
          tagDetails.owner_name?.toLowerCase().includes(search) ||
          tagDetails.phone_number?.includes(search) ||
          tagDetails.address?.toLowerCase().includes(search) ||
          tagDetails.color?.toLowerCase().includes(search) ||
          tagDetails.type?.toLowerCase().includes(search) ||
          tag.id?.toLowerCase().includes(search) ||
          affiliate?.name?.toLowerCase().includes(search) ||
          affiliate?.email?.toLowerCase().includes(search)
        );
      });
    }

    // Apply status filter (since there's no status in the current structure, we'll filter by donation and type)
    if (dogTagsStatusFilter !== "all") {
      filtered = filtered.filter((tag) => {
        const tagDetails = tag.tag_details || {};
        if (dogTagsStatusFilter === "donation") {
          return tagDetails.donation === true;
        } else if (dogTagsStatusFilter === "no_donation") {
          return tagDetails.donation === false;
        } else if (["bone", "heart", "circle"].includes(dogTagsStatusFilter)) {
          return tagDetails.type === dogTagsStatusFilter;
        }
        return true;
      });
    }

    // Apply ordered filter
    if (dogTagsOrderedFilter !== "all") {
      filtered = filtered.filter((tag) => {
        if (dogTagsOrderedFilter === "ordered") {
          return tag.ordered === true;
        } else if (dogTagsOrderedFilter === "not_ordered") {
          return tag.ordered !== true;
        }
        return true;
      });
    }

    setFilteredDogTags(filtered);
  }, [dogTags, dogTagsSearchTerm, dogTagsStatusFilter, dogTagsOrderedFilter, affiliates]);

  // Filter checkout events based on search term
  useEffect(() => {
    let filtered = checkoutEvents;

    // Apply search filter
    if (checkoutEventsSearchTerm) {
      const search = checkoutEventsSearchTerm.toLowerCase();
      filtered = filtered.filter((event) => {
        // Find affiliate email for this event
        const affiliateEmail =
          affiliates.find((a) => a.id === event.affiliateId)?.email ||
          affiliates.find((a) => a.name === event.affiliateName)?.email;

        return (
          // Page URL search
          event.pageUrl?.toLowerCase().includes(search) ||
          // Event details search
          event.eventCategory?.toLowerCase().includes(search) ||
          event.eventAction?.toLowerCase().includes(search) ||
          event.eventLabel?.toLowerCase().includes(search) ||
          // Value search
          event.value?.toString().toLowerCase().includes(search) ||
          event.monthlyPayment?.toString().toLowerCase().includes(search) ||
          // Additional useful fields
          event.userEmail?.toLowerCase().includes(search) ||
          event.petName?.toLowerCase().includes(search) ||
          event.affiliateName?.toLowerCase().includes(search) ||
          event.affiliateId?.toLowerCase().includes(search) ||
          event.quoteId?.toLowerCase().includes(search) ||
          event.checkoutUrl?.toLowerCase().includes(search) ||
          // Affiliate email search
          affiliateEmail?.toLowerCase().includes(search)
        );
      });
    }

    setFilteredCheckoutEvents(filtered);
  }, [checkoutEvents, checkoutEventsSearchTerm]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportOptions && !event.target.closest(".export-dropdown")) {
        setShowExportOptions(false);
      }
      if (
        showDogTagsExportOptions &&
        !event.target.closest(".dog-tags-export-dropdown")
      ) {
        setShowDogTagsExportOptions(false);
      }
      if (
        showCheckoutEventsExportOptions &&
        !event.target.closest(".checkout-events-export-dropdown")
      ) {
        setShowCheckoutEventsExportOptions(false);
      }
      if (
        showBulkQuoteActions &&
        !event.target.closest(".bulk-quote-actions")
      ) {
        setShowBulkQuoteActions(false);
      }
      if (showQuotesSort && !event.target.closest(".quotes-sort-dropdown")) {
        setShowQuotesSort(false);
      }
      if (
        showBulkDogTagActions &&
        !event.target.closest(".bulk-dog-tag-actions")
      ) {
        setShowBulkDogTagActions(false);
      }
      if (
        showBulkSpamQuoteActions &&
        !event.target.closest(".bulk-spam-quote-actions")
      ) {
        setShowBulkSpamQuoteActions(false);
      }
      if (
        showDogTagsOrderedFilter &&
        !event.target.closest(".dog-tags-ordered-filter")
      ) {
        setShowDogTagsOrderedFilter(false);
      }
      if (
        showBulkCheckoutEventActions &&
        !event.target.closest(".bulk-checkout-event-actions")
      ) {
        setShowBulkCheckoutEventActions(false);
      }
      if (
        showBulkTrashActions &&
        !event.target.closest(".bulk-trash-actions")
      ) {
        setShowBulkTrashActions(false);
      }

      // Close mobile sidebar when clicking outside on small screens
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById("mobile-sidebar");
        if (
          sidebar &&
          !sidebar.contains(event.target) &&
          !event.target.closest("[data-sidebar-toggle]")
        ) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showExportOptions,
    showDogTagsExportOptions,
    showCheckoutEventsExportOptions,
    showBulkQuoteActions,
    showBulkDogTagActions,
    showBulkSpamQuoteActions,
    showBulkCheckoutEventActions,
    showBulkTrashActions,
    showQuotesSort,
    showDogTagsOrderedFilter,
    isSidebarOpen,
  ]);

  // Handle quote approval
  const handleApproveQuote = async (quoteId) => {
    setQuotesLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const updateCommand = new UpdateItemCommand({
        TableName: "Quotes",
        Key: marshall({ id: quoteId }),
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({
          ":status": "approved",
          ":updatedAt": new Date().toISOString(),
        }),
        ReturnValues: "ALL_NEW",
      });

      await dynamoClient.send(updateCommand);

      // Update local state
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote) =>
          quote.id === quoteId ? { ...quote, status: "approved" } : quote
        )
      );

      toast.success("Quote approved successfully!");
    } catch (err) {
      console.error("Error approving quote:", err);
      toast.error("Failed to approve quote");
    } finally {
      setQuotesLoading(false);
    }
  };

  // Handle quote deletion (soft delete)
  const handleDeleteQuote = async (quoteId) => {
    if (!confirm("Are you sure you want to move this quote to trash?")) {
      return;
    }

    setQuotesLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const updateCommand = new UpdateItemCommand({
        TableName: "Quotes",
        Key: marshall({ id: quoteId }),
        UpdateExpression: "SET deleted = :deleted, deletedAt = :deletedAt",
        ExpressionAttributeValues: marshall({
          ":deleted": true,
          ":deletedAt": new Date().toISOString(),
        }),
        ReturnValues: "ALL_NEW",
      });

      const response = await dynamoClient.send(updateCommand);
      const deletedQuote = unmarshall(response.Attributes);

      // Update local state - move from active to deleted
      setQuotes((prevQuotes) =>
        prevQuotes.filter((quote) => quote.id !== quoteId)
      );
      setDeletedQuotes((prevDeleted) => [...prevDeleted, deletedQuote]);

      toast.success("Quote moved to trash successfully!");
    } catch (err) {
      console.error("Error deleting quote:", err);
      toast.error("Failed to move quote to trash");
    } finally {
      setQuotesLoading(false);
    }
  };

  // Handle quotes export
  const handleExportQuotes = (exportAll = false) => {
    try {
      const quotesToExport = exportAll ? quotes : filteredQuotes;
      const csvContent = convertQuotesToCSV(quotesToExport, affiliates);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `quotes_export_${
        exportAll ? "all" : "filtered"
      }_${timestamp}.csv`;

      downloadCSV(csvContent, filename);
      toast.success(`Successfully exported ${quotesToExport.length} quotes!`);
    } catch (error) {
      console.error("Error exporting quotes:", error);
      toast.error("Failed to export quotes");
    }
  };

  // Handle spam quotes export
  const handleExportSpamQuotes = (exportAll = false) => {
    try {
      const spamQuotesToExport = exportAll ? spamQuotes : filteredSpamQuotes;
      const csvContent = convertSpamQuotesToCSV(spamQuotesToExport, affiliates);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `spam_quotes_export_${
        exportAll ? "all" : "filtered"
      }_${timestamp}.csv`;

      downloadCSV(csvContent, filename);
      toast.success(
        `Successfully exported ${spamQuotesToExport.length} spam quotes!`
      );
    } catch (error) {
      console.error("Error exporting spam quotes:", error);
      toast.error("Failed to export spam quotes");
    }
  };

  // Handle restoring spam quote to main quotes table
  const handleRestoreSpamQuote = async (spamQuote) => {
    if (!confirm("Are you sure you want to restore this quote to the main quotes table?")) {
      return;
    }

    setSpamQuotesLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      // Import uuid to generate new ID for restored quote
      const { v4: uuidv4 } = await import('uuid');

      // Create the quote to restore with proper structure for main Quotes table
      const quoteToRestore = {
        id: uuidv4(), // Generate new UUID for main Quotes table
        affiliateId: spamQuote.affiliateId,
        email: spamQuote.email,
        phone: spamQuote.phone,
        petOwnerFirstName: spamQuote.petOwnerFirstName,
        petOwnerLastName: spamQuote.petOwnerLastName,
        petName: spamQuote.petName,
        address: spamQuote.address,
        zipCode: spamQuote.zipCode,
        petBreed: spamQuote.petBreed,
        petAge: spamQuote.petAge,
        petType: spamQuote.petType || "dog", // Default to dog if not specified
        status: "pending", // Reset status to pending
        amount: 0, // Default amount
        commission: 0, // Default commission
        basePrice: 0, // Default base price
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        notes: spamQuote.notes || "",
        restoredAt: new Date().toISOString(),
        restoredFromSpam: true,
        originalSpamReason: spamQuote.reason, // Keep original spam reason for reference
      };

      // Add the quote to the main Quotes table
      const putCommand = new PutItemCommand({
        TableName: "Quotes",
        Item: marshall(quoteToRestore, { removeUndefinedValues: true }),
      });

      await dynamoClient.send(putCommand);

      // Try to remove from SpamQuotes table using correct key structure
      try {
        const deleteCommand = new DeleteItemCommand({
          TableName: "SpamQuotes",
          Key: marshall({ 
            affiliateId: spamQuote.affiliateId,
            timestamp: spamQuote.timestamp 
          }, { removeUndefinedValues: true }),
        });
        await dynamoClient.send(deleteCommand);
      } catch (deleteError) {
        console.warn("Could not delete from SpamQuotes table:", deleteError);
        // Continue with the restore even if delete fails
      }

      // Update local state
      setSpamQuotes((prevSpamQuotes) =>
        prevSpamQuotes.filter((quote) => 
          !(quote.affiliateId === spamQuote.affiliateId && quote.timestamp === spamQuote.timestamp)
        )
      );
      setQuotes((prevQuotes) => [...prevQuotes, quoteToRestore]);

      toast.success("Quote restored successfully to main quotes table!");
    } catch (err) {
      console.error("Error restoring spam quote:", err);
      toast.error("Failed to restore quote");
    } finally {
      setSpamQuotesLoading(false);
    }
  };

  // Handle bulk spam quote actions
  const handleBulkSpamQuoteAction = async (action) => {
    if (selectedSpamQuotes.length === 0) {
      toast.error("Please select spam quotes to perform bulk action");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedSpamQuotes.length} selected spam quotes?`
      )
    ) {
      return;
    }

    setSpamQuotesLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      if (action === "restore") {
        // Get selected spam quotes (using affiliateId + timestamp as unique identifier)
        const selectedQuotes = spamQuotes.filter((quote) =>
          selectedSpamQuotes.includes(`${quote.affiliateId}-${quote.timestamp}`)
        );

        // Import uuid to generate new IDs for restored quotes
        const { v4: uuidv4 } = await import('uuid');

        // Process each quote
        for (const spamQuote of selectedQuotes) {
          // Create the quote to restore with proper structure for main Quotes table
          const quoteToRestore = {
            id: uuidv4(), // Generate new UUID for main Quotes table
            affiliateId: spamQuote.affiliateId,
            email: spamQuote.email,
            phone: spamQuote.phone,
            petOwnerFirstName: spamQuote.petOwnerFirstName,
            petOwnerLastName: spamQuote.petOwnerLastName,
            petName: spamQuote.petName,
            address: spamQuote.address,
            zipCode: spamQuote.zipCode,
            petBreed: spamQuote.petBreed,
            petAge: spamQuote.petAge,
            petType: spamQuote.petType || "dog", // Default to dog if not specified
            status: "pending", // Reset status to pending
            amount: 0, // Default amount
            commission: 0, // Default commission
            basePrice: 0, // Default base price
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            notes: spamQuote.notes || "",
            restoredAt: new Date().toISOString(),
            restoredFromSpam: true,
            originalSpamReason: spamQuote.reason, // Keep original spam reason for reference
          };

          // Add to main Quotes table
          const putCommand = new PutItemCommand({
            TableName: "Quotes",
            Item: marshall(quoteToRestore, { removeUndefinedValues: true }),
          });

          await dynamoClient.send(putCommand);

          // Try to remove from SpamQuotes table using correct key structure
          try {
            const deleteCommand = new DeleteItemCommand({
              TableName: "SpamQuotes",
              Key: marshall({ 
                affiliateId: spamQuote.affiliateId,
                timestamp: spamQuote.timestamp 
              }, { removeUndefinedValues: true }),
            });
            await dynamoClient.send(deleteCommand);
          } catch (deleteError) {
            console.warn("Could not delete from SpamQuotes table:", deleteError);
            // Continue with the restore even if delete fails
          }
        }

        // Update local state
        setSpamQuotes((prevSpamQuotes) =>
          prevSpamQuotes.filter((quote) => 
            !selectedSpamQuotes.includes(`${quote.affiliateId}-${quote.timestamp}`)
          )
        );
        setQuotes((prevQuotes) => [
          ...prevQuotes,
          ...selectedQuotes.map(quote => ({
            ...quote,
            status: "pending",
            restoredAt: new Date().toISOString(),
            restoredFromSpam: true,
          }))
        ]);

        toast.success(
          `Successfully restored ${selectedQuotes.length} spam quotes to main quotes table!`
        );
      }

      setSelectedSpamQuotes([]);
      setShowBulkSpamQuoteActions(false);
    } catch (error) {
      console.error("Error performing bulk spam quote action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setSpamQuotesLoading(false);
    }
  };

  // Handle dog tags export
  const handleExportDogTags = (exportAll = false) => {
    try {
      const tagsToExport = exportAll ? dogTags : filteredDogTags;
      const csvContent = convertDogTagsToCSV(tagsToExport, affiliates);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `dog_tags_export_${
        exportAll ? "all" : "filtered"
      }_${timestamp}.csv`;

      downloadCSV(csvContent, filename);
      toast.success(`Successfully exported ${tagsToExport.length} dog tags!`);
    } catch (error) {
      console.error("Error exporting dog tags:", error);
      toast.error("Failed to export dog tags");
    }
  };

  // Handle bulk dog tag actions
  const handleBulkDogTagAction = async (action) => {
    if (selectedDogTags.length === 0) {
      toast.error("Please select dog tags to perform bulk action");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedDogTags.length} selected dog tags?`
      )
    ) {
      return;
    }

    setDogTagsLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      if (action === "delete") {
        // Get selected dog tags
        const selectedTags = dogTags.filter((tag) =>
          selectedDogTags.includes(tag.timestamp)
        );

        // Soft delete individual dog tags by affiliateId and timestamp
        const updatePromises = selectedTags.map((tag) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "DogTag",
              Key: marshall({
                affiliateId: tag.affiliateId,
                timestamp: tag.timestamp,
              }),
              UpdateExpression:
                "SET deleted = :deleted, deletedAt = :deletedAt",
              ExpressionAttributeValues: marshall({
                ":deleted": true,
                ":deletedAt": new Date().toISOString(),
              }),
              ReturnValues: "ALL_NEW",
            })
          );
        });

        const responses = await Promise.all(updatePromises);
        const deletedTagsData = responses.map((response) =>
          unmarshall(response.Attributes)
        );

        // Update local state - move from active to deleted
        setDogTags((prevDogTags) =>
          prevDogTags.filter((tag) => !selectedDogTags.includes(tag.timestamp))
        );
        setDeletedDogTags((prevDeleted) => [
          ...prevDeleted,
          ...deletedTagsData,
        ]);
        toast.success(
          `Successfully moved ${selectedTags.length} dog tags to trash!`
        );
      } else if (action === "markAsOrdered") {
        // Mark selected dog tags as ordered
        const selectedTags = dogTags.filter((tag) =>
          selectedDogTags.includes(tag.timestamp)
        );

        const updatePromises = selectedTags.map((tag) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "DogTag",
              Key: marshall({
                affiliateId: tag.affiliateId,
                timestamp: tag.timestamp,
              }),
              UpdateExpression: "SET ordered = :ordered, orderedAt = :orderedAt",
              ExpressionAttributeValues: marshall({
                ":ordered": true,
                ":orderedAt": new Date().toISOString(),
              }),
              ReturnValues: "ALL_NEW",
            })
          );
        });

        await Promise.all(updatePromises);

        // Update local state
        setDogTags((prevDogTags) =>
          prevDogTags.map((tag) =>
            selectedDogTags.includes(tag.timestamp)
              ? { ...tag, ordered: true, orderedAt: new Date().toISOString() }
              : tag
          )
        );
        toast.success(
          `Successfully marked ${selectedTags.length} dog tags as ordered!`
        );
      } else if (action === "markAsNotOrdered") {
        // Mark selected dog tags as not ordered
        const selectedTags = dogTags.filter((tag) =>
          selectedDogTags.includes(tag.timestamp)
        );

        const updatePromises = selectedTags.map((tag) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "DogTag",
              Key: marshall({
                affiliateId: tag.affiliateId,
                timestamp: tag.timestamp,
              }),
              UpdateExpression: "REMOVE ordered, orderedAt",
              ReturnValues: "ALL_NEW",
            })
          );
        });

        await Promise.all(updatePromises);

        // Update local state
        setDogTags((prevDogTags) =>
          prevDogTags.map((tag) =>
            selectedDogTags.includes(tag.timestamp)
              ? { ...tag, ordered: false, orderedAt: null }
              : tag
          )
        );
        toast.success(
          `Successfully marked ${selectedTags.length} dog tags as not ordered!`
        );
      } else if (action === "exportByAffiliate") {
        // Get unique affiliate IDs from selected dog tags
        const selectedTags = dogTags.filter((tag) =>
          selectedDogTags.includes(tag.timestamp)
        );
        const uniqueAffiliateIds = [
          ...new Set(selectedTags.map((tag) => tag.affiliateId)),
        ];

        // Export all dog tags for these affiliates
        const tagsToExport = dogTags.filter((tag) =>
          uniqueAffiliateIds.includes(tag.affiliateId)
        );
        const csvContent = convertDogTagsToCSV(tagsToExport, affiliates);
        const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
        const filename = `dog_tags_export_by_affiliate_${timestamp}.csv`;

        downloadCSV(csvContent, filename);
        toast.success(
          `Successfully exported all dog tags for ${uniqueAffiliateIds.length} affiliates!`
        );
      }

      setSelectedDogTags([]);
      setShowBulkDogTagActions(false);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setDogTagsLoading(false);
    }
  };

  // Handle bulk quote actions
  const handleBulkQuoteAction = async (action) => {
    if (selectedQuotes.length === 0) {
      toast.error("Please select quotes to perform bulk action");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedQuotes.length} selected quotes?`
      )
    ) {
      return;
    }

    setQuotesLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      if (action === "delete") {
        // Soft delete selected quotes
        const updatePromises = selectedQuotes.map((quoteId) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "Quotes",
              Key: marshall({ id: quoteId }),
              UpdateExpression:
                "SET deleted = :deleted, deletedAt = :deletedAt",
              ExpressionAttributeValues: marshall({
                ":deleted": true,
                ":deletedAt": new Date().toISOString(),
              }),
              ReturnValues: "ALL_NEW",
            })
          );
        });

        const responses = await Promise.all(updatePromises);
        const deletedQuotesData = responses.map((response) =>
          unmarshall(response.Attributes)
        );

        // Update local state - move from active to deleted
        setQuotes((prevQuotes) =>
          prevQuotes.filter((quote) => !selectedQuotes.includes(quote.id))
        );
        setDeletedQuotes((prevDeleted) => [
          ...prevDeleted,
          ...deletedQuotesData,
        ]);
        toast.success(
          `Successfully moved ${selectedQuotes.length} quotes to trash!`
        );
      } else if (action === "approve") {
        // Approve selected quotes
        const updatePromises = selectedQuotes.map((quoteId) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "Quotes",
              Key: marshall({ id: quoteId }),
              UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: marshall({
                ":status": "approved",
                ":updatedAt": new Date().toISOString(),
              }),
            })
          );
        });

        await Promise.all(updatePromises);

        // Update local state
        setQuotes((prevQuotes) =>
          prevQuotes.map((quote) =>
            selectedQuotes.includes(quote.id)
              ? { ...quote, status: "approved" }
              : quote
          )
        );
        toast.success(`Successfully approved ${selectedQuotes.length} quotes!`);
      } else if (action === "reject") {
        // Reject selected quotes
        const updatePromises = selectedQuotes.map((quoteId) => {
          return dynamoClient.send(
            new UpdateItemCommand({
              TableName: "Quotes",
              Key: marshall({ id: quoteId }),
              UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: marshall({
                ":status": "rejected",
                ":updatedAt": new Date().toISOString(),
              }),
            })
          );
        });

        await Promise.all(updatePromises);

        // Update local state
        setQuotes((prevQuotes) =>
          prevQuotes.map((quote) =>
            selectedQuotes.includes(quote.id)
              ? { ...quote, status: "rejected" }
              : quote
          )
        );
        toast.success(`Successfully rejected ${selectedQuotes.length} quotes!`);
      }

      setSelectedQuotes([]);
      setShowBulkQuoteActions(false);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setQuotesLoading(false);
    }
  };

  // Handle quote selection
  const handleQuoteSelection = (quoteId, isSelected) => {
    if (isSelected) {
      setSelectedQuotes((prev) => [...prev, quoteId]);
    } else {
      setSelectedQuotes((prev) => prev.filter((id) => id !== quoteId));
    }
  };

  // Handle select all quotes
  const handleSelectAllQuotes = (isSelected) => {
    if (isSelected) {
      setSelectedQuotes(filteredQuotes.map((quote) => quote.id));
    } else {
      setSelectedQuotes([]);
    }
  };

  // Check if all quotes are selected
  const areAllQuotesSelected =
    filteredQuotes.length > 0 &&
    selectedQuotes.length === filteredQuotes.length;

  // Handle dog tag selection - simplified to prevent freezing
  const handleDogTagSelection = (tagTimestamp, isSelected) => {
    if (isSelected) {
      setSelectedDogTags((prev) => [...prev, tagTimestamp]);
    } else {
      setSelectedDogTags((prev) =>
        prev.filter((timestamp) => timestamp !== tagTimestamp)
      );
    }
  };

  // Handle spam quote selection
  const handleSpamQuoteSelection = (quoteId, isSelected) => {
    if (isSelected) {
      setSelectedSpamQuotes((prev) => [...prev, quoteId]);
    } else {
      setSelectedSpamQuotes((prev) =>
        prev.filter((id) => id !== quoteId)
      );
    }
  };

  // Handle select all spam quotes
  const handleSelectAllSpamQuotes = (isSelected) => {
    if (isSelected) {
      setSelectedSpamQuotes(filteredSpamQuotes.map((quote) => `${quote.affiliateId}-${quote.timestamp}`));
    } else {
      setSelectedSpamQuotes([]);
    }
  };

  // Check if all spam quotes are selected
  const areAllSpamQuotesSelected =
    filteredSpamQuotes.length > 0 &&
    selectedSpamQuotes.length === filteredSpamQuotes.length;

  // Handle marking dog tag as ordered
  const handleMarkDogTagAsOrdered = async (tagTimestamp, isOrdered) => {
    setDogTagsLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const updateCommand = new UpdateItemCommand({
        TableName: "DogTag",
        Key: marshall({
          affiliateId: dogTags.find(tag => tag.timestamp === tagTimestamp)?.affiliateId,
          timestamp: tagTimestamp,
        }),
        UpdateExpression: "SET ordered = :ordered, orderedAt = :orderedAt",
        ExpressionAttributeValues: marshall({
          ":ordered": isOrdered,
          ":orderedAt": isOrdered ? new Date().toISOString() : null,
        }),
        ReturnValues: "ALL_NEW",
      });

      await dynamoClient.send(updateCommand);

      // Update local state
      setDogTags((prevDogTags) =>
        prevDogTags.map((tag) =>
          tag.timestamp === tagTimestamp
            ? { ...tag, ordered: isOrdered, orderedAt: isOrdered ? new Date().toISOString() : null }
            : tag
        )
      );

      toast.success(`Dog tag ${isOrdered ? 'marked as ordered' : 'marked as not ordered'} successfully!`);
    } catch (err) {
      console.error("Error updating dog tag order status:", err);
      toast.error("Failed to update dog tag order status");
    } finally {
      setDogTagsLoading(false);
    }
  };

  // Handle select all dog tags - simplified
  const handleSelectAllDogTags = (isSelected) => {
    if (isSelected) {
      setSelectedDogTags(filteredDogTags.map((tag) => tag.timestamp));
    } else {
      setSelectedDogTags([]);
    }
  };

  // Memoized selection state calculation to prevent performance issues
  const { areAllDogTagsSelected, someDogTagsSelected } = useMemo(() => {
    const filteredSelectedCount = filteredDogTags.filter((tag) =>
      selectedDogTags.includes(tag.timestamp)
    ).length;
    return {
      areAllDogTagsSelected:
        filteredDogTags.length > 0 &&
        filteredSelectedCount === filteredDogTags.length,
      someDogTagsSelected:
        filteredSelectedCount > 0 &&
        filteredSelectedCount < filteredDogTags.length,
    };
  }, [filteredDogTags, selectedDogTags]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const affiliatesCommand = new ScanCommand({
        TableName: "Affiliates",
      });
      const affiliatesResponse = await dynamoClient.send(affiliatesCommand);
      const allAffiliates = affiliatesResponse.Items.map((item) =>
        unmarshall(item)
      );
      setAffiliates(allAffiliates);

      const salesCommand = new ScanCommand({
        TableName: "Sales",
      });
      const salesResponse = await dynamoClient.send(salesCommand);
      const allSales = salesResponse.Items.map((item) => unmarshall(item));
      setSales(allSales);

      // Also fetch quotes initially and separate active from deleted
      const quotesCommand = new ScanCommand({
        TableName: "Quotes",
      });
      const quotesResponse = await dynamoClient.send(quotesCommand);
      const allQuotes = quotesResponse.Items.map((item) => unmarshall(item));

      // Separate active and deleted quotes
      const activeQuotes = allQuotes.filter((quote) => !quote.deleted);
      const deletedQuotes = allQuotes.filter((quote) => quote.deleted);

      setQuotes(activeQuotes);
      setDeletedQuotes(deletedQuotes);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const quotesCommand = new ScanCommand({
        TableName: "Quotes",
      });
      const quotesResponse = await dynamoClient.send(quotesCommand);
      const allQuotes = quotesResponse.Items.map((item) => unmarshall(item));

      // Separate active and deleted quotes for consistency
      const activeQuotes = allQuotes.filter((quote) => !quote.deleted);
      const deletedQuotes = allQuotes.filter((quote) => quote.deleted);

      setQuotes(activeQuotes);
      setDeletedQuotes(deletedQuotes);
    } catch (err) {
      console.error("Error fetching quotes data:", err);
      toast.error("Failed to load quotes data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpamQuotes = async () => {
    try {
      setSpamQuotesLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const spamQuotesCommand = new ScanCommand({
        TableName: "SpamQuotes",
      });
      const spamQuotesResponse = await dynamoClient.send(spamQuotesCommand);
      const allSpamQuotes = spamQuotesResponse.Items.map((item) =>
        unmarshall(item)
      );

      setSpamQuotes(allSpamQuotes);
    } catch (err) {
      console.error("Error fetching spam quotes data:", err);
      toast.error("Failed to load spam quotes data");
    } finally {
      setSpamQuotesLoading(false);
    }
  };

  const fetchDogTags = async () => {
    try {
      setDogTagsLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const dogTagsCommand = new ScanCommand({
        TableName: "DogTag",
      });
      const dogTagsResponse = await dynamoClient.send(dogTagsCommand);
      const allDogTags = dogTagsResponse.Items.map((item) => unmarshall(item));

      // Separate active and deleted dog tags
      const activeDogTags = allDogTags.filter((tag) => !tag.deleted);
      const deletedDogTags = allDogTags.filter((tag) => tag.deleted);

      setDogTags(activeDogTags);
      setDeletedDogTags(deletedDogTags);
    } catch (err) {
      console.error("Error fetching dog tags data:", err);
      toast.error("Failed to load dog tags data");
    } finally {
      setDogTagsLoading(false);
    }
  };

  const fetchCheckoutEvents = async (affiliateId = null) => {
    try {
      setCheckoutEventsLoading(true);

      console.log("Fetching checkout events for affiliate:", affiliateId);

      const { start, end } = getDateRange(checkoutEventsDateRange);
      let allEvents = [];

      if (affiliateId === "all" || !affiliateId) {
        // Fetch events for all affiliates
        console.log("Fetching checkout events for all affiliates");

        // Fetch events for each affiliate
        const fetchPromises = affiliates.map(async (affiliate) => {
          try {
            // Try to fetch using the affiliate ID first
            let response = await fetch(
              "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  action: start && end ? "timeRange" : "bulkRead",
                  affiliateId: affiliate.id,
                  ...(start &&
                    end && {
                      startTime: start.toISOString(),
                      endTime: end.toISOString(),
                    }),
                }),
              }
            );

            let events = [];

            if (response.ok) {
              const responseData = await response.json();
              let data;
              if (responseData.body) {
                data = JSON.parse(responseData.body);
              } else {
                data = responseData;
              }

              events = data.items || [];
              console.log(
                `Events found for affiliate ${affiliate.name} (ID):`,
                events.length
              );
            }

            // If no events found with affiliate ID, try with affiliate name
            if (events.length === 0 && affiliate.name) {
              response = await fetch(
                "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    action: start && end ? "timeRange" : "bulkRead",
                    affiliateId: affiliate.name,
                    ...(start &&
                      end && {
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                      }),
                  }),
                }
              );

              if (response.ok) {
                const responseData = await response.json();
                let data;
                if (responseData.body) {
                  data = JSON.parse(responseData.body);
                } else {
                  data = responseData;
                }

                events = data.items || [];
                console.log(
                  `Events found for affiliate ${affiliate.name} (name):`,
                  events.length
                );
              }
            }

            return events;
          } catch (err) {
            console.error(
              `Error fetching events for affiliate ${affiliate.name}:`,
              err
            );
            return [];
          }
        });

        const affiliateEventsArrays = await Promise.all(fetchPromises);
        allEvents = affiliateEventsArrays.flat();
      } else {
        // Fetch events for a specific affiliate
        const affiliate = affiliates.find((a) => a.id === affiliateId);
        if (!affiliate) {
          console.error("Affiliate not found:", affiliateId);
          setCheckoutEvents([]);
          return;
        }

        // Try to fetch using the affiliate ID first
        let response = await fetch(
          "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: start && end ? "timeRange" : "bulkRead",
              affiliateId: affiliateId,
              ...(start &&
                end && {
                  startTime: start.toISOString(),
                  endTime: end.toISOString(),
                }),
            }),
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          let data;
          if (responseData.body) {
            data = JSON.parse(responseData.body);
          } else {
            data = responseData;
          }

          allEvents = data.items || [];
          console.log("Events found with affiliate ID:", allEvents.length);
        }

        // If no events found with affiliate ID, try with affiliate name
        if (allEvents.length === 0 && affiliate.name) {
          console.log(
            "No events found with affiliate ID, trying with affiliate name:",
            affiliate.name
          );

          response = await fetch(
            "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: start && end ? "timeRange" : "bulkRead",
                affiliateId: affiliate.name,
                ...(start &&
                  end && {
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                  }),
              }),
            }
          );

          if (response.ok) {
            const responseData = await response.json();
            let data;
            if (responseData.body) {
              data = JSON.parse(responseData.body);
            } else {
              data = responseData;
            }

            allEvents = data.items || [];
            console.log("Events found with affiliate name:", allEvents.length);
          }
        }
      }

      console.log("Final events array:", allEvents);
      console.log("Total number of events:", allEvents.length);

      // Sort events by timestamp (newest first)
      allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setCheckoutEvents(allEvents);
      console.log("Set checkout events to state");
    } catch (err) {
      console.error("Error fetching checkout events:", err);
      toast.error("Failed to load checkout events");
      setCheckoutEvents([]);
    } finally {
      setCheckoutEventsLoading(false);
    }
  };

  const handleDeleteCheckoutEvent = async (event) => {
    if (!confirm("Are you sure you want to delete this checkout event?")) {
      return;
    }

    setCheckoutEventsLoading(true);
    try {
      const response = await fetch(
        "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete",
            affiliateId: event.affiliateId,
            timestamp: event.timestamp,
          }),
        }
      );

      if (response.ok) {
        setCheckoutEvents((prev) =>
          prev.filter(
            (e) =>
              !(
                e.affiliateId === event.affiliateId &&
                e.timestamp === event.timestamp
              )
          )
        );
        toast.success("Checkout event deleted successfully!");
      } else {
        throw new Error("Failed to delete checkout event");
      }
    } catch (err) {
      console.error("Error deleting checkout event:", err);
      toast.error("Failed to delete checkout event");
    } finally {
      setCheckoutEventsLoading(false);
    }
  };

  const handleExportCheckoutEvents = (exportAll = false) => {
    try {
      const eventsToExport = exportAll
        ? checkoutEvents
        : filteredCheckoutEvents;
      const csvContent = convertCheckoutEventsToCSV(eventsToExport);
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `checkout_events_export_${
        exportAll ? "all" : "filtered"
      }_${timestamp}.csv`;

      downloadCSV(csvContent, filename);
      toast.success(
        `Successfully exported ${eventsToExport.length} checkout events!`
      );
    } catch (error) {
      console.error("Error exporting checkout events:", error);
      toast.error("Failed to export checkout events");
    }
  };

  const handleBulkCheckoutEventAction = async (action) => {
    if (selectedCheckoutEvents.length === 0) {
      toast.error("Please select checkout events to perform bulk action");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedCheckoutEvents.length} selected checkout events?`
      )
    ) {
      return;
    }

    setCheckoutEventsLoading(true);
    try {
      if (action === "delete") {
        const deletePromises = selectedCheckoutEvents.map((eventKey) => {
          const [affiliateId, timestamp] = eventKey.split("|");
          return fetch(
            "https://611nm888l0.execute-api.us-east-1.amazonaws.com/Prod/checkout-events",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "delete",
                affiliateId,
                timestamp,
              }),
            }
          );
        });

        await Promise.all(deletePromises);

        // Update local state
        setCheckoutEvents((prev) =>
          prev.filter(
            (event) =>
              !selectedCheckoutEvents.includes(
                `${event.affiliateId}|${event.timestamp}`
              )
          )
        );
        toast.success(
          `Successfully deleted ${selectedCheckoutEvents.length} checkout events!`
        );
      }

      setSelectedCheckoutEvents([]);
      setShowBulkCheckoutEventActions(false);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setCheckoutEventsLoading(false);
    }
  };

  const dashboardStats = {
    totalSales: filteredSales.reduce((sum, sale) => sum + sale.amount, 0),
    activeAffiliates: affiliates.length,
    avgCommission:
      quotes.length > 0
        ? quotes
            .filter((quote) => quote.status === "approved")
            .reduce((sum, quote) => {
              const affiliate = affiliates.find(
                (aff) => aff.id === quote.affiliateId
              );
              return sum + (parseFloat(affiliate?.basePrice) || 0);
            }, 0) /
          Math.max(
            quotes.filter((quote) => quote.status === "approved").length,
            1
          )
        : 0,
    topPerformer:
      affiliates.length > 0 && filteredSales.length > 0
        ? affiliates.reduce((prev, curr) => {
            const currSales = filteredSales
              .filter((sale) => sale.affiliateId === curr.id)
              .reduce((sum, sale) => sum + sale.amount, 0);
            const prevSales = filteredSales
              .filter((sale) => sale.affiliateId === prev.id)
              .reduce((sum, sale) => sum + sale.amount, 0);
            return currSales > prevSales ? curr : prev;
          }, affiliates[0])
        : null,
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Trash management functions
  const handleRestoreItem = async (item, type) => {
    if (!confirm(`Are you sure you want to restore this ${type}?`)) {
      return;
    }

    setTrashLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const tableName = type === "quote" ? "Quotes" : "DogTag";
      const key =
        type === "quote"
          ? marshall({ id: item.id })
          : marshall({
              affiliateId: item.affiliateId,
              timestamp: item.timestamp,
            });

      const updateCommand = new UpdateItemCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression:
          "REMOVE deleted, deletedAt SET restoredAt = :restoredAt",
        ExpressionAttributeValues: marshall({
          ":restoredAt": new Date().toISOString(),
        }),
        ReturnValues: "ALL_NEW",
      });

      const response = await dynamoClient.send(updateCommand);
      const restoredItem = unmarshall(response.Attributes);

      // Update local state
      if (type === "quote") {
        setDeletedQuotes((prevDeleted) =>
          prevDeleted.filter((quote) => quote.id !== item.id)
        );
        setQuotes((prevQuotes) => [...prevQuotes, restoredItem]);
      } else {
        setDeletedDogTags((prevDeleted) =>
          prevDeleted.filter((tag) => tag.timestamp !== item.timestamp)
        );
        setDogTags((prevTags) => [...prevTags, restoredItem]);
      }

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!`
      );
    } catch (err) {
      console.error(`Error restoring ${type}:`, err);
      toast.error(`Failed to restore ${type}`);
    } finally {
      setTrashLoading(false);
    }
  };

  const handlePermanentDelete = async (item, type) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete this ${type}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setTrashLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const tableName = type === "quote" ? "Quotes" : "DogTag";
      const key =
        type === "quote"
          ? marshall({ id: item.id })
          : marshall({
              affiliateId: item.affiliateId,
              timestamp: item.timestamp,
            });

      const deleteCommand = new DeleteItemCommand({
        TableName: tableName,
        Key: key,
      });

      await dynamoClient.send(deleteCommand);

      // Update local state
      if (type === "quote") {
        setDeletedQuotes((prevDeleted) =>
          prevDeleted.filter((quote) => quote.id !== item.id)
        );
      } else {
        setDeletedDogTags((prevDeleted) =>
          prevDeleted.filter((tag) => tag.timestamp !== item.timestamp)
        );
      }

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted!`
      );
    } catch (err) {
      console.error(`Error permanently deleting ${type}:`, err);
      toast.error(`Failed to permanently delete ${type}`);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleBulkTrashAction = async (action) => {
    if (selectedTrashItems.length === 0) {
      toast.error("Please select items to perform bulk action");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedTrashItems.length} selected items?`
      )
    ) {
      return;
    }

    setTrashLoading(true);
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const quoteItems = selectedTrashItems.filter((id) =>
        id.startsWith("quote-")
      );
      const dogTagItems = selectedTrashItems.filter((id) =>
        id.startsWith("tag-")
      );

      if (action === "restore") {
        // Restore selected items
        const promises = [];

        quoteItems.forEach((id) => {
          const quoteId = id.replace("quote-", "");
          promises.push(
            dynamoClient.send(
              new UpdateItemCommand({
                TableName: "Quotes",
                Key: marshall({ id: quoteId }),
                UpdateExpression:
                  "REMOVE deleted, deletedAt SET restoredAt = :restoredAt",
                ExpressionAttributeValues: marshall({
                  ":restoredAt": new Date().toISOString(),
                }),
                ReturnValues: "ALL_NEW",
              })
            )
          );
        });

        dogTagItems.forEach((id) => {
          const [affiliateId, timestamp] = id.replace("tag-", "").split("|");
          promises.push(
            dynamoClient.send(
              new UpdateItemCommand({
                TableName: "DogTag",
                Key: marshall({ affiliateId, timestamp }),
                UpdateExpression:
                  "REMOVE deleted, deletedAt SET restoredAt = :restoredAt",
                ExpressionAttributeValues: marshall({
                  ":restoredAt": new Date().toISOString(),
                }),
                ReturnValues: "ALL_NEW",
              })
            )
          );
        });

        const responses = await Promise.all(promises);

        // Update local state
        const restoredQuotes = responses
          .slice(0, quoteItems.length)
          .map((r) => unmarshall(r.Attributes));
        const restoredTags = responses
          .slice(quoteItems.length)
          .map((r) => unmarshall(r.Attributes));

        setQuotes((prev) => [...prev, ...restoredQuotes]);
        setDogTags((prev) => [...prev, ...restoredTags]);

        const quoteIds = quoteItems.map((id) => id.replace("quote-", ""));
        const tagTimestamps = dogTagItems.map(
          (id) => id.replace("tag-", "").split("|")[1]
        );

        setDeletedQuotes((prev) =>
          prev.filter((q) => !quoteIds.includes(q.id))
        );
        setDeletedDogTags((prev) =>
          prev.filter((t) => !tagTimestamps.includes(t.timestamp))
        );

        toast.success(
          `Successfully restored ${selectedTrashItems.length} items!`
        );
      } else if (action === "permanentDelete") {
        // Permanently delete selected items
        const promises = [];

        quoteItems.forEach((id) => {
          const quoteId = id.replace("quote-", "");
          promises.push(
            dynamoClient.send(
              new DeleteItemCommand({
                TableName: "Quotes",
                Key: marshall({ id: quoteId }),
              })
            )
          );
        });

        dogTagItems.forEach((id) => {
          const [affiliateId, timestamp] = id.replace("tag-", "").split("|");
          promises.push(
            dynamoClient.send(
              new DeleteItemCommand({
                TableName: "DogTag",
                Key: marshall({ affiliateId, timestamp }),
              })
            )
          );
        });

        await Promise.all(promises);

        // Update local state
        const quoteIds = quoteItems.map((id) => id.replace("quote-", ""));
        const tagTimestamps = dogTagItems.map(
          (id) => id.replace("tag-", "").split("|")[1]
        );

        setDeletedQuotes((prev) =>
          prev.filter((q) => !quoteIds.includes(q.id))
        );
        setDeletedDogTags((prev) =>
          prev.filter((t) => !tagTimestamps.includes(t.timestamp))
        );

        toast.success(
          `Successfully permanently deleted ${selectedTrashItems.length} items!`
        );
      }

      setSelectedTrashItems([]);
      setShowBulkTrashActions(false);
    } catch (error) {
      console.error("Error performing bulk trash action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setTrashLoading(false);
    }
  };

  // Filter trash items based on search and filter
  const filteredTrashItems = useMemo(() => {
    let allTrashItems = [
      ...deletedQuotes.map((quote) => ({ ...quote, type: "quote" })),
      ...deletedDogTags.map((tag) => ({ ...tag, type: "dogTag" })),
    ];

    if (trashSearchTerm) {
      const search = trashSearchTerm.toLowerCase();
      allTrashItems = allTrashItems.filter((item) => {
        if (item.type === "quote") {
          return (
            item.email?.toLowerCase().includes(search) ||
            item.petName?.toLowerCase().includes(search) ||
            item.petOwnerFirstName?.toLowerCase().includes(search) ||
            item.petOwnerLastName?.toLowerCase().includes(search)
          );
        } else {
          const tagDetails = item.tag_details || {};
          return (
            tagDetails.email?.toLowerCase().includes(search) ||
            tagDetails.pet_name?.toLowerCase().includes(search) ||
            tagDetails.owner_name?.toLowerCase().includes(search)
          );
        }
      });
    }

    if (trashFilter !== "all") {
      allTrashItems = allTrashItems.filter((item) => item.type === trashFilter);
    }

    return allTrashItems.sort(
      (a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)
    );
  }, [deletedQuotes, deletedDogTags, trashSearchTerm, trashFilter]);

  const menuItems = [
    { name: "Overview", icon: Layout, id: "overview" },
    { name: "Affiliates", icon: Users, id: "affiliates" },
    { name: "Quotes", icon: FileText, id: "quotes" },
    { name: "Spam Quotes", icon: AlertTriangle, id: "spam-quotes" },
    { name: "Dog Tags", icon: Star, id: "dogtags" },
    { name: "Checkout Events", icon: ShoppingCart, id: "checkout-events" },
    { name: "Trash", icon: Trash2, id: "trash" },
    { name: "Settings", icon: Settings, id: "settings" },
    { name: "Conversion and Traffic", icon: ChartNoAxesColumn, id: "analytics-conversion" },
    { name: "Admins", icon: Users, id: "admins" },
  ];

  const chartData = prepareChartData();
  const affiliateComparisonData = prepareAffiliateComparisonData();
  const totalValue = chartData.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const averageValue = totalCount > 0 ? totalValue / totalCount : 0;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <div className="flex justify-end mb-4">
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center px-4 py-2 text-sm bg-white border rounded-lg shadow-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  {dateRange === "custom"
                    ? `${format(
                        new Date(customStartDate),
                        "MMM dd, yyyy"
                      )} - ${format(new Date(customEndDate), "MMM dd, yyyy")}`
                    : dateRange.replace(/([A-Z])/g, " $1").toLowerCase()}
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 z-10 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg">
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
                          setDateRange("thisYear");
                          setShowDatePicker(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                      >
                        This Year
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
                      <button
                        onClick={() => {
                          setDateRange("last6Months");
                          setShowDatePicker(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                      >
                        Last 6 Months
                      </button>
                      <button
                        onClick={() => {
                          setDateRange("lastYear");
                          setShowDatePicker(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                      >
                        Last Year
                      </button>

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
                              onChange={(e) => setCustomEndDate(e.target.value)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
              {/* Total Sales Card */}
              <Card className="p-4 hover:shadow-md transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs font-medium text-gray-500">
                      Total Sales
                    </Text>
                    <div className="flex items-baseline mt-1">
                      <span className="text-lg sm:text-xl font-semibold text-gray-800">
                        ${dashboardStats.totalSales.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">USD</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-emerald-500 font-medium">
                        +14.5%
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        vs last period
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </Card>

              {/* Active Affiliates Card */}
              <Card className="p-4 hover:shadow-md transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs font-medium text-gray-500">
                      Active Affiliates
                    </Text>
                    <div className="flex items-baseline mt-1">
                      <span className="text-lg sm:text-xl font-semibold text-gray-800">
                        {dashboardStats.activeAffiliates}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {affiliates.length} total
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </Card>

              {/* Avg Commission Card */}
              <Card className="p-4 hover:shadow-md transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs font-medium text-gray-500">
                      Avg. Commission
                    </Text>
                    <div className="flex items-baseline mt-1">
                      <span className="text-lg sm:text-xl font-semibold text-gray-800">
                        ${dashboardStats.avgCommission.toFixed(2)}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">USD</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400">per quote</span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </Card>

              {/* Top Performer Card */}
              <Card className="p-4 hover:shadow-md transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs font-medium text-gray-500">
                      Top Performer
                    </Text>
                    <div className="flex items-baseline mt-1">
                      <span className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-[140px]">
                        {dashboardStats.topPerformer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400">
                        Highest sales volume
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </Card>

              {/* Helping Shelters Donations Card */}
              <Card className="p-4 hover:shadow-md transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs font-medium text-gray-500">
                      Helping Shelters
                    </Text>
                    <div className="flex items-baseline mt-1">
                      <span className="text-lg sm:text-xl font-semibold text-gray-800">
                        ${donationStats.totalDonations.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">USD</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {donationStats.totalVerifiedQuotes} verified quotes
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-purple-500 font-medium">
                        {donationStats.helpingSheltersInfluencers} influencers
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* CHART 4: Sales by Product Category */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <Card className="overflow-hidden rounded-xl border border-gray-100 shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <Title className="text-lg md:text-xl font-bold text-gray-800">
                      Quotes by Status
                    </Title>
                  </div>

                  <div className="h-80 sm:h-96 md:h-80 relative">
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-green-600"></div>
                      </div>
                    ) : quotesStatusDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={quotesStatusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {quotesStatusDistribution.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  getStatusColor(entry.name) ||
                                  getChartColors()[
                                    index % getChartColors().length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} quotes`, "Count"]}
                            contentStyle={{
                              backgroundColor: "white",
                              padding: "12px",
                              border: "none",
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            layout="horizontal"
                            iconType="circle"
                            iconSize={10}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        <BarChart3 className="w-16 h-16 text-green-200 mb-4" />
                        <p className="text-gray-500">
                          No quote status data available
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* CHART 5: Affiliate Performance Radar */}
                <Card className="overflow-hidden rounded-xl border border-gray-100 shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <Title className="text-lg md:text-xl font-bold text-gray-800">
                      Affiliate Performance
                    </Title>
                  </div>

                  <div className="h-80 sm:h-96 md:h-80 relative">
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
                      </div>
                    ) : conversionMetrics.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={90} data={conversionMetrics}>
                          <PolarGrid gridType="polygon" stroke="#e5e7eb" />
                          <PolarAngleAxis
                            dataKey="affiliate"
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Sales Volume"
                            dataKey="Sales Volume"
                            stroke="#4f46e5"
                            fill="#4f46e5"
                            fillOpacity={0.1}
                          />
                          <Radar
                            name="Conversion Rate"
                            dataKey="Conversion Rate"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.1}
                          />
                          <Radar
                            name="Avg Sale Value"
                            dataKey="Avg Sale Value"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.1}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              padding: "8px",
                              border: "none",
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Users className="w-16 h-16 text-purple-200 mb-4" />
                        <p className="text-gray-500">
                          No performance metrics available
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* CHART 1: Performance Overview Bar Chart */}
            <div className="mb-8">
              <Card className="hover:shadow-lg transition-all duration-300 overflow-visible rounded-xl border-none shadow-md bg-gradient-to-br from-white to-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <Title className="text-lg md:text-xl font-bold text-gray-800">
                    Performance Overview
                  </Title>

                  {/* Data Type Selector - simplified styling */}
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                    <button
                      onClick={() => setDataType("sales")}
                      className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                        dataType === "sales"
                          ? "bg-white text-indigo-700 shadow-sm font-medium"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Sales
                    </button>
                    <button
                      onClick={() => setDataType("quotes")}
                      className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                        dataType === "quotes"
                          ? "bg-white text-indigo-700 shadow-sm font-medium"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Quotes
                    </button>
                  </div>
                </div>

                {/* Visualization Options - simplified styling */}
                <div className="flex justify-end mb-6">
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                    <button
                      onClick={() => setChartView("monthly")}
                      className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                        chartView === "monthly"
                          ? "bg-white text-indigo-700 shadow-sm font-medium"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setChartView("weekly")}
                      className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                        chartView === "weekly"
                          ? "bg-white text-indigo-700 shadow-sm font-medium"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="h-80 sm:h-96 md:h-80 relative">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.2}
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis
                          width={70}
                          tickFormatter={(value) =>
                            `$${value.toLocaleString()}`
                          }
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                          formatter={(value) => [
                            `$${value.toLocaleString()}`,
                            dataType === "sales"
                              ? "Sales Amount"
                              : "Quote Value",
                          ]}
                          cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "15px",
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          name={
                            dataType === "sales"
                              ? "Sales Amount"
                              : "Quote Value"
                          }
                          fill={getChartColors("performance")[0]}
                          radius={[4, 4, 0, 0]}
                          animationDuration={850}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        No {dataType} data available for the selected period
                      </p>
                      <button
                        onClick={() => setDateRange("thisYear")}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View all-time data
                      </button>
                    </div>
                  )}
                </div>

                {/* Summary Statistics */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                      <Text className="text-xs text-indigo-700">
                        Total {dataType}
                      </Text>
                      <div className="text-lg font-semibold text-gray-800">
                        {totalCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <Text className="text-xs text-purple-700">
                        Total Value
                      </Text>
                      <div className="text-lg font-semibold text-gray-800">
                        ${totalValue.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-4 rounded-lg">
                      <Text className="text-xs text-violet-700">
                        Average Value
                      </Text>
                      <div className="text-lg font-semibold text-gray-800">
                        ${averageValue.toFixed(2).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* CHART 2: Top Affiliate Performance */}
            <div className="mb-8">
              <Card className="hover:shadow-xl transition-all duration-300 rounded-xl border-none shadow-lg bg-gradient-to-br from-white via-white to-rose-50 overflow-visible">
                <div className="flex justify-between items-center mb-6">
                  <Title className="text-lg md:text-xl font-bold text-gray-800">
                    Top Affiliate Performance
                  </Title>
                </div>

                {/* Top Affiliates Bar Chart */}
                <div className="h-80 sm:h-96 md:h-80 relative">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
                    </div>
                  ) : affiliateComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={affiliateComparisonData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={true}
                          vertical={false}
                          opacity={0.2}
                        />
                        <XAxis
                          type="number"
                          tickFormatter={(value) =>
                            `$${value.toLocaleString()}`
                          }
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            padding: "12px",
                            border: "1px solid #fecdd3",
                            borderRadius: "8px",
                            boxShadow:
                              "0 10px 25px -5px rgba(244, 63, 94, 0.1)",
                          }}
                          formatter={(value) => [
                            `$${value.toLocaleString()}`,
                            "Sales",
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          name="Sales Amount"
                          animationDuration={1000}
                          onClick={(data) => {
                            const affiliate = affiliates.find(
                              (a) => a.name === data.name
                            );
                            if (affiliate) {
                              setSelectedAffiliate(affiliate);
                              setShowAffiliateDetails(true);
                            }
                          }}
                          cursor="pointer"
                        >
                          {affiliateComparisonData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getAffiliateColor(index)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <BarChart3 className="w-16 h-16 text-rose-200 animate-pulse" />
                      <p className="text-rose-700 mt-4 font-medium">
                        No affiliate performance data
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                {affiliateComparisonData.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-rose-100">
                    <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg transform transition-all duration-300 hover:shadow-lg">
                      <Text className="text-xs text-rose-700">
                        Top Performer
                      </Text>
                      <div className="text-lg font-semibold text-gray-800 truncate">
                        {affiliateComparisonData[0]?.name || "-"}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg transform transition-all duration-300 hover:shadow-lg">
                      <Text className="text-xs text-blue-700">
                        Total Sales Value
                      </Text>
                      <div className="text-lg font-semibold text-gray-800">
                        $
                        {affiliateComparisonData
                          .reduce((acc, item) => acc + item.value, 0)
                          .toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mt-4 text-sm text-gray-500">
                  Click on any bar to view affiliate details
                </div>
              </Card>
            </div>

            {/* CHART 3: Sales Growth Trend */}
            <div className="mb-8">
              <Card className="overflow-hidden rounded-xl border border-gray-100 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <Title className="text-lg md:text-xl font-bold text-gray-800">
                    Sales Growth Trend
                  </Title>
                </div>

                <div className="h-80 sm:h-96 md:h-80 relative">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  ) : salesTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={salesTrend}
                        margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorMonthly"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorCumulative"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8b5cf6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={(value) => `$${value / 1000}k`}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => `$${value / 1000}k`}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            padding: "12px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`]}
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="monthlyTotal"
                          name="Monthly Sales"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#colorMonthly)"
                          dot={{ r: 3, strokeWidth: 2 }}
                          activeDot={{ r: 5, strokeWidth: 0, fill: "#1d4ed8" }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumulativeTotal"
                          name="Cumulative Sales"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#8b5cf6" }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <TrendingUp className="w-16 h-16 text-blue-200 mb-4" />
                      <p className="text-gray-500">
                        No sales trend data available
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* CHART 6: Sales by Time of Day */}
            <div className="mb-8">
              <Card className="overflow-hidden rounded-xl border border-gray-100 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <Title className="text-lg md:text-xl font-bold text-gray-800">
                    Sales Distribution by Time of Day
                  </Title>
                </div>

                <div className="h-64 sm:h-72 md:h-80 relative">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                    </div>
                  ) : salesByTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={120} data={salesByTimeData}>
                        <PolarGrid gridType="circle" stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="timeSlot"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          tick={{ fill: "#6b7280", fontSize: 10 }}
                          axisLine={false}
                        />
                        {[
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                        ].map((day, index) => (
                          <Radar
                            key={day}
                            name={day}
                            dataKey={day}
                            stroke={
                              getChartColors()[index % getChartColors().length]
                            }
                            fill={
                              getChartColors()[index % getChartColors().length]
                            }
                            fillOpacity={0.15}
                          />
                        ))}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            padding: "8px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => [`${value} sales`]}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Calendar className="w-16 h-16 text-amber-200 mb-4" />
                      <p className="text-gray-500">
                        No time-based sales data available
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center mt-4 text-xs text-gray-500">
                  This chart shows when your customers typically make purchases
                </div>
              </Card>
            </div>
          </>
        );
      case "affiliates":
        return (
          <AffiliatesList
            ref={affiliatesListRef}
            openDetailsModal={(affiliate) => {
              setSelectedAffiliate(affiliate);
              setShowAffiliateDetails(true);
            }}
            sales={sales}
          />
        );
      case "quotes":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <Title className="text-2xl font-bold text-gray-900">
                  Quote Management
                </Title>
                <Text className="text-gray-600 mt-1">
                  Review and manage all quotes from affiliates
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                  <div className="flex items-center space-x-2 text-sm justify-between sm:justify-start">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {quotes.length}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">Filtered:</span>
                    <span className="font-semibold text-gray-900">
                      {filteredQuotes.length}
                    </span>
                  </div>
                </div>
                <div className="relative export-dropdown w-full sm:w-auto">
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    disabled={quotes.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </button>
                  {showExportOptions && (
                    <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleExportQuotes(false);
                            setShowExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export Filtered ({filteredQuotes.length})
                        </button>
                        <button
                          onClick={() => {
                            handleExportQuotes(true);
                            setShowExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export All ({quotes.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search quotes..."
                      value={quotesSearchTerm}
                      onChange={(e) => setQuotesSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() => setShowQuotesFilters(!showQuotesFilters)}
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Status:{" "}
                      {quotesStatusFilter === "all"
                        ? "All"
                        : quotesStatusFilter}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    {showQuotesFilters && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {[
                            "all",
                            "pending",
                            "in review",
                            "approved",
                            "rejected",
                            "no_marketing",
                          ].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setQuotesStatusFilter(status);
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                quotesStatusFilter === status
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {status === "all"
                                ? "All Statuses"
                                : status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative quotes-sort-dropdown w-full sm:w-auto">
                    <button
                      onClick={() => setShowQuotesSort(!showQuotesSort)}
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort: {quotesSortBy === "createdAt" && "Date Created"}
                      {quotesSortBy === "updatedAt" && "Date Updated"}
                      {quotesSortBy === "petName" && "Pet Name"}
                      {quotesSortBy === "affiliate" && "Affiliate"}
                      {quotesSortBy === "status" && "Status"}
                      {quotesSortBy === "quoteValue" && "Quote Value"} (
                      {quotesSortOrder === "desc" ? "Newest" : "Oldest"})
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    {showQuotesSort && (
                      <div className="absolute right-0 z-10 mt-2 w-56 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-500 px-3 py-1 mb-1">
                            Sort By
                          </div>
                          {[
                            { value: "createdAt", label: "Date Created" },
                            { value: "updatedAt", label: "Date Updated" },
                            { value: "petName", label: "Pet Name" },
                            { value: "affiliate", label: "Affiliate" },
                            { value: "status", label: "Status" },
                            { value: "quoteValue", label: "Quote Value" },
                          ].map((sortOption) => (
                            <button
                              key={sortOption.value}
                              onClick={() => {
                                setQuotesSortBy(sortOption.value);
                                setShowQuotesSort(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                quotesSortBy === sortOption.value
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {sortOption.label}
                            </button>
                          ))}
                          <div className="border-t mt-2 pt-2">
                            <div className="text-xs font-medium text-gray-500 px-3 py-1 mb-1">
                              Order
                            </div>
                            <button
                              onClick={() => {
                                setQuotesSortOrder("desc");
                                setShowQuotesSort(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                quotesSortOrder === "desc"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              Newest First
                            </button>
                            <button
                              onClick={() => {
                                setQuotesSortOrder("asc");
                                setShowQuotesSort(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                quotesSortOrder === "asc"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              Oldest First
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Bulk Actions for Quotes */}
                  {selectedQuotes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedQuotes.length} selected
                      </span>
                      <div className="relative bulk-quote-actions">
                        <button
                          onClick={() =>
                            setShowBulkQuoteActions(!showBulkQuoteActions)
                          }
                          className="flex items-center cursor-pointer px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Bulk Actions
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {showBulkQuoteActions && (
                          <div className="absolute right-0 z-10 mt-2 w-40 bg-white rounded-lg shadow-lg border">
                            <div className="p-2">
                              <button
                                onClick={() => handleBulkQuoteAction("approve")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-green-600"
                              >
                                Approve All
                              </button>
                              <button
                                onClick={() => handleBulkQuoteAction("reject")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-red-600"
                              >
                                Reject All
                              </button>
                              <button
                                onClick={() => handleBulkQuoteAction("delete")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-red-600"
                              >
                                Delete All
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                      <span>
                        Pending:{" "}
                        {quotes.filter((q) => q.status === "pending").length}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                      <span>
                        Approved:{" "}
                        {quotes.filter((q) => q.status === "approved").length}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                      <span>
                        Rejected:{" "}
                        {quotes.filter((q) => q.status === "rejected").length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {loading || quotesLoading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Loading quotes...</p>
                  </div>
                ) : filteredQuotes.length > 0 ? (
                  <div className="h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="min-w-[900px] divide-y divide-gray-200 text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={areAllQuotesSelected}
                              onChange={(e) =>
                                handleSelectAllQuotes(e.target.checked)
                              }
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => {
                                if (quotesSortBy === "createdAt") {
                                  setQuotesSortOrder(
                                    quotesSortOrder === "desc" ? "asc" : "desc"
                                  );
                                } else {
                                  setQuotesSortBy("createdAt");
                                  setQuotesSortOrder("desc");
                                }
                              }}
                              className="flex items-center hover:text-indigo-600 transition-colors"
                            >
                              Date
                              {quotesSortBy === "createdAt" && (
                                <ArrowUpDown className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => {
                                if (quotesSortBy === "affiliate") {
                                  setQuotesSortOrder(
                                    quotesSortOrder === "desc" ? "asc" : "desc"
                                  );
                                } else {
                                  setQuotesSortBy("affiliate");
                                  setQuotesSortOrder("desc");
                                }
                              }}
                              className="flex items-center hover:text-indigo-600 transition-colors"
                            >
                              Affiliate
                              {quotesSortBy === "affiliate" && (
                                <ArrowUpDown className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => {
                                if (quotesSortBy === "petName") {
                                  setQuotesSortOrder(
                                    quotesSortOrder === "desc" ? "asc" : "desc"
                                  );
                                } else {
                                  setQuotesSortBy("petName");
                                  setQuotesSortOrder("desc");
                                }
                              }}
                              className="flex items-center hover:text-indigo-600 transition-colors"
                            >
                              Pet Info
                              {quotesSortBy === "petName" && (
                                <ArrowUpDown className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quote URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => {
                                if (quotesSortBy === "status") {
                                  setQuotesSortOrder(
                                    quotesSortOrder === "desc" ? "asc" : "desc"
                                  );
                                } else {
                                  setQuotesSortBy("status");
                                  setQuotesSortOrder("desc");
                                }
                              }}
                              className="flex items-center hover:text-indigo-600 transition-colors"
                            >
                              Status
                              {quotesSortBy === "status" && (
                                <ArrowUpDown className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 h-[500px] overflow-y-auto">
                        {filteredQuotes.map((quote) => {
                          const affiliate = affiliates.find(
                            (a) => a.id === quote.affiliateId
                          );
                          return (
                            <tr key={quote.id} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedQuotes.includes(quote.id)}
                                  onChange={(e) =>
                                    handleQuoteSelection(
                                      quote.id,
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {format(
                                  new Date(quote.createdAt),
                                  "MMM dd, yyyy"
                                )}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {affiliate?.name || "Unknown"}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {quote.petOwnerFirstName}{" "}
                                    {quote.petOwnerLastName}
                                  </div>
                                  <div className="text-gray-500">
                                    {quote.email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {quote.petName}
                                  </div>
                                  <div className="text-gray-500">
                                    {quote.petBreed}, {quote.petAge} years
                                    {quote.petType && ` • ${quote.petType}`}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div>{quote.phone}</div>
                                  <div className="text-gray-500 text-xs">
                                    {quote.address}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {quote.quote_url ? (
                                  <a
                                    href={quote.quote_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Quote
                                  </a>
                                ) : (
                                  <span className="text-gray-500">N/A</span>
                                )}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                $
                                {(() => {
                                  const affiliate = affiliates.find(
                                    (aff) => aff.id === quote.affiliateId
                                  );
                                  return parseFloat(affiliate?.basePrice) || 0;
                                })()}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                                <span
                                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                    quote.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : quote.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : quote.status === "in review"
                                      ? "bg-blue-100 text-blue-800"
                                      : quote.status === "no_marketing"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {quote.status}
                                </span>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  {quote.status !== "approved" && (
                                    <button
                                      onClick={() =>
                                        handleApproveQuote(quote.id)
                                      }
                                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                      disabled={quotesLoading}
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteQuote(quote.id)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    disabled={quotesLoading}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No quotes found</p>
                    {quotesSearchTerm || quotesStatusFilter !== "all" ? (
                      <p className="text-gray-400 text-sm mt-2">
                        Try adjusting your search or filter criteria
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      case "dogtags":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <Title className="text-2xl font-bold text-gray-900">
                  Dog Tags Management
                </Title>
                <Text className="text-gray-600 mt-1">
                  Manage all dog tags and pet insurance tags from affiliates
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                  <div className="flex items-center space-x-2 text-sm justify-between sm:justify-start">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {dogTags.length}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">Filtered:</span>
                    <span className="font-semibold text-gray-900">
                      {filteredDogTags.length}
                    </span>
                  </div>
                </div>
                <div className="relative dog-tags-export-dropdown w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setShowDogTagsExportOptions(!showDogTagsExportOptions)
                    }
                    disabled={dogTags.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </button>
                  {showDogTagsExportOptions && (
                    <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleExportDogTags(false);
                            setShowDogTagsExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export Filtered ({filteredDogTags.length})
                        </button>
                        <button
                          onClick={() => {
                            handleExportDogTags(true);
                            setShowDogTagsExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export All ({dogTags.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search dog tags..."
                      value={dogTagsSearchTerm}
                      onChange={(e) => setDogTagsSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() => setShowDogTagsFilters(!showDogTagsFilters)}
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter:{" "}
                      {dogTagsStatusFilter === "all"
                        ? "All"
                        : dogTagsStatusFilter === "donation"
                        ? "Donations"
                        : dogTagsStatusFilter === "no_donation"
                        ? "No Donations"
                        : dogTagsStatusFilter.charAt(0).toUpperCase() +
                          dogTagsStatusFilter.slice(1)}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    {showDogTagsFilters && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {[
                            "all",
                            "donation",
                            "no_donation",
                            "bone",
                            "heart",
                            "circle",
                          ].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setDogTagsStatusFilter(status);
                                setShowDogTagsFilters(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                dogTagsStatusFilter === status
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {status === "all"
                                ? "All Tags"
                                : status === "donation"
                                ? "Donations Only"
                                : status === "no_donation"
                                ? "No Donations"
                                : status.charAt(0).toUpperCase() +
                                  status.slice(1) +
                                  " Tags"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative dog-tags-ordered-filter w-auto">
                    <button
                      onClick={() => setShowDogTagsOrderedFilter(!showDogTagsOrderedFilter)}
                      className="flex cursor-pointer items-center px-4 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50 w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Order Status:{" "}
                      {dogTagsOrderedFilter === "all"
                        ? "All"
                        : dogTagsOrderedFilter === "ordered"
                        ? "Ordered"
                        : "Not Ordered"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    {showDogTagsOrderedFilter && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {[
                            "all",
                            "ordered",
                            "not_ordered",
                          ].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setDogTagsOrderedFilter(status);
                                setShowDogTagsOrderedFilter(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                dogTagsOrderedFilter === status
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {status === "all"
                                ? "All Orders"
                                : status === "ordered"
                                ? "Ordered Only"
                                : "Not Ordered"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Bulk Actions for Dog Tags */}
                  {selectedDogTags.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedDogTags.length} selected
                      </span>
                      <div className="relative bulk-dog-tag-actions">
                        <button
                          onClick={() =>
                            setShowBulkDogTagActions(!showBulkDogTagActions)
                          }
                          className="flex cursor-pointer items-center p-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Bulk Actions
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {showBulkDogTagActions && (
                          <div className="absolute right-0 z-10 mt-2 w-40 bg-white rounded-lg shadow-lg border">
                            <div className="p-2">
                              <button
                                onClick={() => handleBulkDogTagAction("markAsOrdered")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-green-600"
                              >
                                Mark as Ordered
                              </button>
                              <button
                                onClick={() => handleBulkDogTagAction("markAsNotOrdered")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-yellow-600"
                              >
                                Mark as Not Ordered
                              </button>
                              <button
                                onClick={() => handleBulkDogTagAction("delete")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-red-600"
                              >
                                Delete Selected
                              </button>
                              <button
                                onClick={() =>
                                  handleBulkDogTagAction("exportByAffiliate")
                                }
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-blue-600"
                              >
                                Export by Affiliate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                      <span>
                        Donations:{" "}
                        {
                          dogTags.filter(
                            (t) => t.tag_details?.donation === true
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                      <span>
                        Circle Tags:{" "}
                        {
                          dogTags.filter(
                            (t) => t.tag_details?.type === "circle"
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                      <span>
                        Heart Tags:{" "}
                        {
                          dogTags.filter((t) => t.tag_details?.type === "heart")
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
                      <span>
                        Bone Tags:{" "}
                        {
                          dogTags.filter((t) => t.tag_details?.type === "bone")
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                      <span>
                        Other Types:{" "}
                        {
                          dogTags.filter(
                            (t) =>
                              !["circle", "heart", "bone"].includes(
                                t.tag_details?.type
                              )
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                      <span>
                        Ordered:{" "}
                        {dogTags.filter((t) => t.ordered === true).length}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      <span>
                        Not Ordered:{" "}
                        {dogTags.filter((t) => t.ordered !== true).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {loading || dogTagsLoading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Loading dog tags...</p>
                  </div>
                ) : filteredDogTags.length > 0 ? (
                  <div className="h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="min-w-[900px] divide-y divide-gray-200 text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={areAllDogTagsSelected}
                              ref={(input) => {
                                if (input) {
                                  input.indeterminate = someDogTagsSelected;
                                }
                              }}
                              onChange={(e) =>
                                handleSelectAllDogTags(e.target.checked)
                              }
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Affiliate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pet Info
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                            Tag Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ordered
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDogTags.map((tag) => {
                          const affiliate = affiliates.find(
                            (a) => a.id === tag.affiliateId
                          );
                          const tagDetails = tag.tag_details || {};
                          const tagInfo = tagDetails.tag_info || {};
                          console.log(tag);
                          return (
                            <tr
                              key={tag.timestamp}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedDogTags.includes(
                                    tag.timestamp
                                  )}
                                  onChange={(e) =>
                                    handleDogTagSelection(
                                      tag.timestamp,
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {affiliate?.name || "Unknown"}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {tagDetails.pet_name || "N/A"}
                                  </div>
                                  {tagDetails.pet_type && (
                                    <div className="text-gray-500 text-xs">
                                      {tagDetails.pet_type}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {tagDetails.owner_name || "N/A"}
                                  </div>
                                  <div className="text-gray-500">
                                    {tagDetails.address || "N/A"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {tagDetails.email || tag.email || "N/A"}
                                  </div>
                                  <div className="text-gray-500">
                                    {tagDetails.phone_number || "N/A"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        tagDetails.donation
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {tagDetails.donation
                                        ? "Donation"
                                        : "No Donation"}
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        tagDetails.type === "circle"
                                          ? "bg-blue-100 text-blue-800"
                                          : tagDetails.type === "heart"
                                          ? "bg-red-100 text-red-800"
                                          : tagDetails.type === "bone"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {tagDetails.type || "N/A"}
                                    </span>
                                  </div>

                                  {/* Tag Position Info Section */}
                                  {Object.keys(tagInfo).length > 0 && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <div className="grid grid-cols-1 gap-2 text-xs">
                                        {tagInfo.address && (
                                          <div>
                                            <span className="text-gray-500">
                                              Address:
                                            </span>
                                            <span className="ml-1 font-medium">
                                              {tagInfo.address}
                                            </span>
                                          </div>
                                        )}
                                        {tagInfo.ownerName && (
                                          <div>
                                            <span className="text-gray-500">
                                              Owner:
                                            </span>
                                            <span className="ml-1 font-medium">
                                              {tagInfo.ownerName}
                                            </span>
                                          </div>
                                        )}
                                        {tagInfo.phone && (
                                          <div>
                                            <span className="text-gray-500">
                                              Phone:
                                            </span>
                                            <span className="ml-1 font-medium">
                                              {tagInfo.phone}
                                            </span>
                                          </div>
                                        )}
                                        {tagInfo.email && (
                                          <div>
                                            <span className="text-gray-500">
                                              Email:
                                            </span>
                                            <span className="ml-1 font-medium">
                                              {tagInfo.email}
                                            </span>
                                          </div>
                                        )}
                                        {tagDetails.color && (
                                          <div>
                                            <span className="text-gray-500">
                                              Color:
                                            </span>
                                            <span className="ml-1 font-medium">
                                              {tagDetails.color}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={tag.ordered === true}
                                    onChange={(e) => handleMarkDogTagAsOrdered(tag.timestamp, e.target.checked)}
                                    disabled={dogTagsLoading}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  {tag.orderedAt && (
                                    <span className="text-xs text-gray-500">
                                      {format(new Date(tag.orderedAt), "MMM dd")}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {format(
                                  new Date(parseInt(tag.timestamp)),
                                  "MMM dd, yyyy"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No dog tags found</p>
                    {dogTagsSearchTerm || dogTagsStatusFilter !== "all" ? (
                      <p className="text-gray-400 text-sm mt-2">
                        Try adjusting your search or filter criteria
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      case "checkout-events":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <Title className="text-2xl font-bold text-gray-900">
                  Checkout Events
                </Title>
                <Text className="text-gray-600 mt-1">
                  Monitor and manage checkout events from affiliates
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                  <div className="flex items-center space-x-2 text-sm justify-between sm:justify-start">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {checkoutEvents.length}
                    </span>
                    {checkoutEventsSearchTerm && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">Filtered:</span>
                        <span className="font-semibold text-gray-900">
                          {filteredCheckoutEvents.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="relative checkout-events-export-dropdown w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setShowCheckoutEventsExportOptions(
                        !showCheckoutEventsExportOptions
                      )
                    }
                    disabled={checkoutEvents.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </button>
                  {showCheckoutEventsExportOptions && (
                    <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleExportCheckoutEvents(true);
                            setShowCheckoutEventsExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export All ({checkoutEvents.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search checkout events..."
                      value={checkoutEventsSearchTerm}
                      onChange={(e) =>
                        setCheckoutEventsSearchTerm(e.target.value)
                      }
                      className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() =>
                        setShowCheckoutEventsFilters(!showCheckoutEventsFilters)
                      }
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">
                          {checkoutEventsAffiliateFilter === "all"
                            ? `All Affiliates (${affiliates.length})`
                            : affiliates.find(
                                (a) => a.id === checkoutEventsAffiliateFilter
                              )?.name || "Unknown"}
                        </div>
                        {checkoutEventsAffiliateFilter !== "all" && (
                          <div className="text-xs text-gray-500">
                            {affiliates.find(
                              (a) => a.id === checkoutEventsAffiliateFilter
                            )?.email || ""}
                          </div>
                        )}
                      </div>{" "}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>

                    {showCheckoutEventsFilters && (
                      <div className="absolute right-0 z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border max-h-80 overflow-y-auto">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setCheckoutEventsAffiliateFilter("all");
                              fetchCheckoutEvents("all");
                              setShowCheckoutEventsFilters(false);
                            }}
                            className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                              checkoutEventsAffiliateFilter === "all"
                                ? "bg-indigo-50 text-indigo-700"
                                : ""
                            }`}
                          >
                            All Affiliates ({affiliates.length})
                          </button>
                          <div className="border-t my-2"></div>
                          {affiliates.map((affiliate) => (
                            <button
                              key={affiliate.id}
                              onClick={() => {
                                setCheckoutEventsAffiliateFilter(affiliate.id);
                                // Try to fetch by affiliate ID first, then by name if needed
                                fetchCheckoutEvents(affiliate.id);
                                setShowCheckoutEventsFilters(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                checkoutEventsAffiliateFilter === affiliate.id
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              <div className="truncate">{affiliate.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {affiliate.email}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                ID: {affiliate.id}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {checkoutEventsDateRange === "custom"
                        ? `${format(
                            new Date(customStartDate),
                            "MMM dd"
                          )} - ${format(new Date(customEndDate), "MMM dd")}`
                        : checkoutEventsDateRange
                            .replace(/([A-Z])/g, " $1")
                            .toLowerCase()}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>

                    {showDatePicker && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {[
                            "last7Days",
                            "last30Days",
                            "last3Months",
                            "thisMonth",
                            "thisYear",
                          ].map((range) => (
                            <button
                              key={range}
                              onClick={() => {
                                setCheckoutEventsDateRange(range);
                                setShowDatePicker(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                checkoutEventsDateRange === range
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {range.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bulk Actions for Checkout Events */}
                  {selectedCheckoutEvents.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedCheckoutEvents.length} selected
                      </span>
                      <div className="relative bulk-checkout-event-actions">
                        <button
                          onClick={() =>
                            setShowBulkCheckoutEventActions(
                              !showBulkCheckoutEventActions
                            )
                          }
                          className="flex items-center cursor-pointer px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Bulk Actions
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {showBulkCheckoutEventActions && (
                          <div className="absolute right-0 z-10 mt-2 w-40 bg-white rounded-lg shadow-lg border">
                            <div className="p-2">
                              <button
                                onClick={() =>
                                  handleBulkCheckoutEventAction("delete")
                                }
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-red-600"
                              >
                                Delete Selected
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {loading || checkoutEventsLoading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">
                      Loading checkout events...
                    </p>
                  </div>
                ) : (checkoutEventsSearchTerm
                    ? filteredCheckoutEvents
                    : checkoutEvents
                  ).length > 0 ? (
                  <div className="h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="min-w-[1000px] divide-y divide-gray-200 text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={
                                selectedCheckoutEvents.length ===
                                  filteredCheckoutEvents.length &&
                                filteredCheckoutEvents.length > 0
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCheckoutEvents(
                                    filteredCheckoutEvents.map(
                                      (event) =>
                                        `${event.affiliateId}|${event.timestamp}`
                                    )
                                  );
                                } else {
                                  setSelectedCheckoutEvents([]);
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Affiliate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Page URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Checkout URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(checkoutEventsSearchTerm
                          ? filteredCheckoutEvents
                          : checkoutEvents
                        ).map((event) => {
                          const eventKey = `${event.affiliateId}|${event.timestamp}`;

                          return (
                            <tr key={eventKey} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedCheckoutEvents.includes(
                                    eventKey
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCheckoutEvents((prev) => [
                                        ...prev,
                                        eventKey,
                                      ]);
                                    } else {
                                      setSelectedCheckoutEvents((prev) =>
                                        prev.filter((k) => k !== eventKey)
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {format(
                                  new Date(event.timestamp),
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    {event.affiliateName ||
                                      affiliates.find(
                                        (a) => a.id === event.affiliateId
                                      )?.name ||
                                      "Unknown"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {event.affiliateId}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {affiliates.find(
                                      (a) => a.id === event.affiliateId
                                    )?.email ||
                                      affiliates.find(
                                        (a) => a.name === event.affiliateName
                                      )?.email ||
                                      "No email found"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <a
                                  href={event.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                  title={event.pageUrl || "N/A"}
                                >
                                  {truncateUrl(event.pageUrl) || "N/A"}
                                </a>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {event.checkoutUrl ? (
                                  <a
                                    href={event.checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                    title={event.checkoutUrl}
                                  >
                                    {truncateUrl(event.checkoutUrl)}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div className="space-y-1">
                                  <div>
                                    <span className="text-gray-500">User:</span>
                                    <span className="ml-1 font-medium">
                                      {event.userEmail}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Pet:</span>
                                    <span className="ml-1 font-medium">
                                      {event.petName} ({event.petSpecies},{" "}
                                      {event.petAge} years)
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Plan:</span>
                                    <span className="ml-1 font-medium">
                                      ${event.monthlyPayment}/month, $
                                      {event.deductible} deductible,{" "}
                                      {event.reimbursement}% reimbursement
                                    </span>
                                  </div>
                                  {event.eventCategory && (
                                    <div>
                                      <span className="text-gray-500">
                                        Category:
                                      </span>
                                      <span className="ml-1 font-medium">
                                        {event.eventCategory}
                                      </span>
                                    </div>
                                  )}
                                  {event.eventAction && (
                                    <div>
                                      <span className="text-gray-500">
                                        Action:
                                      </span>
                                      <span className="ml-1 font-medium">
                                        {event.eventAction}
                                      </span>
                                    </div>
                                  )}
                                  {event.eventLabel && (
                                    <div>
                                      <span className="text-gray-500">
                                        Label:
                                      </span>
                                      <span className="ml-1 font-medium">
                                        {event.eventLabel}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">
                                    ${event.value}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Monthly payment
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                                <button
                                  onClick={() =>
                                    handleDeleteCheckoutEvent(event)
                                  }
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  disabled={checkoutEventsLoading}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <p className="text-gray-500 text-lg mb-2">
                      {checkoutEventsSearchTerm
                        ? "No checkout events match your search"
                        : "No checkout events found"}
                    </p>
                    {checkoutEventsSearchTerm ? (
                      <p className="text-gray-400 text-sm">
                        Try adjusting your search criteria or clear the search
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        {checkoutEventsAffiliateFilter === "all"
                          ? "No checkout events have been generated by any affiliates yet"
                          : "This affiliate hasn't generated any checkout events yet"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      case "trash":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <Title className="text-2xl font-bold text-gray-900">
                  Trash Management
                </Title>
                <Text className="text-gray-600 mt-1">
                  Restore or permanently delete trashed items
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                  <div className="flex items-center space-x-2 text-sm justify-between sm:justify-start">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {deletedQuotes.length + deletedDogTags.length}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">Filtered:</span>
                    <span className="font-semibold text-gray-900">
                      {filteredTrashItems.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search trash..."
                      value={trashSearchTerm}
                      onChange={(e) => setTrashSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() => setShowTrashFilters(!showTrashFilters)}
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                        Type:{" "}
                        {trashFilter === "all"
                          ? "All"
                          : trashFilter === "quote"
                        ? "Quotes"
                        : "Dog Tags"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>

                    {showTrashFilters && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {["all", "quote", "dogTag"].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => {
                                setTrashFilter(filter);
                                setShowTrashFilters(false);
                              }}
                              className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                trashFilter === filter
                                  ? "bg-indigo-50 text-indigo-700"
                                  : ""
                              }`}
                            >
                              {filter === "all"
                                ? "All Items"
                                : filter === "quote"
                                ? "Quotes"
                                : "Dog Tags"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bulk Actions for Trash */}
                  {selectedTrashItems.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedTrashItems.length} selected
                      </span>
                      <div className="relative bulk-trash-actions">
                        <button
                          onClick={() =>
                            setShowBulkTrashActions(!showBulkTrashActions)
                          }
                          className="flex items-center cursor-pointer px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Bulk Actions
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {showBulkTrashActions && (
                          <div className="absolute right-0 z-10 mt-2 w-40 bg-white rounded-lg shadow-lg border">
                            <div className="p-2">
                              <button
                                onClick={() => handleBulkTrashAction("restore")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-green-600"
                              >
                                Restore All
                              </button>
                              <button
                                onClick={() =>
                                  handleBulkTrashAction("permanentDelete")
                                }
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-red-600"
                              >
                                Delete Permanently
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                      <span>Quotes: {deletedQuotes.length}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                      <span>Dog Tags: {deletedDogTags.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {loading || trashLoading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Loading trash...</p>
                  </div>
                ) : filteredTrashItems.length > 0 ? (
                  <div className="h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="min-w-[800px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={
                                selectedTrashItems.length ===
                                  filteredTrashItems.length &&
                                filteredTrashItems.length > 0
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTrashItems(
                                    filteredTrashItems.map((item) =>
                                      item.type === "quote"
                                        ? `quote-${item.id}`
                                        : `tag-${item.affiliateId}|${item.timestamp}`
                                    )
                                  );
                                } else {
                                  setSelectedTrashItems([]);
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deleted At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTrashItems.map((item) => {
                          const itemId =
                            item.type === "quote"
                              ? `quote-${item.id}`
                              : `tag-${item.affiliateId}|${item.timestamp}`;
                          const affiliate = affiliates.find(
                            (a) => a.id === item.affiliateId
                          );

                          return (
                            <tr key={itemId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedTrashItems.includes(itemId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTrashItems((prev) => [
                                        ...prev,
                                        itemId,
                                      ]);
                                    } else {
                                      setSelectedTrashItems((prev) =>
                                        prev.filter((id) => id !== itemId)
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                    item.type === "quote"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {item.type === "quote" ? "Quote" : "Dog Tag"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {item.type === "quote" ? (
                                  <div>
                                    <div className="font-medium">
                                      {item.petOwnerFirstName}{" "}
                                      {item.petOwnerLastName}
                                    </div>
                                    <div className="text-gray-500">
                                      {item.email} | Pet: {item.petName}
                                      {item.petType && ` (${item.petType})`}
                                    </div>
                                    <div className="text-gray-500">
                                      Affiliate: {affiliate?.name || "Unknown"}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium">
                                      {item.tag_details?.pet_name || "N/A"}
                                    </div>
                                    <div className="text-gray-500">
                                      Owner:{" "}
                                      {item.tag_details?.owner_name || "N/A"}
                                    </div>
                                    <div className="text-gray-500">
                                      Affiliate: {affiliate?.name || "Unknown"}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {format(
                                  new Date(item.deletedAt),
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() =>
                                      handleRestoreItem(
                                        item,
                                        item.type === "quote"
                                          ? "quote"
                                          : "dogTag"
                                      )
                                    }
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={trashLoading}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Restore
                                  </button>
                                  <button
                                    onClick={() =>
                                      handlePermanentDelete(
                                        item,
                                        item.type === "quote"
                                          ? "quote"
                                          : "dogTag"
                                      )
                                    }
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    disabled={trashLoading}
                                  >
                                    <XIcon className="w-3 h-3 mr-1" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No items in trash</p>
                    {trashSearchTerm || trashFilter !== "all" ? (
                      <p className="text-gray-400 text-sm mt-2">
                        Try adjusting your search or filter criteria
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      case "spam-quotes":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <Title className="text-2xl font-bold text-gray-900">
                  Spam Quotes Management
                </Title>
                <Text className="text-gray-600 mt-1">
                  Review and manage all red-flagged spam quotes
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                  <div className="flex items-center space-x-2 text-sm justify-between sm:justify-start">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {spamQuotes.length}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">Filtered:</span>
                    <span className="font-semibold text-gray-900">
                      {filteredSpamQuotes.length}
                    </span>
                  </div>
                </div>
                <div className="relative export-dropdown w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setShowSpamQuotesExportOptions(
                        !showSpamQuotesExportOptions
                      )
                    }
                    disabled={spamQuotes.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </button>
                  {showSpamQuotesExportOptions && (
                    <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleExportSpamQuotes(false);
                            setShowSpamQuotesExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export Filtered ({filteredSpamQuotes.length})
                        </button>
                        <button
                          onClick={() => {
                            handleExportSpamQuotes(true);
                            setShowSpamQuotesExportOptions(false);
                          }}
                          className="w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100"
                        >
                          Export All ({spamQuotes.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-0 w-full">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search spam quotes..."
                      value={spamQuotesSearchTerm}
                      onChange={(e) => setSpamQuotesSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() =>
                        setShowSpamQuotesFilters(!showSpamQuotesFilters)
                      }
                      className="flex cursor-pointer items-center px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Reason:{" "}
                      {spamQuotesReasonFilter === "all"
                        ? "All"
                        : spamQuotesReasonFilter}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    {showSpamQuotesFilters && (
                      <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                        <div className="p-2">
                          {(() => {
                            // Get unique reasons from the actual data
                            const uniqueReasons = [
                              ...new Set(
                                spamQuotes
                                  .map((quote) => quote.reason)
                                  .filter(Boolean)
                              ),
                            ];
                            const allReasons = ["all", ...uniqueReasons];

                            return allReasons.map((reason) => (
                              <button
                                key={reason}
                                onClick={() => {
                                  setSpamQuotesReasonFilter(reason);
                                  setShowSpamQuotesFilters(false);
                                }}
                                className={`w-full cursor-pointer px-3 py-2 text-left text-sm rounded hover:bg-gray-100 ${
                                  spamQuotesReasonFilter === reason
                                    ? "bg-red-50 text-red-700"
                                    : ""
                                }`}
                              >
                                {reason === "all" ? "All Reasons" : reason}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Bulk Actions for Spam Quotes */}
                  {selectedSpamQuotes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedSpamQuotes.length} selected
                      </span>
                      <div className="relative bulk-spam-quote-actions">
                        <button
                          onClick={() =>
                            setShowBulkSpamQuoteActions(!showBulkSpamQuoteActions)
                          }
                          className="flex items-center cursor-pointer px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Bulk Actions
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {showBulkSpamQuoteActions && (
                          <div className="absolute right-0 z-10 mt-2 w-40 bg-white rounded-lg shadow-lg border">
                            <div className="p-2">
                              <button
                                onClick={() => handleBulkSpamQuoteAction("restore")}
                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 text-green-600"
                              >
                                Restore Selected
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto h-96 overflow-y-scroll">
                {spamQuotesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading spam quotes...
                    </span>
                  </div>
                ) : filteredSpamQuotes.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={areAllSpamQuotesSelected}
                            onChange={(e) =>
                              handleSelectAllSpamQuotes(e.target.checked)
                            }
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Flagged
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pet Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Affiliate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spam Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSpamQuotes.map((quote, index) => {
                        const affiliate = affiliates.find(
                          (a) => a.id === quote.affiliateId
                        );
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="checkbox"
                                checked={selectedSpamQuotes.includes(`${quote.affiliateId}-${quote.timestamp}`)}
                                onChange={(e) =>
                                  handleSpamQuoteSelection(
                                    `${quote.affiliateId}-${quote.timestamp}`,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {quote.flaggedAt
                                ? format(
                                    new Date(quote.flaggedAt),
                                    "MMM dd, yyyy"
                                  )
                                : quote.createdAt
                                ? format(
                                    new Date(quote.createdAt),
                                    "MMM dd, yyyy"
                                  )
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {quote.petOwnerFirstName}{" "}
                                {quote.petOwnerLastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {quote.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {quote.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {quote.petName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {quote.petBreed} • {quote.petType}
                              </div>
                              <div className="text-sm text-gray-500">
                                Age: {quote.petAge}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {affiliate?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {affiliate?.email || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-red-700 bg-red-50 px-2 py-1 rounded-full max-w-xs">
                                {quote.reason || "Flagged as spam"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button
                                onClick={() => handleRestoreSpamQuote(quote)}
                                disabled={spamQuotesLoading}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No spam quotes found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {spamQuotes.length === 0
                        ? "No spam quotes have been flagged yet."
                        : "Try adjusting your search or filter criteria"}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      case "admins":
        return <AdminsList />;
      case "settings":
        return (
          <div className="space-y-6">
            <Title>Account Settings</Title>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <Title className="mb-4">Account Information</Title>
                <div className="space-y-4">
                  <div>
                    <Text className="text-gray-500">Name</Text>
                    <p className="font-medium">{user?.attributes?.name}</p>
                  </div>
                  <div>
                    <Text className="text-gray-500">Email</Text>
                    <p className="font-medium">{user?.attributes?.email}</p>
                  </div>
                  <div>
                    <Text className="text-gray-500">Role</Text>
                    <p className="font-medium">Administrator</p>
                  </div>
                </div>
              </Card>

              <ChangePassword />
            </div>
          </div>
        );
        case "analytics-conversion":
  return (
    <div className="space-y-6">
      <Title>Conversion and Traffic</Title>

        <AnalyticsChart />
    </div>
  );

      default:
        return null;
    }
  };

  const handleCloseModal = () => {
    setShowAddAffiliate(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Toaster position="top-right" />

      {/* Mobile menu overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        id="mobile-sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b border-gray-100">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${
                    activeTab === item.id ? "text-white" : "text-gray-400"
                  }`}
                />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="p-4">
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 
                ${
                  isLoggingOut
                    ? "bg-gray-100 text-gray-400"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
            >
              <LogOut
                className={`w-5 h-5 mr-3 ${
                  isLoggingOut ? "animate-pulse" : ""
                }`}
              />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 transition-all duration-300">
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            data-sidebar-toggle
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Admin Dashboard
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, {user?.attributes?.name || "Admin"}
              </h2>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                Here's what's happening with your affiliates today.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* <button className="p-2 text-gray-600 rounded-full hover:bg-gray-100 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button> */}
              <button
                onClick={() => setShowAddAffiliate(true)}
                className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Affiliate
              </button>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>

      <Dialog
        open={showAddAffiliate}
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-2xl bg-white p-6 shadow-xl">
            <AddAffiliate
              onClose={handleCloseModal}
              onAffiliateCreated={() => {
                affiliatesListRef.current?.fetchAffiliates();
              }}
            />
          </Dialog.Panel>
        </div>
      </Dialog>

      <AffiliateDetailsModal
        isOpen={showAffiliateDetails}
        onClose={() => setShowAffiliateDetails(false)}
        affiliate={selectedAffiliate}
        sales={sales}
      />
    </div>
  );
};

export default AdminDashboard;


