// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

contract product {
    address public owner;
    uint256 private sellerCount;
    uint256 private productCount;

    mapping(bytes32 => address) public manufacturerWallets;
    mapping(bytes32 => address) public sellerWallets;
    mapping(bytes32 => bytes32) public sellerManufacturers;
    mapping(bytes32 => bool) private registeredSerials;
    mapping(bytes32 => bool) private registeredSellers;
    mapping(bytes32 => uint256) private sellerIndexes;

    struct seller {
        uint256 sellerId;
        bytes32 sellerName;
        bytes32 sellerBrand;
        bytes32 sellerCode;
        uint256 sellerNum;
        bytes32 sellerManager;
        bytes32 sellerAddress;
    }
    mapping(uint256 => seller) public sellers;

    struct productItem {
        uint256 productId;
        bytes32 productSN;
        bytes32 productName;
        bytes32 productBrand;
        uint256 productPrice;
        bytes32 productStatus;
    }
    mapping(uint256 => productItem) public productItems;
    mapping(bytes32 => uint256) public productMap;
    mapping(bytes32 => bytes32) public productsManufactured;
    mapping(bytes32 => bytes32) public productsForSale;
    mapping(bytes32 => bytes32) public productsSold;
    mapping(bytes32 => address) public consumerWallets;
    mapping(bytes32 => address) public pendingBuyers;
    mapping(bytes32 => bytes32) public pendingCodes;
    mapping(address => bytes32[]) private purchasesByWallet;
    mapping(bytes32 => bytes32[]) private productsWithSeller;
    mapping(bytes32 => bytes32[]) private sellersWithManufacturer;

    event ManufacturerAdded(bytes32 indexed manufacturerId, address indexed wallet);
    event SellerAdded(bytes32 indexed sellerCode, bytes32 indexed manufacturerId, address wallet);
    event ProductAdded(bytes32 indexed serial, bytes32 indexed manufacturerId);
    event ProductAssigned(bytes32 indexed serial, bytes32 indexed sellerCode);
    event SaleRequested(bytes32 indexed serial, address indexed buyer);
    event SaleCancelled(bytes32 indexed serial);
    event ProductPurchased(bytes32 indexed serial, bytes32 indexed sellerCode, bytes32 consumerCode, address buyer);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only project owner can register manufacturers");
        _;
    }

    // The contract owner approves the wallet used by each manufacturer.
    function registerManufacturer(bytes32 manufacturerId, address wallet) external onlyOwner {
        require(manufacturerId != bytes32(0), "Manufacturer ID is required");
        require(wallet != address(0), "Manufacturer wallet is required");
        require(manufacturerWallets[manufacturerId] == address(0), "Manufacturer already exists");
        manufacturerWallets[manufacturerId] = wallet;
        emit ManufacturerAdded(manufacturerId, wallet);
    }

    function addSeller(
        bytes32 manufacturerId, bytes32 name, bytes32 brand, bytes32 code,
        uint256 phone, bytes32 manager, bytes32 location, address wallet
    ) external {
        require(manufacturerWallets[manufacturerId] == msg.sender, "Only this manufacturer can add sellers");
        require(code != bytes32(0), "Seller code is required");
        require(wallet != address(0), "Seller wallet is required");
        require(!registeredSellers[code], "Seller code already exists");
        registeredSellers[code] = true;
        sellerIndexes[code] = sellerCount;
        sellerWallets[code] = wallet;
        sellerManufacturers[code] = manufacturerId;
        sellers[sellerCount] = seller(sellerCount, name, brand, code, phone, manager, location);
        sellersWithManufacturer[manufacturerId].push(code);
        sellerCount++;
        emit SellerAdded(code, manufacturerId, wallet);
    }

    function addProduct(
        bytes32 manufacturerId, bytes32 name, bytes32 serial, bytes32 brand, uint256 price
    ) external {
        require(manufacturerWallets[manufacturerId] == msg.sender, "Only this manufacturer can register products");
        require(serial != bytes32(0), "Product serial is required");
        require(!registeredSerials[serial], "Serial number already exists");
        require(price > 0, "Product price must be greater than zero");
        registeredSerials[serial] = true;
        productItems[productCount] = productItem(productCount, serial, name, brand, price, "Available");
        productMap[serial] = productCount;
        productsManufactured[serial] = manufacturerId;
        productCount++;
        emit ProductAdded(serial, manufacturerId);
    }

    function manufacturerSellProduct(bytes32 serial, bytes32 sellerCode) external {
        require(registeredSerials[serial], "Product does not exist");
        require(registeredSellers[sellerCode], "Seller is not registered");
        bytes32 manufacturerId = productsManufactured[serial];
        require(manufacturerWallets[manufacturerId] == msg.sender, "Only the product manufacturer can assign it");
        require(sellerManufacturers[sellerCode] == manufacturerId, "Seller belongs to another manufacturer");
        require(productsForSale[serial] == bytes32(0), "Product is already assigned");
        require(productsSold[serial] == bytes32(0), "Product was already sold");
        productsForSale[serial] = sellerCode;
        productsWithSeller[sellerCode].push(serial);
        productItems[productMap[serial]].productStatus = "With seller";
        emit ProductAssigned(serial, sellerCode);
    }

    // The seller requests a transfer. The buyer completes it using their wallet.
    function sellerSellProduct(bytes32 serial, bytes32 consumerCode, address buyer) external {
        require(registeredSerials[serial], "Unknown product serial");
        require(consumerCode != bytes32(0), "Enter a buyer code");
        require(buyer != address(0), "Enter the buyer wallet");
        bytes32 sellerCode = productsForSale[serial];
        require(sellerCode != bytes32(0), "Assign a seller before sale");
        require(msg.sender == sellerWallets[sellerCode], "Only the assigned seller can request a sale");
        require(productsSold[serial] == bytes32(0), "Product already purchased");
        require(pendingBuyers[serial] == address(0), "Purchase confirmation is pending");
        pendingBuyers[serial] = buyer;
        pendingCodes[serial] = consumerCode;
        productItems[productMap[serial]].productStatus = "Pending";
        emit SaleRequested(serial, buyer);
    }

    function confirmPurchase(bytes32 serial, bytes32 consumerCode) external {
        require(registeredSerials[serial], "Unknown product serial");
        require(pendingBuyers[serial] != address(0), "No pending purchase");
        require(msg.sender == pendingBuyers[serial], "Connect the buyer wallet");
        require(pendingCodes[serial] == consumerCode, "Buyer code does not match");
        require(productsSold[serial] == bytes32(0), "Product already purchased");
        bytes32 sellerCode = productsForSale[serial];
        productsSold[serial] = consumerCode;
        consumerWallets[serial] = msg.sender;
        purchasesByWallet[msg.sender].push(serial);
        delete pendingBuyers[serial];
        delete pendingCodes[serial];
        productItems[productMap[serial]].productStatus = "Sold";
        emit ProductPurchased(serial, sellerCode, consumerCode, msg.sender);
    }

    // Seller can cancel an unconfirmed request and correct the buyer address.
    function cancelSaleRequest(bytes32 serial) external {
        bytes32 sellerCode = productsForSale[serial];
        require(registeredSerials[serial], "Unknown product serial");
        require(msg.sender == sellerWallets[sellerCode], "Only the assigned seller can cancel");
        require(pendingBuyers[serial] != address(0), "No pending purchase");
        delete pendingBuyers[serial];
        delete pendingCodes[serial];
        productItems[productMap[serial]].productStatus = "With seller";
        emit SaleCancelled(serial);
    }

    function verifyProduct(bytes32 serial, bytes32 consumerCode) external view returns (bool) {
        return registeredSerials[serial]
            && consumerCode != bytes32(0)
            && productsSold[serial] == consumerCode
            && consumerWallets[serial] == msg.sender;
    }

    // A public check only confirms the serial exists in the registered records.
    function isRegisteredProduct(bytes32 serial) external view returns (bool) {
        return registeredSerials[serial];
    }

    function productDetails(bytes32 serial) external view returns (
        bool exists, bytes32 manufacturerId, bytes32 sellerCode,
        bytes32 buyerCode, bytes32 status
    ) {
        if (!registeredSerials[serial]) {
            return (false, bytes32(0), bytes32(0), bytes32(0), bytes32(0));
        }
        return (true, productsManufactured[serial], productsForSale[serial],
            productsSold[serial], productItems[productMap[serial]].productStatus);
    }

    function viewSellers() external view returns (
        uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory,
        uint256[] memory, bytes32[] memory, bytes32[] memory
    ) {
        uint256[] memory ids = new uint256[](sellerCount);
        bytes32[] memory names = new bytes32[](sellerCount);
        bytes32[] memory brands = new bytes32[](sellerCount);
        bytes32[] memory codes = new bytes32[](sellerCount);
        uint256[] memory phones = new uint256[](sellerCount);
        bytes32[] memory managers = new bytes32[](sellerCount);
        bytes32[] memory addresses = new bytes32[](sellerCount);
        for (uint256 i = 0; i < sellerCount; i++) {
            seller storage item = sellers[i];
            ids[i] = item.sellerId;
            names[i] = item.sellerName;
            brands[i] = item.sellerBrand;
            codes[i] = item.sellerCode;
            phones[i] = item.sellerNum;
            managers[i] = item.sellerManager;
            addresses[i] = item.sellerAddress;
        }
        return (ids, names, brands, codes, phones, managers, addresses);
    }

    function viewProductItems() external view returns (
        uint256[] memory, bytes32[] memory, bytes32[] memory,
        bytes32[] memory, uint256[] memory, bytes32[] memory
    ) {
        uint256[] memory ids = new uint256[](productCount);
        bytes32[] memory serials = new bytes32[](productCount);
        bytes32[] memory names = new bytes32[](productCount);
        bytes32[] memory brands = new bytes32[](productCount);
        uint256[] memory prices = new uint256[](productCount);
        bytes32[] memory statuses = new bytes32[](productCount);
        for (uint256 i = 0; i < productCount; i++) {
            productItem storage item = productItems[i];
            ids[i] = item.productId;
            serials[i] = item.productSN;
            names[i] = item.productName;
            brands[i] = item.productBrand;
            prices[i] = item.productPrice;
            statuses[i] = item.productStatus;
        }
        return (ids, serials, names, brands, prices, statuses);
    }

    // Return only products assigned to this seller, without blank array entries.
    function queryProductsList(bytes32 sellerCode) external view returns (
        uint256[] memory, bytes32[] memory, bytes32[] memory,
        bytes32[] memory, uint256[] memory, bytes32[] memory
    ) {
        bytes32[] storage serials = productsWithSeller[sellerCode];
        uint256 length = serials.length;
        uint256[] memory ids = new uint256[](length);
        bytes32[] memory productSerials = new bytes32[](length);
        bytes32[] memory names = new bytes32[](length);
        bytes32[] memory brands = new bytes32[](length);
        uint256[] memory prices = new uint256[](length);
        bytes32[] memory statuses = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            productItem storage item = productItems[productMap[serials[i]]];
            ids[i] = item.productId;
            productSerials[i] = item.productSN;
            names[i] = item.productName;
            brands[i] = item.productBrand;
            prices[i] = item.productPrice;
            statuses[i] = item.productStatus;
        }
        return (ids, productSerials, names, brands, prices, statuses);
    }

    function querySellersList(bytes32 manufacturerId) external view returns (
        uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory,
        uint256[] memory, bytes32[] memory, bytes32[] memory
    ) {
        bytes32[] storage codes = sellersWithManufacturer[manufacturerId];
        uint256 length = codes.length;
        uint256[] memory ids = new uint256[](length);
        bytes32[] memory names = new bytes32[](length);
        bytes32[] memory brands = new bytes32[](length);
        bytes32[] memory sellerCodes = new bytes32[](length);
        uint256[] memory phones = new uint256[](length);
        bytes32[] memory managers = new bytes32[](length);
        bytes32[] memory addresses = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            seller storage item = sellers[sellerIndexes[codes[i]]];
            ids[i] = item.sellerId;
            names[i] = item.sellerName;
            brands[i] = item.sellerBrand;
            sellerCodes[i] = item.sellerCode;
            phones[i] = item.sellerNum;
            managers[i] = item.sellerManager;
            addresses[i] = item.sellerAddress;
        }
        return (ids, names, brands, sellerCodes, phones, managers, addresses);
    }

    function getWalletPurchaseHistory() external view returns (
        bytes32[] memory, bytes32[] memory, bytes32[] memory
    ) {
        bytes32[] storage serials = purchasesByWallet[msg.sender];
        bytes32[] memory productSerials = new bytes32[](serials.length);
        bytes32[] memory sellerCodes = new bytes32[](serials.length);
        bytes32[] memory manufacturerCodes = new bytes32[](serials.length);
        for (uint256 i = 0; i < serials.length; i++) {
            productSerials[i] = serials[i];
            sellerCodes[i] = productsForSale[serials[i]];
            manufacturerCodes[i] = productsManufactured[serials[i]];
        }
        return (productSerials, sellerCodes, manufacturerCodes);
    }
}
