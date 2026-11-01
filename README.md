# Product Verification Using Blockchain

This project is used to register products on a blockchain and check their details using a QR code. It also tracks products from manufacturers to sellers and buyers.

## Tools Used

- Solidity and Truffle
- Ganache and MetaMask
- Web3.js
- HTML, CSS, JavaScript and Bootstrap

## Features

- Register manufacturers and sellers
- Add products and view product details
- Transfer products from manufacturers to sellers
- Request a sale and confirm it using the buyer's wallet
- Check product details using a serial number or QR code
- View purchase history

## How to Run

1. Install Node.js 18, Truffle 5 and Ganache.
2. Start Ganache on port `7545`.
3. Open the project folder in a terminal and run:

   ```bash
   npm install
   npm run contract:build
   npm run dev
   ```

4. Open the local website address shown in the terminal.
5. Connect MetaMask to Ganache using a test account.
6. Register a manufacturer, add a seller and product, then test the sale and verification pages.

To run the contract tests, keep Ganache running and use `npm test`.

