import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Eye,
  Trash2,
  Edit2,
  X,
  PlusCircle,
  DollarSign,
  FileText,
  ChevronDown,
  Search,
  UserPlus,
} from "lucide-react";
import { Card, Title, Text, Badge } from "@tremor/react";
import { Dialog } from "@headlessui/react";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import toast from "react-hot-toast";
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import AdminAddSaleModal from "./AdminAddSaleModal";
import AdminAddQuoteModal from "./AdminAddQuoteModal";

const AffiliatesList = forwardRef(({ openDetailsModal, sales }, ref) => {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAffiliate, setEditedAffiliate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [affiliateToDelete, setAffiliateToDelete] = useState(null);
  const [affiliateSales, setAffiliateSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [selectedAffiliateForSale, setSelectedAffiliateForSale] =
    useState(null);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [selectedAffiliateForQuote, setSelectedAffiliateForQuote] =
    useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();

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
      const unmarshalledItems = response.Items.map((item) => unmarshall(item));
      setAffiliates(unmarshalledItems);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliateSales = async (affiliateId) => {
    try {
      setLoadingSales(true);
      const { credentials } = await fetchAuthSession();

      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new ScanCommand({
        TableName: "Sales",
        FilterExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliateId,
        }),
      });

      const response = await dynamoClient.send(command);
      const sales = response.Items.map((item) => unmarshall(item));
      setAffiliateSales(sales);
    } catch (err) {
      console.error("Error fetching sales:", err);
      toast.error("Failed to load sales data");
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchAffiliateQuotes = async (affiliateId) => {
    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new ScanCommand({
        TableName: "Quotes",
        FilterExpression: "affiliateId = :affiliateId",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliateId,
        }),
      });

      const response = await dynamoClient.send(command);
      // We don't need to set any state here as this is just to refresh data
    } catch (err) {
      console.error("Error fetching quotes:", err);
      toast.error("Failed to refresh quotes data");
    }
  };

  const handleViewDetails = async (affiliate) => {
    if (openDetailsModal) {
      // Use the function passed from AdminDashboard
      openDetailsModal(affiliate);
    } else {
      // Fallback to local implementation
      setSelectedAffiliate(affiliate);
      setShowDetailsModal(true);
      await fetchAffiliateSales(affiliate.id);
    }
  };

  // Add the missing handleEdit function
  const handleEdit = (affiliate) => {
    setEditedAffiliate({ ...affiliate });
    setIsEditing(true);
  };

  // Add the missing handleSaveEdit function
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      // Update in DynamoDB
      const updateCommand = new UpdateItemCommand({
        TableName: "Affiliates",
        Key: marshall({
          id: editedAffiliate.id,
        }),
        UpdateExpression:
          "SET #name = :name, #email = :email, #address = :address, #phone = :phone, #basePrice = :basePrice, #baseMonthlyPay = :baseMonthlyPay, #accountHandle = :accountHandle, #facilityType = :facilityType, #isCharity = :isCharity, #isPartner = :isPartner, #isInfluencer = :isInfluencer, #isInfluencerCreators = :isInfluencerCreators, #shareLeads = :shareLeads, #freeDogTagOffer = :freeDogTagOffer, #pumpkinInsuranceOnly = :pumpkinInsuranceOnly, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#name": "name",
          "#email": "email",
          "#address": "address",
          "#phone": "phoneNumber",
          "#basePrice": "basePrice",
          "#baseMonthlyPay": "baseMonthlyPay",
          "#accountHandle": "accountHandle",
          "#updatedAt": "updatedAt",
          "#facilityType": "facilityType",
          "#isCharity": "isCharity",
          "#isPartner": "isPartner",
          "#isInfluencer": "isInfluencer",
          "#isInfluencerCreators": "isInfluencerCreators",
          "#shareLeads": "shareLeads",
          "#freeDogTagOffer": "freeDogTagOffer",
          "#pumpkinInsuranceOnly": "pumpkinInsuranceOnly",
        },
        ExpressionAttributeValues: marshall({
          ":name": editedAffiliate.name,
          ":email": editedAffiliate.email,
          ":address": editedAffiliate.address || "",
          ":phone": editedAffiliate.phoneNumber,
          ":basePrice": parseFloat(editedAffiliate.basePrice) || 0,
          ":baseMonthlyPay": parseFloat(editedAffiliate.baseMonthlyPay) || 0,
          ":accountHandle": editedAffiliate.accountHandle || "",
          ":updatedAt": new Date().toISOString(),
          ":facilityType": editedAffiliate.facilityType || "both",
          ":isCharity": editedAffiliate.isCharity === true,
          ":isPartner": editedAffiliate.isPartner === true,
          ":isInfluencer": editedAffiliate.isInfluencer === true,
          ":isInfluencerCreators": editedAffiliate.isInfluencerCreators === true,
          ":shareLeads": editedAffiliate.shareLeads === true,
          ":freeDogTagOffer": editedAffiliate.freeDogTagOffer === true,
          ":pumpkinInsuranceOnly": editedAffiliate.pumpkinInsuranceOnly === true,
        }),
      });

      await dynamoClient.send(updateCommand);

      // Update local state
      setAffiliates(
        affiliates.map((aff) =>
          aff.id === editedAffiliate.id ? { ...aff, ...editedAffiliate } : aff
        )
      );

      toast.success("Affiliate updated successfully");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating affiliate:", err);
      toast.error("Failed to update affiliate");
    } finally {
      setIsSaving(false);
    }
  };

  // Add the missing handleDelete function
  const handleDelete = (affiliate) => {
    setAffiliateToDelete(affiliate);
    setShowDeleteConfirm(true);
  };

  // Add the confirmDelete function
  const confirmDelete = async () => {
    if (!affiliateToDelete) return;

    setIsDeleting(true);

    try {
      const { credentials } = await fetchAuthSession();

      // 1. Delete from DynamoDB
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const deleteCommand = new DeleteItemCommand({
        TableName: "Affiliates",
        Key: marshall({
          id: affiliateToDelete.id,
        }),
      });

      await dynamoClient.send(deleteCommand);

      // 2. Delete from Cognito if needed
      // Only do this if you want to completely remove the user
      if (affiliateToDelete.cognitoId) {
        const cognitoClient = new CognitoIdentityProviderClient({
          region: "us-east-1",
          credentials,
        });

        const deleteUserCommand = new AdminDeleteUserCommand({
          UserPoolId: "us-east-1_Sln0RkWRn", // Replace with your actual User Pool ID
          Username: affiliateToDelete.cognitoId,
        });

        await cognitoClient.send(deleteUserCommand);
      }

      // Update local state
      setAffiliates(affiliates.filter((a) => a.id !== affiliateToDelete.id));

      toast.success("Affiliate deleted successfully");
      setShowDeleteConfirm(false);
      setAffiliateToDelete(null);
    } catch (err) {
      console.error("Error deleting affiliate:", err);
      toast.error("Failed to delete affiliate: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchAffiliates,
  }));

  // Filter affiliates based on search term
  const filteredAffiliates = affiliates.filter(
    (affiliate) =>
      affiliate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with search and add affiliate button */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Affiliate Management
          </h2>
          <p className="text-gray-500 mt-1">
            Manage your affiliates, sales, and quotes
          </p>
        </div>

        <div className="flex gap-4 self-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search affiliates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Loading affiliates...</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAffiliates.length > 0 ? (
                    filteredAffiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-700 font-medium">
                                {affiliate.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {affiliate.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {affiliate.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(affiliate.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetails(affiliate)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(affiliate)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                              title="Edit Affiliate"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>

                            {/* Dropdown for Add Sale/Quote */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setShowActionMenu(
                                    showActionMenu === affiliate.id
                                      ? null
                                      : affiliate.id
                                  )
                                }
                                className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50 flex items-center"
                                title="Add Record"
                              >
                                <PlusCircle className="h-5 w-5" />
                              </button>

                              {showActionMenu === affiliate.id && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-200 z-10">
                                  <div
                                    className="py-1"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="options-menu"
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedAffiliateForSale(affiliate);
                                        setShowAddSaleModal(true);
                                        setShowActionMenu(null);
                                      }}
                                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      <DollarSign className="mr-3 h-4 w-4 text-green-500" />
                                      Add Sale
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAffiliateForQuote(affiliate);
                                        setShowAddQuoteModal(true);
                                        setShowActionMenu(null);
                                      }}
                                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      <FileText className="mr-3 h-4 w-4 text-blue-500" />
                                      Add Quote
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleDelete(affiliate)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                              title="Delete Affiliate"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : searchTerm ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <p className="text-gray-500 font-medium">
                          No affiliates matching "{searchTerm}"
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Try adjusting your search term
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <p className="text-gray-500 font-medium">
                          No affiliates found
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Add your first affiliate to get started
                        </p>
                        <button className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                          <UserPlus className="w-4 h-4" />
                          <span>Add Affiliate</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredAffiliates.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {filteredAffiliates.length} of {affiliates.length}{" "}
                    affiliates
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/75 bg-opacity-25"></div>
        <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Affiliate
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editedAffiliate?.name || ""}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      name: e.target.value,
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editedAffiliate?.email || ""}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      email: e.target.value,
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  required
                />
              </div>

              {/* Address Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={editedAffiliate?.address || ""}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      address: e.target.value,
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  rows="3"
                />
              </div>

              {/* Phone Number Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={editedAffiliate?.phoneNumber || ""}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      phoneNumber: e.target.value,
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Base Price Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Base Commission/Sale
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={editedAffiliate?.basePrice || 0}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      basePrice: parseFloat(e.target.value),
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Commission earned per sale/quote
                </p>
              </div>

              {/* Base Monthly Pay Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Base Monthly Pay
                </label>
                <input
                  type="number"
                  name="baseMonthlyPay"
                  value={editedAffiliate?.baseMonthlyPay || 0}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      baseMonthlyPay: parseFloat(e.target.value),
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fixed monthly payment regardless of performance
                </p>
              </div>

              
              {/* Account Handle Field */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Account Handle
                </label>
                <input
                  type="text"
                  name="accountHandle"
                  value={editedAffiliate?.accountHandle || ""}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      accountHandle: e.target.value,
                    })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                  placeholder="@affiliatehandle"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional. Social or business handle for this affiliate (e.g. @affiliatehandle)
                </p>
              </div>
              
              {/* Facility Type */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Facility Type
                </label>
                <select
                  name="facilityType"
                  value={editedAffiliate?.facilityType || "both"}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      facilityType: e.target.value,
                    })
                  }
                  className="shadow border rounded w-full py-2 px-3 focus:outline-none focus:ring focus:border-indigo-300"
                >
                  <option value="dog-only">Dog Only</option>
                  <option value="cat-only">Cat Only</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* 2. Charity vs Business */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-isCharity"
                  checked={editedAffiliate?.isCharity || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      isCharity: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-isCharity" className="text-gray-700 text-sm">
                  This affiliate is a charity (uncheck for business)
                </label>
              </div>

              {/* Partner Facility */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-isPartner"
                  checked={editedAffiliate?.isPartner || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      isPartner: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-isPartner" className="text-gray-700 text-sm">
                  Mark as partner facility
                </label>
              </div>

              {/* Influencer Facility - Shelter Campaign */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-isInfluencer"
                  checked={editedAffiliate?.isInfluencer || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      isInfluencer: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-isInfluencer" className="text-gray-700 text-sm">
                  This affiliate is an influencer (Shelter Campaign)
                </label>
              </div>

              {/* Influencer Facility - Creators Campaign */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-isInfluencerCreators"
                  checked={editedAffiliate?.isInfluencerCreators || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      isInfluencerCreators: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-isInfluencerCreators" className="text-gray-700 text-sm">
                  This affiliate is an influencer (Creators Campaign)
                </label>
              </div>

              {/* 3. Share Customer Leads */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-shareLeads"
                  checked={editedAffiliate?.shareLeads || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      shareLeads: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-shareLeads" className="text-gray-700 text-sm">
                  Allow sharing of customer lead information
                </label>
              </div>

              {/* 4. Free Dog Tag Offer */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-freeDogTagOffer"
                  checked={editedAffiliate?.freeDogTagOffer || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      freeDogTagOffer: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-freeDogTagOffer" className="text-gray-700 text-sm">
                  Free Dog Tag Offer
                </label>
              </div>

              {/* 5. Pumpkin Insurance Quotes Only */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-pumpkinInsuranceOnly"
                  checked={editedAffiliate?.pumpkinInsuranceOnly || false}
                  onChange={(e) =>
                    setEditedAffiliate({
                      ...editedAffiliate,
                      pumpkinInsuranceOnly: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="edit-pumpkinInsuranceOnly" className="text-gray-700 text-sm">
                  Pumpkin Insurance quotes only
                </label>
              </div>

              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/75 bg-opacity-25"></div>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Delete
              </h3>
              <p className="text-gray-500 mt-2">
                Are you sure you want to delete the affiliate{" "}
                <span className="font-medium">{affiliateToDelete?.name}</span>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Other modals */}
      {!openDetailsModal && (
        <Dialog
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          className="relative z-50"
        >
          {/* Details dialog content would go here */}
        </Dialog>
      )}

      <AdminAddSaleModal
        isOpen={showAddSaleModal}
        onClose={() => {
          setShowAddSaleModal(false);
          setSelectedAffiliateForSale(null);
        }}
        affiliate={selectedAffiliateForSale}
        onSaleAdded={() => {
          fetchAffiliateSales(selectedAffiliateForSale?.id);
          fetchAffiliates();
        }}
      />

      <AdminAddQuoteModal
        isOpen={showAddQuoteModal}
        onClose={() => {
          setShowAddQuoteModal(false);
          setSelectedAffiliateForQuote(null);
        }}
        affiliate={selectedAffiliateForQuote}
        onQuoteAdded={() => {
          fetchAffiliateQuotes(selectedAffiliateForQuote?.id);
          fetchAffiliates();
        }}
      />
    </div>
  );
});

export default AffiliatesList;
