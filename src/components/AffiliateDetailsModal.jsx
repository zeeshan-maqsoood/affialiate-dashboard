import { Dialog } from "@headlessui/react";
import {
  X,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  RefreshCw,
  Download,
} from "lucide-react";
import { Card, Title, Text, Badge } from "@tremor/react";
import { useState, useEffect, useMemo } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  DynamoDBClient,
  UpdateItemCommand,
  ScanCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { toast } from "react-hot-toast";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";

const AffiliateDetailsModal = ({ isOpen, onClose, affiliate, sales }) => {
  const [activeTab, setActiveTab] = useState("sales");
  const [affiliateSales, setAffiliateSales] = useState([]);
  const [affiliateQuotes, setAffiliateQuotes] = useState([]);
  const [affiliateDogTags, setAffiliateDogTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [quotesSearchTerm, setQuotesSearchTerm] = useState("");
  const [dogTagsSearchTerm, setDogTagsSearchTerm] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("all");
  const [quotesStatusFilter, setQuotesStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [showQuotesFilters, setShowQuotesFilters] = useState(false);

  useEffect(() => {
    if (sales && affiliate) {
      setAffiliateSales(
        sales.filter((sale) => sale.affiliateId === affiliate?.id)
      );
      fetchAffiliateQuotes(affiliate.id);
      if (affiliate.freeDogTagOffer) {
        fetchAffiliateDogTags(affiliate.id);
      }
    }
  }, [sales, affiliate]);

  const fetchAffiliateQuotes = async (affiliateId) => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new QueryCommand({
        TableName: "Quotes",
        IndexName: "affiliateId-index",
        KeyConditionExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliateId,
        }),
      });

      const response = await dynamoClient.send(command);
      console.log("quotes", response, affiliateId);

      if (response.Items) {
        const quotes = response.Items.map((item) => unmarshall(item));
        setAffiliateQuotes(quotes);
      } else {
        setAffiliateQuotes([]);
      }
    } catch (err) {
      console.error("Error fetching quotes:", err);
      if (err.name === "AccessDeniedException") {
        toast.error("Permission denied: Unable to access quotes data");
        setAffiliateQuotes([]);
      } else {
        toast.error("Failed to fetch quotes data");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliateDogTags = async (affiliateId) => {
    try {
      setLoading(true);

      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new QueryCommand({
        TableName: "DogTag",
        KeyConditionExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliateId,
        }),
        ScanIndexForward: true,
      });

      const response = await dynamoClient.send(command);

      if (response.Items) {
        const tags = response.Items.map((item) => unmarshall(item));
        setAffiliateDogTags(tags);
      } else {
        setAffiliateDogTags([]);
      }
    } catch (err) {
      console.error("Error fetching dog tags:", err);
      if (err.name === "AccessDeniedException") {
        toast.error("Permission denied: Unable to access dog tag data");
        setAffiliateDogTags([]);
      } else {
        toast.error("Failed to fetch dog tag data");
      }
    } finally {
      setLoading(false);
    }
  };
  const applyDateFilter = (items) => {
    if (dateFilter === "all") return items;

    const today = new Date();
    let startDate;

    switch (dateFilter) {
      case "today":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case "thisWeek":
        startDate = subDays(today, today.getDay());
        break;
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last30Days":
        startDate = subDays(today, 30);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // End of the day
          return items.filter((item) => {
            const dateValue = item.createdAt || item.timestamp;
            const itemDate = new Date(dateValue);
            return itemDate >= start && itemDate <= end;
          });
        }
        return items;
      default:
        return items;
    }

    return items.filter((item) => {
      const dateValue = item.createdAt || item.timestamp;
      return new Date(dateValue) >= startDate;
    });
  };

  // Filter sales
  const filteredSales = useMemo(() => {
    let result = affiliateSales;

    // Apply date filter
    result = applyDateFilter(result);

    // Apply status filter
    if (salesStatusFilter !== "all") {
      result = result.filter((sale) => sale.status === salesStatusFilter);
    }

    // Apply search filter
    if (salesSearchTerm) {
      const search = salesSearchTerm.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.productName?.toLowerCase().includes(search) ||
          String(sale.id).toLowerCase().includes(search)
      );
    }

    return result;
  }, [
    affiliateSales,
    salesStatusFilter,
    salesSearchTerm,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    let result = affiliateQuotes;

    // Apply date filter
    result = applyDateFilter(result);

    // Apply status filter
    if (quotesStatusFilter !== "all") {
      result = result.filter((quote) => quote.status === quotesStatusFilter);
    }

    // Apply search filter
    if (quotesSearchTerm) {
      const search = quotesSearchTerm.toLowerCase();
      result = result.filter(
        (quote) =>
          quote.petName?.toLowerCase().includes(search) ||
          quote.petBreed?.toLowerCase().includes(search) ||
          quote.petType?.toLowerCase().includes(search) ||
          quote.petOwnerFirstName?.toLowerCase().includes(search) ||
          quote.petOwnerLastName?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [
    affiliateQuotes,
    quotesStatusFilter,
    quotesSearchTerm,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const formatCellValue = (v) => {
    if (v == null) return null;
    if (typeof v === "object") {
      const entries = Object.entries(v);
      return entries.map(([k, val], i) => (
        <>        
        <span key={k} className="whitespace-nowrap">
          {k} &bull; {val}
          {i < entries.length - 1 ? ", " : ""}
        </span><br/>
        </>
      ));   
    }
    return <span className="whitespace-nowrap">{v}</span>;
  };
  
  const flattenDetail = (v) => {
    if (v == null) return "";
    if (typeof v === "object") {
      return Object
        .entries(v)
        .map(([k, val]) => `${k} • ${val}`)
        .join(", ");
    }
    return String(v);
  };

  const stats = useMemo(() => {
    const totalSales = affiliateSales.reduce(
      (sum, sale) => sum + sale.amount,
      0
    );
    const totalSalesCount = affiliateSales.length;
    const totalQuotes = affiliateQuotes.length;
    const baseMonthlyPay = affiliate?.baseMonthlyPay || 0;

    // Calculate if affiliate has completed at least one month
    const joiningDate = new Date(affiliate?.createdAt);
    const currentDate = new Date();
    const daysSinceJoining = Math.floor(
      (currentDate - joiningDate) / (1000 * 60 * 60 * 24)
    );
    const completedMonths = Math.floor(daysSinceJoining / 30);

    // Calculate commission
    const quoteCommission = affiliate?.basePrice || 0;
    const approvedQuotes = affiliateQuotes.filter(
      (q) => q.status === "approved"
    ).length;
    const totalCommission = quoteCommission * approvedQuotes;

    // Calculate total earnings
    const totalBaseMonthlyPay =
      completedMonths > 0 ? baseMonthlyPay * completedMonths : 0;
    const totalEarnings = totalCommission + totalBaseMonthlyPay;

    // Calculate donation stats for Helping Shelters campaign
    const isHelpingSheltersInfluencer = affiliate?.isInfluencer;
    const verifiedQuotes = affiliateQuotes.filter(q => q.status === "approved").length;
    const totalDonations = isHelpingSheltersInfluencer ? verifiedQuotes * 4 : 0; // $4 per verified quote

    return {
      totalSales,
      totalSalesCount,
      totalQuotes,
      baseMonthlyPay,
      totalCommission,
      totalEarnings,
      completedMonths,
      // Donation stats
      totalDonations,
      verifiedQuotes,
      isHelpingSheltersInfluencer,
    };
  }, [affiliateSales, affiliateQuotes, affiliate]);

  const dogTagHeaders = useMemo(() => {
    const headers = new Set();
    affiliateDogTags.forEach((tag) => {
      if (tag.tag_details) {
        Object.keys(tag.tag_details).forEach((key) => headers.add(key));
      }
    });
    return Array.from(headers);
  }, [affiliateDogTags]);

  const filteredDogTags = useMemo(() => {
    let result = affiliateDogTags;
    result = applyDateFilter(result);
    if (dogTagsSearchTerm) {
      const search = dogTagsSearchTerm.toLowerCase();
      result = result.filter((tag) =>
        JSON.stringify(tag).toLowerCase().includes(search)
      );
    }
    return result;
  }, [affiliateDogTags, dogTagsSearchTerm, dateFilter, customStartDate, customEndDate]);

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new UpdateItemCommand({
        TableName: "Quotes",
        Key: marshall({
          id: quoteId,
        }),
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: marshall({
          ":status": newStatus,
        }),
        ReturnValues: "UPDATED_NEW",
      });

      await dynamoClient.send(command);

      setAffiliateQuotes((prevQuotes) =>
        prevQuotes.map((quote) => {
          if (quote.id === quoteId) {
            return { ...quote, status: newStatus };
          }
          return quote;
        })
      );

      toast.success("Quote status updated successfully");
    } catch (err) {
      console.error("Error updating quote status:", err);
      if (err.name === "AccessDeniedException") {
        toast.error("Permission denied: Unable to update quote status");
      } else {
        toast.error("Failed to update quote status");
      }
    }
  };

  const exportDogTags = () => {
    const data = affiliateDogTags.map((tag) => {
      const row = {
        affiliateId: tag.affiliateId,
        timestamp: new Date(Number(tag.timestamp)),
        email: tag.email,
      };
      Object.entries(tag.tag_details || {}).forEach(([key, val]) => {
        row[key] = flattenDetail(val);
      });
      return row;
    });
  
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DogTags");
    XLSX.writeFile(workbook, `dogtags_${affiliate.id}.xlsx`);
  };
  

  const resetFilters = () => {
    setSalesSearchTerm("");
    setQuotesSearchTerm("");
    setDogTagsSearchTerm("");
    setSalesStatusFilter("all");
    setQuotesStatusFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="mx-auto max-w-6xl w-full rounded-2xl bg-white shadow-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start p-2 sm:p-4 lg:p-6 border-b">
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">
                {affiliate?.name}
              </Dialog.Title>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                {affiliate?.email}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                Joined {new Date(affiliate?.createdAt).toLocaleDateString()}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 break-all">
                Affiliate Link: {affiliate?.link}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Stat Cards - Responsive grid */}
          <div className="p-2 lg:p-2 pb-0">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-2 lg:gap-3">
              {/* Total Sales Card */}
              <Card className="p-1.5 sm:p-2 lg:p-3 hover:shadow-sm transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <Text className="text-xs font-medium text-gray-500">
                    Total Sales
                  </Text>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-indigo-500"></div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800">
                    ${stats.totalSales.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">USD</span>
                </div>
                <Text className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                  {stats.totalSalesCount} transactions
                </Text>
              </Card>

              {/* Total Quotes Card */}
              <Card className="p-1.5 sm:p-2 lg:p-3 hover:shadow-sm transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <Text className="text-xs font-medium text-gray-500">
                    Total Quotes
                  </Text>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800">
                    {stats.totalQuotes}
                  </span>
                </div>
                <Text className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                  {(
                    (stats.totalQuotes /
                      (stats.totalQuotes + stats.totalSalesCount || 1)) *
                    100
                  ).toFixed(1)}
                  % of activity
                </Text>
              </Card>

              {/* Monthly Base Pay Card */}
              <Card className="p-1.5 sm:p-2 lg:p-3 hover:shadow-sm transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <Text className="text-xs font-medium text-gray-500">
                    Monthly Base Pay
                  </Text>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500"></div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800">
                    ${stats.baseMonthlyPay.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">USD</span>
                </div>
                <Text className="text-xs text-gray-400 mt-0.5 sm:mt-1">Fixed monthly</Text>
              </Card>

              {/* Total Earnings Card */}
              <Card className="p-1.5 sm:p-2 lg:p-3 hover:shadow-sm transition-shadow border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <Text className="text-xs font-medium text-gray-500">
                    Total Earnings
                  </Text>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-purple-500"></div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800">
                    ${stats.totalEarnings.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">USD</span>
                </div>
                <div className="flex flex-col mt-0.5 sm:mt-1">
                  <Text className="text-xs text-gray-400">
                    Commission: ${stats.totalCommission.toLocaleString()}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {stats.completedMonths > 0
                      ? `Base pay: ${stats.completedMonths} months`
                      : "Base pay not yet applied (< 1 month)"}
                  </Text>
                </div>
              </Card>

              {/* Helping Shelters Donations Card - Only show for influencers */}
              {stats.isHelpingSheltersInfluencer && (
                <Card className="p-1.5 sm:p-2 lg:p-3 hover:shadow-sm transition-shadow border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <Text className="text-xs font-medium text-gray-500">
                      Helping Shelters
                    </Text>
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-pink-500"></div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-800">
                      ${stats.totalDonations.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">USD</span>
                  </div>
                  <Text className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                    {stats.verifiedQuotes} verified quotes
                  </Text>
                </Card>
              )}
            </div>
          </div>

          {/* Tab Navigation - Responsive */}
          <div className="px-2  lg:px-6 pt-2 sm:pt-3 lg:pt-3">
            <div className="flex border-b overflow-x-auto">
              <button
                className={`px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === "sales"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("sales")}
              >
                Sales History
              </button>
              <button
                className={`px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === "quotes"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("quotes")}
              >
                Quotes History
              </button>
              {affiliate?.freeDogTagOffer && (
                <button
                  className={`px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 font-medium text-sm whitespace-nowrap ${
                    activeTab === "dogtags"
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("dogtags")}
                >
                  Dog Tags
                </button>
              )}
            </div>
          </div>

          {/* Date Filter - Responsive */}
          <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center">
                <button
                  onClick={resetFilters}
                  className="flex items-center mr-3 sm:mr-4 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Reset Filters
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-gray-500" />
                    <span className="hidden sm:inline">
                      {dateFilter === "all"
                        ? "All Time"
                        : dateFilter === "custom"
                        ? "Custom Range"
                        : dateFilter === "today"
                        ? "Today"
                        : dateFilter === "thisWeek"
                        ? "This Week"
                        : dateFilter === "thisMonth"
                        ? "This Month"
                        : dateFilter === "last30Days"
                        ? "Last 30 Days"
                        : "All Time"}
                    </span>
                    <span className="sm:hidden">
                      {dateFilter === "all"
                        ? "All"
                        : dateFilter === "custom"
                        ? "Custom"
                        : dateFilter === "today"
                        ? "Today"
                        : dateFilter === "thisWeek"
                        ? "Week"
                        : dateFilter === "thisMonth"
                        ? "Month"
                        : dateFilter === "last30Days"
                        ? "30 Days"
                        : "All"}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 text-gray-500" />
                  </button>

                  {showDatePicker && (
                    <div className="absolute left-0 z-10 mt-1 w-56 bg-white rounded-lg shadow-lg border">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setDateFilter("all");
                            setShowDatePicker(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                        >
                          All Time
                        </button>
                        <button
                          onClick={() => {
                            setDateFilter("today");
                            setShowDatePicker(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => {
                            setDateFilter("thisWeek");
                            setShowDatePicker(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                        >
                          This Week
                        </button>
                        <button
                          onClick={() => {
                            setDateFilter("thisMonth");
                            setShowDatePicker(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                        >
                          This Month
                        </button>
                        <button
                          onClick={() => {
                            setDateFilter("last30Days");
                            setShowDatePicker(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 rounded"
                        >
                          Last 30 Days
                        </button>

                        <div className="border-t mt-2 pt-2">
                          <p className="text-sm font-medium text-gray-700 px-3 mb-2">
                            Custom Range
                          </p>
                          <div className="space-y-2 px-3">
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded"
                              placeholder="Start date"
                            />
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded"
                              placeholder="End date"
                            />
                            <button
                              onClick={() => {
                                if (customStartDate && customEndDate) {
                                  setDateFilter("custom");
                                  setShowDatePicker(false);
                                }
                              }}
                              className="w-full px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              Apply Range
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Sales History Tab */}
            {activeTab === "sales" && (
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 lg:mb-4 gap-2 sm:gap-3 flex-shrink-0">
                  <Title className="text-base sm:text-lg lg:text-xl">Sales History</Title>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search sales..."
                        value={salesSearchTerm}
                        onChange={(e) => setSalesSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowSalesFilters(!showSalesFilters)}
                        className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg w-full sm:w-auto justify-center ${
                          showSalesFilters
                            ? "border-indigo-500 text-indigo-500"
                            : "text-gray-500"
                        }`}
                      >
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        Status
                        <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 sm:ml-1" />
                      </button>

                      {showSalesFilters && (
                        <div className="absolute right-0 sm:left-0 mt-1 w-full sm:w-40 bg-white border rounded-lg shadow-lg z-10">
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setSalesStatusFilter("all");
                                setShowSalesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                salesStatusFilter === "all"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              All Statuses
                            </button>
                            <button
                              onClick={() => {
                                setSalesStatusFilter("completed");
                                setShowSalesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                salesStatusFilter === "completed"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              Completed
                            </button>
                            <button
                              onClick={() => {
                                setSalesStatusFilter("pending");
                                setShowSalesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                salesStatusFilter === "pending"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              Pending
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 mb-3 flex-shrink-0">
                  <Text className="text-sm text-gray-500">
                    Showing {filteredSales.length} of {affiliateSales.length}{" "}
                    sales
                    {salesStatusFilter !== "all" &&
                      ` • Filtered by: ${salesStatusFilter}`}
                    {dateFilter !== "all" &&
                      ` • Date: ${dateFilter
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()}`}
                  </Text>
                </div>

                <div className="flex-1 min-h-0">
                  {filteredSales.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Date
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Product
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50">
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                                {format(new Date(sale.createdAt), "MMM dd, yyyy")}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">
                                {sale.productName}
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <span
                                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
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
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
                      {salesSearchTerm ||
                      salesStatusFilter !== "all" ||
                      dateFilter !== "all" ? (
                        <>
                          <p className="text-gray-600 font-medium">
                            No matching sales found
                          </p>
                          <p className="text-sm mt-1">
                            Try adjusting your filters
                          </p>
                          <button
                            onClick={resetFilters}
                            className="mt-3 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <p>No sales found for this affiliate</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quotes History Tab */}
            {activeTab === "quotes" && (
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 lg:mb-4 gap-2 sm:gap-3 flex-shrink-0">
                  <Title className="text-base sm:text-lg lg:text-xl">Quotes History</Title>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search quotes..."
                        value={quotesSearchTerm}
                        onChange={(e) => setQuotesSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowQuotesFilters(!showQuotesFilters)}
                        className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg w-full sm:w-auto justify-center ${
                          showQuotesFilters
                            ? "border-indigo-500 text-indigo-500"
                            : "text-gray-500"
                        }`}
                      >
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        Status
                        <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 sm:ml-1" />
                      </button>

                      {showQuotesFilters && (
                        <div className="absolute right-0 sm:left-0 mt-1 w-full sm:w-40 bg-white border rounded-lg shadow-lg z-10">
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setQuotesStatusFilter("all");
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                quotesStatusFilter === "all"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              All Statuses
                            </button>
                            <button
                              onClick={() => {
                                setQuotesStatusFilter("pending");
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                quotesStatusFilter === "pending"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => {
                                setQuotesStatusFilter("in review");
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                quotesStatusFilter === "in review"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              In Review
                            </button>
                            <button
                              onClick={() => {
                                setQuotesStatusFilter("approved");
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                quotesStatusFilter === "approved"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              Approved
                            </button>
                            <button
                              onClick={() => {
                                setQuotesStatusFilter("rejected");
                                setShowQuotesFilters(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded ${
                                quotesStatusFilter === "rejected"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              Rejected
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 mb-3 flex-shrink-0">
                  <Text className="text-sm text-gray-500">
                    Showing {filteredQuotes.length} of {affiliateQuotes.length}{" "}
                    quotes
                    {quotesStatusFilter !== "all" &&
                      ` • Filtered by: ${quotesStatusFilter}`}
                    {dateFilter !== "all" &&
                      ` • Date: ${dateFilter
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()}`}
                  </Text>
                </div>

                <div className="flex-1 min-h-0">
                  {loading ? (
                    <div className="py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="mt-2 text-gray-500">Loading quotes...</p>
                    </div>
                  ) : filteredQuotes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Date
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Email
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Pet Owner
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Pet Name
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Pet Breed
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Status
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredQuotes.map((quote) => (
                            <tr key={quote.id} className="hover:bg-gray-50">
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                                {format(new Date(quote.createdAt), "MMM dd, yyyy")}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">
                                {quote.email}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">
                                {quote.petOwnerFirstName} {quote.petOwnerLastName}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">
                                <div>
                                  <div>{quote?.petName}</div>
                                  {quote?.petType && (
                                    <div className="text-gray-500 text-xs">
                                      {quote?.petType}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">
                                {quote.petBreed}
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <span
                                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
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
                              <td className="px-3 sm:px-6 py-4">
                                <select
                                  className="text-sm border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto"
                                  value={quote.status}
                                  onChange={(e) =>
                                    handleStatusChange(quote.id, e.target.value)
                                  }
                                >
                                  <option value="no_marketing">No Marketing</option>
                                  <option value="pending">Pending</option>
                                  <option value="in review">In Review</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
                      {quotesSearchTerm ||
                      quotesStatusFilter !== "all" ||
                      dateFilter !== "all" ? (
                        <>
                          <p className="text-gray-600 font-medium">
                            No matching quotes found
                          </p>
                          <p className="text-sm mt-1">
                            Try adjusting your filters
                          </p>
                          <button
                            onClick={resetFilters}
                            className="mt-3 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <p>No quotes found for this affiliate</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Dog Tags Tab */}
            {activeTab === "dogtags" && affiliate?.freeDogTagOffer && (
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 lg:mb-4 gap-2 sm:gap-3 flex-shrink-0">
                  <Title className="text-base sm:text-lg lg:text-xl">Dog Tags</Title>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search dog tags..."
                        value={dogTagsSearchTerm}
                        onChange={(e) => setDogTagsSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={exportDogTags}
                      className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border rounded-md sm:rounded-lg text-gray-500 hover:text-gray-700 justify-center"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                      Export
                    </button>
                  </div>
                </div>

                <div className="mt-2 mb-3 flex-shrink-0">
                  <Text className="text-sm text-gray-500">
                    Showing {filteredDogTags.length} of {affiliateDogTags.length} records
                    {dateFilter !== "all" &&
                      ` • Date: ${dateFilter.replace(/([A-Z])/g, " $1").toLowerCase()}`}
                  </Text>
                </div>

                <div className="flex-1 min-h-0">
                  {filteredDogTags.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Date
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Email
                            </th>
                            {dogTagHeaders.map((header) => (
                              <th
                                key={header}
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredDogTags.map((tag) => (
                            <tr key={String(tag.timestamp)} className="hover:bg-gray-50">
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                                {tag.timestamp && !isNaN(Number(tag.timestamp))
                                    ? format(new Date(Number(tag.timestamp)), "MMM dd, yyyy")
                                    : ""}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-sm">{tag.email}</td>
                              {dogTagHeaders.map((header) => (
                                <td key={header} className="px-3 sm:px-6 py-4 text-sm">
                                  {formatCellValue(tag.tag_details?.[header])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
                      {dogTagsSearchTerm || dateFilter !== "all" ? (
                        <>
                          <p className="text-gray-600 font-medium">No matching dog tags found</p>
                          <p className="text-sm mt-1">Try adjusting your filters</p>
                          <button
                            onClick={resetFilters}
                            className="mt-3 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <p>No dog tags found for this affiliate</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AffiliateDetailsModal;
