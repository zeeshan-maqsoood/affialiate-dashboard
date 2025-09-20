import { useState, useEffect } from "react";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { fetchAuthSession } from "aws-amplify/auth";
import toast from "react-hot-toast";

const AddSaleModal = ({ isOpen, onClose, affiliateInfo, onSaleAdded }) => {
  const [formData, setFormData] = useState({
    productName: "",
    amount: "",
    saleDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        productName: "",
        amount: "",
        saleDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!affiliateInfo) {
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

      // Convert basePrice to number for commission
      const commission = Number(affiliateInfo.basePrice);

      const saleItem = {
        id: uuidv4(),
        affiliateId: affiliateInfo.id,
        productName: formData.productName,
        amount: parseFloat(formData.amount),
        commission: commission,
        basePrice: Number(affiliateInfo.basePrice), // Ensure basePrice is stored as number
        createdAt: formData.saleDate,
        notes: formData.notes || "",
        status: "pending",
        timestamp: new Date().toISOString(),
        date: formData.saleDate,
      };

      // Add sale to Sales table
      const saleCommand = new PutItemCommand({
        TableName: "Sales",
        Item: marshall(saleItem),
      });

      // Update affiliate's sales count
      const updateCommand = new UpdateItemCommand({
        TableName: "Affiliates",
        Key: marshall({
          id: affiliateInfo.id,
        }),
        UpdateExpression:
          "SET salesCount = if_not_exists(salesCount, :zero) + :inc",
        ExpressionAttributeValues: marshall({
          ":inc": 1,
          ":zero": 0,
        }),
        ReturnValues: "UPDATED_NEW",
      });

      // Execute both commands
      await Promise.all([
        dynamoClient.send(saleCommand),
        dynamoClient.send(updateCommand),
      ]);

      toast.success("Sale added successfully!");
      onSaleAdded(affiliateInfo.id);
      onClose();
    } catch (err) {
      console.error("Error adding sale:", err);
      toast.error("Failed to add sale: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update the commission calculation
  const calculateEstimatedCommission = () => {
    if (!affiliateInfo || !formData.amount) return "0.00";
    // Convert basePrice to number before using toFixed
    return Number(affiliateInfo.basePrice).toFixed(2);
  };

  if (!affiliateInfo) {
    return null; // Don't render modal if no affiliate info
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium">
              Add New Sale
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Amount ($)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Date
              </label>
              <input
                type="date"
                required
                value={formData.saleDate}
                onChange={(e) =>
                  setFormData({ ...formData, saleDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Update the info display section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">
                <p>
                  Base Commission: $
                  {Number(affiliateInfo?.basePrice || 0).toFixed(2)}
                </p>
                <p className="mt-1">
                  Commission Amount: ${calculateEstimatedCommission()}
                </p>
              </div>
            </div>

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
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Sale"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AddSaleModal;
