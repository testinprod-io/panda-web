export const ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [{ internalType: "address", name: "target", type: "address" }],
    name: "AddressEmptyCode",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "implementation", type: "address" },
    ],
    name: "ERC1967InvalidImplementation",
    type: "error",
  },
  { inputs: [], name: "ERC1967NonPayable", type: "error" },
  { inputs: [], name: "FailedCall", type: "error" },
  { inputs: [], name: "InvalidInitialization", type: "error" },
  { inputs: [], name: "NotInitializing", type: "error" },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  { inputs: [], name: "UUPSUnauthorizedCallContext", type: "error" },
  {
    inputs: [{ internalType: "bytes32", name: "slot", type: "bytes32" }],
    name: "UUPSUnsupportedProxiableUUID",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "AppAuthImplementationSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "appId",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "proxyAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "deployer",
        type: "address",
      },
    ],
    name: "AppDeployedViaFactory",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "appId",
        type: "address",
      },
    ],
    name: "AppRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "gatewayAppId",
        type: "string",
      },
    ],
    name: "GatewayAppIdSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "mrAggregated",
        type: "bytes32",
      },
    ],
    name: "KmsAggregatedMrAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "mrAggregated",
        type: "bytes32",
      },
    ],
    name: "KmsAggregatedMrRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "deviceId",
        type: "bytes32",
      },
    ],
    name: "KmsDeviceAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "deviceId",
        type: "bytes32",
      },
    ],
    name: "KmsDeviceRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes",
        name: "k256Pubkey",
        type: "bytes",
      },
    ],
    name: "KmsInfoSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "osImageHash",
        type: "bytes32",
      },
    ],
    name: "OsImageHashAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "osImageHash",
        type: "bytes32",
      },
    ],
    name: "OsImageHashRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "Upgraded",
    type: "event",
  },
  {
    inputs: [],
    name: "UPGRADE_INTERFACE_VERSION",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "mrAggregated", type: "bytes32" },
    ],
    name: "addKmsAggregatedMr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "deviceId", type: "bytes32" }],
    name: "addKmsDevice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "osImageHash", type: "bytes32" }],
    name: "addOsImageHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "allowedOsImages",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "appAuthImplementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "apps",
    outputs: [
      { internalType: "bool", name: "isRegistered", type: "bool" },
      { internalType: "address", name: "controller", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "initialOwner", type: "address" },
      { internalType: "bool", name: "disableUpgrades", type: "bool" },
      { internalType: "bool", name: "allowAnyDevice", type: "bool" },
      { internalType: "bytes32", name: "initialDeviceId", type: "bytes32" },
      { internalType: "bytes32", name: "initialComposeHash", type: "bytes32" },
    ],
    name: "deployAndRegisterApp",
    outputs: [
      { internalType: "address", name: "appId", type: "address" },
      { internalType: "address", name: "proxyAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "gatewayAppId",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "initialOwner", type: "address" },
      {
        internalType: "address",
        name: "_appAuthImplementation",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "appId", type: "address" },
          { internalType: "bytes32", name: "composeHash", type: "bytes32" },
          { internalType: "address", name: "instanceId", type: "address" },
          { internalType: "bytes32", name: "deviceId", type: "bytes32" },
          { internalType: "bytes32", name: "mrAggregated", type: "bytes32" },
          { internalType: "bytes32", name: "mrSystem", type: "bytes32" },
          { internalType: "bytes32", name: "osImageHash", type: "bytes32" },
          { internalType: "string", name: "tcbStatus", type: "string" },
          { internalType: "string[]", name: "advisoryIds", type: "string[]" },
        ],
        internalType: "struct IAppAuth.AppBootInfo",
        name: "bootInfo",
        type: "tuple",
      },
    ],
    name: "isAppAllowed",
    outputs: [
      { internalType: "bool", name: "isAllowed", type: "bool" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "appId", type: "address" },
          { internalType: "bytes32", name: "composeHash", type: "bytes32" },
          { internalType: "address", name: "instanceId", type: "address" },
          { internalType: "bytes32", name: "deviceId", type: "bytes32" },
          { internalType: "bytes32", name: "mrAggregated", type: "bytes32" },
          { internalType: "bytes32", name: "mrSystem", type: "bytes32" },
          { internalType: "bytes32", name: "osImageHash", type: "bytes32" },
          { internalType: "string", name: "tcbStatus", type: "string" },
          { internalType: "string[]", name: "advisoryIds", type: "string[]" },
        ],
        internalType: "struct IAppAuth.AppBootInfo",
        name: "bootInfo",
        type: "tuple",
      },
    ],
    name: "isKmsAllowed",
    outputs: [
      { internalType: "bool", name: "isAllowed", type: "bool" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "kmsAllowedAggregatedMrs",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "kmsAllowedDeviceIds",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "kmsInfo",
    outputs: [
      { internalType: "bytes", name: "k256Pubkey", type: "bytes" },
      { internalType: "bytes", name: "caPubkey", type: "bytes" },
      { internalType: "bytes", name: "quote", type: "bytes" },
      { internalType: "bytes", name: "eventlog", type: "bytes" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextAppId",
    outputs: [{ internalType: "address", name: "appId", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nextAppSequence",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "controller", type: "address" }],
    name: "registerApp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "mrAggregated", type: "bytes32" },
    ],
    name: "removeKmsAggregatedMr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "deviceId", type: "bytes32" }],
    name: "removeKmsDevice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "osImageHash", type: "bytes32" }],
    name: "removeOsImageHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_implementation", type: "address" },
    ],
    name: "setAppAuthImplementation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "appId", type: "string" }],
    name: "setGatewayAppId",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "eventlog", type: "bytes" }],
    name: "setKmsEventlog",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "bytes", name: "k256Pubkey", type: "bytes" },
          { internalType: "bytes", name: "caPubkey", type: "bytes" },
          { internalType: "bytes", name: "quote", type: "bytes" },
          { internalType: "bytes", name: "eventlog", type: "bytes" },
        ],
        internalType: "struct KmsAuth.KmsInfo",
        name: "info",
        type: "tuple",
      },
    ],
    name: "setKmsInfo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "quote", type: "bytes" }],
    name: "setKmsQuote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

export const ADDRESS =
  process.env.NEXT_PUBLIC_KMS_CONTRACT_ADDRESS ||
  "0x3366E906D7C2362cE4C336f43933Cccf76509B23";
