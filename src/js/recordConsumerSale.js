$(function () {
    ChainConnection.submit(function () {
        var serial = ChainConnection.encode(ChainConnection.field('productSN'));
        var buyerCode = ChainConnection.encode(ChainConnection.field('consumerCode'));
        var buyerWallet = ChainConnection.field('buyerWallet');
        if (!/^0x[a-fA-F0-9]{40}$/.test(buyerWallet)) {
            throw new Error('Enter a valid Ethereum wallet address for the buyer.');
        }
        return ChainConnection.run('sellerSellProduct', [serial, buyerCode, buyerWallet], true)
            .then(function () {
                ChainConnection.resetFields(['productSN', 'consumerCode', 'buyerWallet']);
                ChainConnection.showSuccess('Request submitted. The buyer must confirm the purchase using their wallet.');
            });
    });
});
