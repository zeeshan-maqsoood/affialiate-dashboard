// Create a new file: src/components/Settings.jsx
import { Card, Title, Text } from "@tremor/react";
import { useAuth } from "../contexts/AuthContext";
import ChangePassword from "../pages/ChangePassword";

const Settings = ({ affiliateInfo }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card>
          <Title className="mb-4">Account Information</Title>
          <div className="space-y-4">
            <div>
              <Text className="text-gray-500">Name</Text>
              <p className="font-medium">{affiliateInfo?.name}</p>
            </div>
            <div>
              <Text className="text-gray-500">Email</Text>
              <p className="font-medium">{user?.attributes?.email}</p>
            </div>
            <div>
              <Text className="text-gray-500">Phone Number</Text>
              <p className="font-medium">{affiliateInfo?.phoneNumber}</p>
            </div>
            <div>
              <Text className="text-gray-500">Address</Text>
              <p className="font-medium">{affiliateInfo?.address}</p>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <Title className="mb-4">Security</Title>
          <ChangePassword />
        </Card>
      </div>
    </div>
  );
};

export default Settings;
