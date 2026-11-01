const Product = artifacts.require('product');

contract('Product registration and purchases', (accounts) => {
  const [owner, manufacturer, seller, outsider, buyer] = accounts;
  const id = (value) => web3.utils.asciiToHex(value).padEnd(66, '0');
  let item;

  async function mustFail(promise, text) {
    try {
      await promise;
      assert.fail('Expected a transaction to fail');
    } catch (error) {
      assert(error.message.includes(text), error.message);
    }
  }

  beforeEach(async () => {
    item = await Product.new({ from: owner });
    await item.registerManufacturer(id('BRAND1'), manufacturer, { from: owner });
  });

  it('restricts manufacturer registration to the contract owner', async () => {
    await mustFail(item.registerManufacturer(id('OTHER'), outsider, { from: outsider }), 'Only project owner');
  });

  it('blocks unapproved wallets from adding products', async () => {
    await mustFail(item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: outsider }), 'Only this manufacturer');
  });

  it('rejects duplicate serial numbers and seller codes', async () => {
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await mustFail(item.addProduct(id('BRAND1'), id('Bag2'), id('SER1'), id('A'), 100, { from: manufacturer }), 'Serial number already exists');
    await item.addSeller(id('BRAND1'), id('Retailer'), id('A'), id('SELL1'), 1234567890, id('Manager'), id('City'), seller, { from: manufacturer });
    await mustFail(item.addSeller(id('BRAND1'), id('Another'), id('A'), id('SELL1'), 1234567890, id('Manager'), id('City'), seller, { from: manufacturer }), 'Seller code already exists');
  });

  it('only permits the assigned seller to complete a purchase', async () => {
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await item.addSeller(id('BRAND1'), id('Retailer'), id('A'), id('SELL1'), 1234567890, id('Manager'), id('City'), seller, { from: manufacturer });
    await mustFail(item.manufacturerSellProduct(id('SER1'), id('MISSING'), { from: manufacturer }), 'Seller is not registered');
    await item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer });
    await mustFail(item.sellerSellProduct(id('SER1'), id('CUST1'), buyer, { from: outsider }), 'Only the assigned seller');
    await item.sellerSellProduct(id('SER1'), id('CUST1'), buyer, { from: seller });
    assert.equal(await item.verifyProduct(id('SER1'), id('CUST1'), { from: buyer }), false);
    await mustFail(item.confirmPurchase(id('SER1'), id('CUST1'), { from: outsider }), 'Connect the buyer wallet');
    await mustFail(item.confirmPurchase(id('SER1'), id('WRONG'), { from: buyer }), 'Buyer code does not match');
    await item.confirmPurchase(id('SER1'), id('CUST1'), { from: buyer });
    assert.equal(await item.verifyProduct(id('SER1'), id('CUST1'), { from: buyer }), true);
    assert.equal(await item.verifyProduct(id('SER1'), id('CUST1'), { from: outsider }), false);
    assert.equal(await item.isRegisteredProduct(id('SER1')), true);
    assert.equal((await item.consumerWallets(id('SER1'))).toLowerCase(), buyer.toLowerCase());
    assert.equal(await item.verifyProduct(id('SER1'), id('CUST2'), { from: buyer }), false);
    assert.equal(await item.verifyProduct(id('UNKNOWN'), id('CUST1'), { from: buyer }), false);
    const history = await item.getWalletPurchaseHistory({ from: buyer });
    assert.equal(history[0].length, 1);
    assert.equal((await item.getWalletPurchaseHistory({ from: outsider }))[0].length, 0);
    await mustFail(item.sellerSellProduct(id('SER1'), id('CUST1'), buyer, { from: seller }), 'already purchased');
  });

  it('does not assign a product twice or accept a seller from another manufacturer', async () => {
    await item.registerManufacturer(id('BRAND2'), outsider, { from: owner });
    await item.addSeller(id('BRAND2'), id('Shop2'), id('B'), id('SELL2'), 123, id('Manager'), id('City'), buyer, { from: outsider });
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await mustFail(item.manufacturerSellProduct(id('SER1'), id('SELL2'), { from: manufacturer }), 'another manufacturer');
    await item.addSeller(id('BRAND1'), id('Shop1'), id('A'), id('SELL1'), 456, id('Manager'), id('City'), seller, { from: manufacturer });
    await item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer });
    await mustFail(item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer }), 'already assigned');
    await mustFail(item.sellerSellProduct(id('UNKNOWN'), id('CODE'), buyer, { from: seller }), 'Unknown product serial');
  });

  it('allows the seller to cancel a pending request, then request again', async () => {
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await item.addSeller(id('BRAND1'), id('Shop1'), id('A'), id('SELL1'), 456, id('Manager'), id('City'), seller, { from: manufacturer });
    await item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer });
    await item.sellerSellProduct(id('SER1'), id('CODE'), buyer, { from: seller });
    await mustFail(item.sellerSellProduct(id('SER1'), id('CODE'), buyer, { from: seller }), 'confirmation is pending');
    await mustFail(item.cancelSaleRequest(id('SER1'), { from: outsider }), 'Only the assigned seller');
    await item.cancelSaleRequest(id('SER1'), { from: seller });
    await mustFail(item.confirmPurchase(id('SER1'), id('CODE'), { from: buyer }), 'No pending purchase');
    await item.sellerSellProduct(id('SER1'), id('CODE'), buyer, { from: seller });
    await item.confirmPurchase(id('SER1'), id('CODE'), { from: buyer });
    assert.equal((await item.getWalletPurchaseHistory({ from: buyer }))[0].length, 1);
  });

  it('rejects sales without a buyer wallet', async () => {
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await item.addSeller(id('BRAND1'), id('Retailer'), id('A'), id('SELL1'), 1234567890, id('Manager'), id('City'), seller, { from: manufacturer });
    await item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer });
    await mustFail(item.sellerSellProduct(id('SER1'), id('CUST1'), '0x0000000000000000000000000000000000000000', { from: seller }), 'Buyer wallet is required');
  });

  it('returns only seller products instead of empty entries' , async () => {
    await item.addProduct(id('BRAND1'), id('Bag'), id('SER1'), id('A'), 100, { from: manufacturer });
    await item.addSeller(id('BRAND1'), id('Retailer'), id('A'), id('SELL1'), 1234567890, id('Manager'), id('City'), seller, { from: manufacturer });
    await item.manufacturerSellProduct(id('SER1'), id('SELL1'), { from: manufacturer });
    const list = await item.queryProductsList(id('SELL1'));
    assert.equal(list[0].length, 1);
    assert.equal(web3.utils.hexToAscii(list[1][0]).replace(/\0/g, ''), 'SER1');
  });
});
