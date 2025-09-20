// Updated config format for AWS Amplify v6
const awsConfig = {
  Auth: {
    Cognito: {
      region: "us-east-1", // Change to your region
      identityPoolId: "us-east-1:08a0bed9-0f5e-4a84-b2d5-a6408287a9a4",
      userPoolId: "us-east-1_Sln0RkWRn",
      userPoolClientId: "6bu9bskgs1opgihem4gqvprnjm",
    },
  },
  API: {
    REST: {
      affiliateApi: {
        endpoint: "https://API_GATEWAY_URL",
      },
    },
  },
};

export default awsConfig;
