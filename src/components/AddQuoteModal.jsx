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

const AddQuoteModal = ({ isOpen, onClose, affiliateInfo, onQuoteAdded }) => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    petOwnerFirstName: "",
    petOwnerLastName: "",
    petName: "",
    address: "",
    petBreed: "",
    petAge: "",
    petType: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: "",
        phone: "",
        petOwnerFirstName: "",
        petOwnerLastName: "",
        petName: "",
        address: "",
        petBreed: "",
        petAge: "",
        petType: "",
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

      const quoteItem = {
        id: uuidv4(),
        affiliateId: affiliateInfo.id,
        email: formData.email,
        phone: formData.phone,
        petOwnerFirstName: formData.petOwnerFirstName,
        petOwnerLastName: formData.petOwnerLastName,
        petName: formData.petName,
        address: formData.address,
        petBreed: formData.petBreed,
        petAge: Number(formData.petAge),
        petType: formData.petType,
        status: "pending", // Affiliate submitted quotes always start as pending
        commission: commission,
        basePrice: Number(affiliateInfo.basePrice),
        createdAt: new Date().toISOString(),
        notes: formData.notes || "",
        timestamp: new Date().toISOString(),
      };

      // Add quote to Quotes table
      const quoteCommand = new PutItemCommand({
        TableName: "Quotes",
        Item: marshall(quoteItem),
      });

      // Update affiliate's quotes count
      const updateCommand = new UpdateItemCommand({
        TableName: "Affiliates",
        Key: marshall({
          id: affiliateInfo.id,
        }),
        UpdateExpression:
          "SET quotesCount = if_not_exists(quotesCount, :zero) + :inc",
        ExpressionAttributeValues: marshall({
          ":inc": 1,
          ":zero": 0,
        }),
        ReturnValues: "UPDATED_NEW",
      });

      // Execute both commands
      await Promise.all([
        dynamoClient.send(quoteCommand),
        dynamoClient.send(updateCommand),
      ]);

      toast.success("Quote submitted successfully!");
      onQuoteAdded(affiliateInfo.id);
      onClose();
    } catch (err) {
      console.error("Error adding quote:", err);
      toast.error("Failed to add quote: " + err.message);
    } finally {
      setLoading(false);
    }
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
              Submit New Quote
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Type
                </label>
                <input
                  type="text"
                  required
                  value={formData.petType}
                  onChange={(e) =>
                    setFormData({ ...formData, petType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Dog, Cat, Bird, etc."
                />
              </div>
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">
                <p>
                  Base Commission: $
                  {Number(affiliateInfo?.basePrice || 0).toFixed(2)}
                </p>
                <p className="mt-1">
                  Commission will apply when the quote is approved.
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
                {loading ? "Submitting..." : "Submit Quote"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AddQuoteModal;
