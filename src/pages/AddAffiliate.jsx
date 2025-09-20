import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { marshall } from "@aws-sdk/util-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { X } from "react-feather";
import toast from "react-hot-toast";

const AddAffiliate = ({ onClose, onAffiliateCreated }) => {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    address: "",
    phoneNumber: "",
    code: "",
    link: "",
    basePrice: 0,
    baseMonthlyPay: 0, // Added new field for base monthly pay
    facilityType: "both",
      accountHandle: "", 
    isCharity: false,
    isPartner: false,
    isInfluencer: false,
    isInfluencerCreators: false,
    shareLeads: false,
    freeDogTagOffer: false,
    pumpkinInsuranceOnly: false,
    // Donation tracking for Helping Shelters campaign
    totalDonations: 0,
    totalVerifiedQuotes: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { user } = useAuth();

  const handleFacilityChange = (e) => {
    setFormData(prev => ({
      ...prev,
      facilityType: e.target.value,
    }))
  }

  const handleCharityToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      isCharity: e.target.checked,
    }))
  }

  const handlePartnerToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      isPartner: e.target.checked,
    }))
  }

  const handleInfluencerToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      isInfluencer: e.target.checked,
    }))
  }

  const handleInfluencerCreatorsToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      isInfluencerCreators: e.target.checked,
    }))
  }

  const handleShareLeadsToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      shareLeads: e.target.checked,
    }))
  }

  const handleFreeDogTagToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      freeDogTagOffer: e.target.checked,
    }))
  }

  const handlePumpkinInsuranceToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      pumpkinInsuranceOnly: e.target.checked,
    }))
  }


  // Hard-coded values
  const REGION = "us-east-1"; // Replace with your actual region
  const USER_POOL_ID = "us-east-1_Sln0RkWRn"; // Replace with your actual User Pool ID

  // Generate unique affiliate code
  const generateAffiliateCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `AFF-${timestamp}-${random}`.toUpperCase();
  };

  // Create username from email by replacing @ with -at-
  const createUsernameFromEmail = (email) => {
    return email.toLowerCase().replace("@", "-at-");
  };

  // Update the validatePhoneNumber function to be simpler
  const validatePhoneNumber = (phoneNumber) => {
    // Remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    
    // Check if it's exactly 10 digits
    if (digitsOnly.length !== 10) {
      return {
        isValid: false,
        message: "Phone number must be exactly 10 digits (e.g. 4155552671)",
        formatted: phoneNumber,
      };
    }
    
    return {
      isValid: true,
      message: "",
      // Prepend +1 for US country code
      formatted: `+1${digitsOnly}`,
    };
  };

  // Handle email change and auto-generate username
  const handleEmailChange = (e) => {
    const email = e.target.value.toLowerCase(); // Convert to lowercase
    const username = createUsernameFromEmail(email);
    const code = generateAffiliateCode();

    setFormData((prev) => ({
      ...prev,
      email,
      username, // Use email-based username
      code,
      link: `https://arkanainsuranceservices.com/${code}`,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      email: null,
    }));
  };

  // Simplify handlePhoneChange
  const handlePhoneChange = (e) => {
    let phoneNumber = e.target.value.replace(/\D/g, ""); // Remove non-digits

    const validation = validatePhoneNumber(phoneNumber);

    setFormData((prev) => ({
      ...prev,
      phoneNumber: phoneNumber, // Store without + sign
    }));

    setValidationErrors((prev) => ({
      ...prev,
      phoneNumber: validation.isValid ? null : validation.message,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for affiliate code changes - update link as well
    if (name === "code") {
      setFormData((prev) => ({
        ...prev,
        code: value,
        link: `https://arkanainsuranceservices.com/${value}`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
      isValid = false;
    }

    // Phone validation
    const phoneValidation = validatePhoneNumber(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      errors.phoneNumber = phoneValidation.message;
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate form first
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { credentials } = await fetchAuthSession();
      const cognitoClient = new CognitoIdentityProviderClient({
        region: REGION,
        credentials,
      });

      // Format phone number for submission
      const phoneValidation = validatePhoneNumber(formData.phoneNumber);
      const formattedPhone = phoneValidation.formatted;

      // Create Cognito user
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: formData.username, // Use email-based username
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [
          { Name: "email", Value: formData.email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: formData.name },
          { Name: "phone_number", Value: formattedPhone },
          { Name: "address", Value: formData.address },
          { Name: "custom:code", Value: formData.code },
          { Name: "custom:base_price", Value: formData.basePrice.toString() },
          {
            Name: "custom:base_monthly_pay",
            Value: formData.baseMonthlyPay.toString(),
          }, // Added base monthly pay
        ],
      });

      const cognitoResult = await cognitoClient.send(createUserCommand);
      const userId = cognitoResult.User.Username;

      // Add to affiliate group
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
          GroupName: "affiliate",
        })
      );

      // Store in DynamoDB
      const dynamoClient = new DynamoDBClient({
        region: REGION,
        credentials,
      });

      const affiliateItem = {
        id: formData.code,
        cognitoId: userId,
        username: formData.username, // Use email-based username
        name: formData.name,
        email: formData.email,
        address: formData.address,
        phoneNumber: formattedPhone,
        code: formData.code,
        link: formData.link,
        basePrice: formData.basePrice,
            accountHandle: formData.accountHandle, 
        baseMonthlyPay: formData.baseMonthlyPay, // Added base monthly pay field
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.username || "admin",
        salesCount: 0,
        facilityType: formData.facilityType,
        isCharity: formData.isCharity,
        isPartner: formData.isPartner,
        isInfluencer: formData.isInfluencer,
        isInfluencerCreators: formData.isInfluencerCreators,
        shareLeads: formData.shareLeads,
        freeDogTagOffer: formData.freeDogTagOffer,
        pumpkinInsuranceOnly: formData.pumpkinInsuranceOnly,
        // Donation tracking for Helping Shelters campaign
        totalDonations: 0,
        totalVerifiedQuotes: 0,
      };

      await dynamoClient.send(
        new PutItemCommand({
          TableName: "Affiliates",
          Item: marshall(affiliateItem),
        })
      );

      toast.success("Affiliate created successfully");

      // Call the callback to refresh the list
      if (onAffiliateCreated) {
        onAffiliateCreated();
      }

      // Reset form and close modal
      setFormData({
        username: "",
        name: "",
        email: "",
        address: "",
        phoneNumber: "",
        code: "",
        link: "",
        basePrice: 0,
        baseMonthlyPay: 0,
        facilityType: "both",
        isCharity: false,
        isPartner: false,
        isInfluencer: false,
        isInfluencerCreators: false,
        accountHandle: "",
        shareLeads: false,
        freeDogTagOffer: false,
        pumpkinInsuranceOnly: false,
      });

      if (onClose) {
        setTimeout(onClose, 3000);
      }
    } catch (err) {
      console.error("Error creating affiliate:", err);
      setError(err.message || "Failed to create affiliate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-white rounded-lg">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold">Add New Affiliate</h1>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
              <p className="font-bold">Affiliate created successfully!</p>
              <p className="mt-2">Welcome email sent to {formData.email}</p>
            </div>
          )}
        </div>

        {/* Scrollable Form Area */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleEmailChange}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300 ${
                  validationErrors.email ? "border-red-500" : ""
                }`}
                required
                placeholder="email@example.com"
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                value={formData.address}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                rows="2"
                required
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Phone Number
              </label>
               <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300 ${
                  validationErrors.phoneNumber ? "border-red-500" : ""
                }`}
                placeholder="4155552671"
                maxLength="10"
                required
              />
               {validationErrors.phoneNumber ? (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.phoneNumber}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Format: 10 digits (e.g. 4155552671)
                  </p>
                )}
            </div>

            {/* Affiliate Code */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Affiliate Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                placeholder="Auto-generated but editable"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated code can be customized if needed
              </p>
            </div>

            {/* Auto-generated Link */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Affiliate Link
              </label>
              <input
                type="text"
                value={formData.link}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Updates automatically based on affiliate code
              </p>
            </div>

            {/* Base Price Field */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Base Commission/ Quote
              </label>
              <input
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Commission earned per quote
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
                value={formData.baseMonthlyPay}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed monthly payment after first complete month
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
                value={formData.accountHandle}
                onChange={handleInputChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:border-indigo-300"
                placeholder="@affiliatehandle"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Social or business handle for this affiliate (e.g. @affiliatehandle)
              </p>
            </div>

            {/* 1. Facility Type */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Facility Type
              </label>
              <select
                name="facilityType"
                value={formData.facilityType}
                onChange={handleFacilityChange}
                className="shadow border rounded w-full py-2 px-3 focus:outline-none focus:ring focus:border-indigo-300"
              >
                <option value="dog-only">Dog Only</option>
                <option value="cat-only">Cat Only</option>
                <option value="both">Both</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose which animals this affiliate handles.
              </p>
            </div>

            {/* 2. Charity vs Business */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCharity"
                checked={formData.isCharity}
                onChange={handleCharityToggle}
                className="mr-2"
              />
              <label htmlFor="isCharity" className="text-gray-700 text-sm">
                This affiliate is a charity (uncheck for business)
              </label>
            </div>

            {/* Partner Facility */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPartner"
                checked={formData.isPartner}
                onChange={handlePartnerToggle}
                className="mr-2"
              />
              <label htmlFor="isPartner" className="text-gray-700 text-sm">
                Mark as partner facility
              </label>
            </div>

            {/* Influencer Facility - Shelter Campaign */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isInfluencer"
                checked={formData.isInfluencer}
                onChange={handleInfluencerToggle}
                className="mr-2"
              />
              <label htmlFor="isInfluencer" className="text-gray-700 text-sm">
                This affiliate is an influencer (Shelter Campaign)
              </label>
            </div>

            {/* Influencer Facility - Creators Campaign */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isInfluencerCreators"
                checked={formData.isInfluencerCreators}
                onChange={handleInfluencerCreatorsToggle}
                className="mr-2"
              />
              <label htmlFor="isInfluencerCreators" className="text-gray-700 text-sm">
                This affiliate is an influencer (Creators Campaign)
              </label>
            </div>

            {/* 3. Share Customer Leads */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="shareLeads"
                checked={formData.shareLeads}
                onChange={handleShareLeadsToggle}
                className="mr-2"
              />
              <label htmlFor="shareLeads" className="text-gray-700 text-sm">
                Allow sharing of customer lead information
              </label>
            </div>

            {/* 4. Free Dog Tag Offer */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="freeDogTagOffer"
                checked={formData.freeDogTagOffer}
                onChange={handleFreeDogTagToggle}
                className="mr-2"
              />
              <label htmlFor="freeDogTagOffer" className="text-gray-700 text-sm">
                Enable Free Dog Tag Offer
              </label>
            </div>

            {/* 5. Pumpkin Insurance Quotes Only */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pumpkinInsuranceOnly"
                checked={formData.pumpkinInsuranceOnly}
                onChange={handlePumpkinInsuranceToggle}
                className="mr-2"
              />
              <label htmlFor="pumpkinInsuranceOnly" className="text-gray-700 text-sm">
                Pumpkin Insurance quotes only
              </label>
            </div>

          </form>
        </div>

        {/* Fixed Footer with Submit Button */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </span>
            ) : (
              "Create Affiliate"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAffiliate;
