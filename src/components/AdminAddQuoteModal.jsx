import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

const AdminAddQuoteModal = ({ isOpen, onClose, affiliate, onQuoteAdded }) => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    petOwnerFirstName: "",
    petOwnerLastName: "",
    petName: "",
    address: "",
    zipCode: "", // Added this field
    petBreed: "",
    petAge: "",
    status: "pending",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!affiliate) {
      toast.error("Affiliate information not available");
      return;
    }
    setLoading(true);

    try {
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      // Extract zip code from formData
      const zipCode = formData.zipCode.trim();

      // Step 1: Check if customer exists with this email
      const customerExistsParams = {
        TableName: "Customers",
        KeyConditionExpression: "affiliateId = :affiliateId AND email = :email",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliate.id,
          ":email": formData.email,
        }),
      };

      const customerResponse = await dynamoClient.send(
        new QueryCommand(customerExistsParams)
      );

      // If customer with this email already exists, add to spam
      const isDuplicateEmail =
        customerResponse.Items && customerResponse.Items.length > 0;

      // Step 2: Check for duplicates by zip code and pet details
      const zipCodeParams = {
        TableName: "Customers",
        IndexName: "AffiliateZipIndex", // Name of our GSI
        KeyConditionExpression:
          "affiliateId = :affiliateId AND zipCode = :zipCode",
        ExpressionAttributeValues: marshall({
          ":affiliateId": affiliate.id,
          ":zipCode": zipCode,
        }),
      };

      const zipCodeResponse = await dynamoClient.send(
        new QueryCommand(zipCodeParams)
      );

      let isDuplicatePet = false;
      if (zipCodeResponse.Items && zipCodeResponse.Items.length > 0) {
        // Check if any customer in this zip has same pet name and age
        const customers = zipCodeResponse.Items.map((item) => unmarshall(item));
        isDuplicatePet = customers.some(
          (customer) =>
            customer.petName?.toLowerCase() ===
              formData.petName.toLowerCase() &&
            Number(customer.petAge) === Number(formData.petAge)
        );
      }

      // If we detect a duplicate (email or pet in same zip code), add to SpamQuotes
      if (isDuplicateEmail || isDuplicatePet) {
        // Create spam quote entry
        const spamQuoteItem = {
          affiliateId: affiliate.id,
          timestamp: new Date().toISOString(),
          email: formData.email,
          phone: formData.phone,
          petOwnerFirstName: formData.petOwnerFirstName,
          petOwnerLastName: formData.petOwnerLastName,
          petName: formData.petName,
          address: formData.address,
          zipCode: zipCode,
          petBreed: formData.petBreed,
          petAge: Number(formData.petAge),
          reason: isDuplicateEmail
            ? "Duplicate email address"
            : "Duplicate pet in same zip code",
          createdAt: new Date().toISOString(),
        };

        // Add to SpamQuotes table
        const spamQuoteCommand = new PutItemCommand({
          TableName: "SpamQuotes",
          Item: marshall(spamQuoteItem),
        });

        await dynamoClient.send(spamQuoteCommand);

        toast.error(
          "This quote has been flagged as duplicate and moved to spam"
        );
        setLoading(false);
        onClose();
        return;
      }

      const commission = Number(affiliate.basePrice);

      const quoteItem = {
        id: uuidv4(),
        affiliateId: affiliate.id,
        email: formData.email,
        phone: formData.phone,
        petOwnerFirstName: formData.petOwnerFirstName,
        petOwnerLastName: formData.petOwnerLastName,
        petName: formData.petName,
        address: formData.address,
        zipCode: zipCode, // Add zip code as a separate field
        petBreed: formData.petBreed,
        petAge: Number(formData.petAge),
        status: formData.status,
        amount: 0, // Add default value if amount isn't applicable for quotes
        commission: Number(affiliate.basePrice || 0),
        basePrice: Number(affiliate.basePrice),
        createdAt: new Date().toISOString(),
        notes: formData.notes || "",
        timestamp: new Date().toISOString(),
      };

      // Add quote to Quotes table
      const quoteCommand = new PutItemCommand({
        TableName: "Quotes",
        Item: marshall(quoteItem),
      });

      // Also add to Customers table
      const customerCommand = new PutItemCommand({
        TableName: "Customers",
        Item: marshall({
          affiliateId: affiliate.id, // partition key
          email: formData.email, // sort key
          phone: formData.phone,
          petOwnerFirstName: formData.petOwnerFirstName,
          petOwnerLastName: formData.petOwnerLastName,
          petName: formData.petName,
          address: formData.address,
          zipCode: zipCode, // For the GSI
          petBreed: formData.petBreed,
          petAge: Number(formData.petAge),
          createdAt: new Date().toISOString(),
        }),
      });

      // Update affiliate's quotes count
      const updateCommand = new UpdateItemCommand({
        TableName: "Affiliates",
        Key: marshall({
          id: affiliate.id,
        }),
        UpdateExpression:
          "SET quotesCount = if_not_exists(quotesCount, :zero) + :inc",
        ExpressionAttributeValues: marshall({
          ":inc": 1,
          ":zero": 0,
        }),
        ReturnValues: "UPDATED_NEW",
      });

      await Promise.all([
        dynamoClient.send(quoteCommand),
        dynamoClient.send(customerCommand),
        dynamoClient.send(updateCommand),
      ]);

      toast.success("Quote added successfully!");
      onQuoteAdded(affiliate.id);
      onClose();
      setFormData({
        email: "",
        phone: "",
        petOwnerFirstName: "",
        petOwnerLastName: "",
        petName: "",
        address: "",
        zipCode: "",
        petBreed: "",
        petAge: "",
        status: "pending",
        notes: "",
      });
    } catch (err) {
      console.error("Error adding quote:", err);
      toast.error("Failed to add quote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]">
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <Dialog.Title className="text-lg font-medium">
              Add Quote for {affiliate?.name}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <form id="quoteForm" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Owner First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petOwnerFirstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        petOwnerFirstName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Owner Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petOwnerLastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        petOwnerLastName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.zipCode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petName}
                    onChange={(e) =>
                      setFormData({ ...formData, petName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Breed
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petBreed}
                    onChange={(e) =>
                      setFormData({ ...formData, petBreed: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Age
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.petAge}
                    onChange={(e) =>
                      setFormData({ ...formData, petAge: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="no_marketing">No Marketing</option>
                  <option value="pending">Pending</option>
                  <option value="in review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  <p>
                    Base Commission: $
                    {Number(affiliate?.basePrice || 0).toFixed(2)}
                  </p>
                  <p className="mt-1">
                    Commission will apply when the quote is approved.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="quoteForm"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Quote"}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AdminAddQuoteModal;
