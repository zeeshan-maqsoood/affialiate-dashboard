import { useState, useEffect } from "react";
import {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Card, Title, Text } from "@tremor/react";
import { Dialog } from "@headlessui/react";
import { Eye, UserPlus, X, Mail, Phone } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const AdminsList = () => {
  const emailToUsername = (email) => {
    if (!email) return "";
    return email.toLowerCase().replace("@", "-at-");
  };

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin",
    username: "",
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      const command = new ScanCommand({
        TableName: "Admins",
      });

      const response = await dynamoClient.send(command);
      const adminsList = response.Items.map((item) => unmarshall(item));
      setAdmins(adminsList);
    } catch (err) {
      console.error("Error fetching admins:", err);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { credentials } = await fetchAuthSession();

      // 1. DynamoDB client
      const dynamoClient = new DynamoDBClient({
        region: "us-east-1",
        credentials,
      });

      // 2. Cognito client
      const cognitoClient = new CognitoIdentityProviderClient({
        region: "us-east-1",
        credentials,
      });

      // Create admin item for DynamoDB with UUID
      const adminId = uuidv4();
      const adminItem = {
        id: adminId,
        ...newAdmin,
        createdAt: new Date().toISOString(),
        status: "active",
        role: "admin", // Store role in DynamoDB only
      };

      // 3. Create user in Cognito
      const userPoolId = "us-east-1_Sln0RkWRn";
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: newAdmin.username,
        DesiredDeliveryMediums: ["EMAIL"], // Send email notification
        UserAttributes: [
          { Name: "email", Value: newAdmin.email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: newAdmin.name },
          // Format phone number properly or omit if empty
          ...(newAdmin.phone
            ? [
                {
                  Name: "phone_number",
                  Value: newAdmin.phone.startsWith("+")
                    ? newAdmin.phone
                    : `+${newAdmin.phone}`,
                },
              ]
            : []),
        ],
        ForceAliasCreation: true,
      });

      // Execute commands in order
      console.log("Creating user in Cognito...");
      const cognitoResponse = await cognitoClient.send(createUserCommand);
      const userId = cognitoResponse.User.Username;
      console.log("User created with ID:", userId);

      // Update the admin item with Cognito ID
      adminItem.cognitoId = userId;

      // 4. Add user to admin group
      console.log("Adding user to admin group...");
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: userId,
          GroupName: "admin",
        })
      );

      // 5. Add to DynamoDB
      console.log("Adding admin to DynamoDB...");
      await dynamoClient.send(
        new PutItemCommand({
          TableName: "Admins",
          Item: marshall(adminItem),
        })
      );

      // 6. Success message
      toast.success(
        "Admin added successfully! Check email for temporary password."
      );
      setShowAddAdmin(false);
      setNewAdmin({ name: "", email: "", phone: "", role: "admin" });
      fetchAdmins();
    } catch (err) {
      console.error("Error adding admin:", err);
      toast.error(`Failed to add admin: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTemporaryPassword = () => {
    const length = 12;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";

    // Ensure we have at least one uppercase, lowercase, number, and special char
    password += "A"; // Uppercase
    password += "a"; // Lowercase
    password += "1"; // Number
    password += "!"; // Special char

    // Fill the rest with random chars
    for (let i = 0; i < length - 4; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title>Administrators</Title>
        <button
          onClick={() => setShowAddAdmin(true)}
          className="flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:opacity-90"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Admin
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          admin.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowDetails(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Admin Modal */}
      <Dialog
        open={showAddAdmin}
        onClose={() => setShowAddAdmin(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium">
                Add New Admin
              </Dialog.Title>
              <button
                onClick={() => setShowAddAdmin(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newAdmin.name}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => {
                    const email = e.target.value.toLowerCase();
                    const username = emailToUsername(email);
                    setNewAdmin({
                      ...newAdmin,
                      email: email,
                      username: username, // Still set username for backend use
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="email@example.com"
                />
                <span className="text-xs text-gray-500">
                  Email will be converted to lowercase
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newAdmin.phone}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Add Admin
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Admin Details Modal */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <Dialog.Title className="text-xl font-bold">
                Admin Details
              </Dialog.Title>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedAdmin && (
              <div className="space-y-4">
                <div>
                  <Text className="text-gray-500">Name</Text>
                  <p className="font-medium">{selectedAdmin.name}</p>
                </div>
                <div>
                  <Text className="text-gray-500">Email</Text>
                  <p className="font-medium">{selectedAdmin.email}</p>
                </div>
                <div>
                  <Text className="text-gray-500">Phone</Text>
                  <p className="font-medium">{selectedAdmin.phone || "N/A"}</p>
                </div>
                <div>
                  <Text className="text-gray-500">Status</Text>
                  <p className="font-medium capitalize">
                    {selectedAdmin.status}
                  </p>
                </div>
                <div>
                  <Text className="text-gray-500">Joined Date</Text>
                  <p className="font-medium">
                    {new Date(selectedAdmin.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminsList;
